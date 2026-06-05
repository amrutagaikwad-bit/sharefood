import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { getJwtSecret } from "../config/env.js";
import { authRequired } from "../middleware/auth.js";
import { logActivity } from "../services/activity.service.js";
import { createNotification, notifyAdmins } from "../services/notification.service.js";
import { sendOtp, verifyOtp } from "../services/otp.service.js";
import { sendWelcomeEmail } from "../services/email.service.js";
import { recordLogin, recordFailedLogin } from "../services/loginHistory.service.js";

function clientMeta(req) {
  return {
    ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress,
    userAgent: req.headers["user-agent"]
  };
}

const router = express.Router();

async function handleSendOtp(req, res) {
  try {
    const { email, purpose = "login" } = req.body;
    if (!["login", "register", "reset"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid purpose. Use login, register, or reset." });
    }
    const result = await sendOtp({ email, purpose });
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Failed to send OTP" });
  }
}

async function handleVerifyOtp(req, res) {
  try {
    const { email, code, purpose = "login", name, role, phone, password } = req.body;
    const user = await verifyOtp({
      email,
      code,
      purpose,
      registerProfile: purpose === "register" ? { name, role, phone, password } : undefined
    });

    if (purpose === "register") {
      await logActivity({ userId: user.id, action: "USER_REGISTERED_OTP", entityType: "User", entityId: user.id });
      await notifyAdmins({
        type: "NEW_USER",
        title: "New user registered",
        message: `${user.name} joined as ${user.role}`,
        meta: { userId: user.id }
      });
      await sendWelcomeEmail(user.email, user.name);
    } else {
      await recordLogin({
        userId: user.id,
        email: user.email,
        success: true,
        ...clientMeta(req)
      });
      await logActivity({ userId: user.id, action: "USER_LOGIN_OTP", entityType: "User", entityId: user.id });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: "7d" });
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "OTP verification failed" });
  }
}

router.post("/register", async (req, res) => {
  try {
    const { name, password, role, phone } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!["DONOR", "RECEIVER"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, phone }
    });

    await logActivity({ userId: user.id, action: "USER_REGISTERED", entityType: "User", entityId: user.id });
    await notifyAdmins({
      type: "NEW_USER",
      title: "New user registered",
      message: `${user.name} joined as ${user.role}`,
      meta: { userId: user.id }
    });
    await sendWelcomeEmail(user.email, user.name);

    const token = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: "7d" });
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Failed to register" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const { password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const meta = clientMeta(req);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await recordFailedLogin(email, "Unknown email");
      await recordLogin({ email, success: false, ...meta });
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.isBlocked) return res.status(403).json({ message: "Account suspended" });
    if (user.isBanned) return res.status(403).json({ message: "Account banned" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await recordFailedLogin(email, "Invalid password", { userId: user.id });
      await recordLogin({ userId: user.id, email, success: false, ...meta });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await recordLogin({ userId: user.id, email, success: true, ...meta });
    await logActivity({ userId: user.id, action: "USER_LOGIN", entityType: "User", entityId: user.id });

    const token = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: "7d" });
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Failed to login" });
  }
});

router.post("/send-otp", handleSendOtp);
router.post("/otp/send", handleSendOtp);

router.post("/verify-otp", handleVerifyOtp);
router.post("/otp/verify", handleVerifyOtp);

router.post("/logout", authRequired, async (req, res) => {
  await logActivity({ userId: req.user.id, action: "USER_LOGOUT", entityType: "User", entityId: req.user.id });
  res.json({ message: "Logged out" });
});

router.get("/me", authRequired, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isBlocked: user.isBlocked
  };
}

export default router;
