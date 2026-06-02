import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
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
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
    });
  } catch {
    return res.status(500).json({ message: "Failed to register" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
    });
  } catch {
    return res.status(500).json({ message: "Failed to login" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone
    }
  });
});

export default router;

