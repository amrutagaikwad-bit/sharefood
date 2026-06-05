import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { sendOtpEmail } from "./email.service.js";
import { createNotification } from "./notification.service.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const sendLimits = new Map();

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function checkRateLimit(email) {
  const key = normalizeEmail(email);
  const entry = sendLimits.get(key);
  if (!entry) return null;
  const elapsed = Date.now() - entry.lastSent;
  if (elapsed < RESEND_COOLDOWN_MS) {
    return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
  }
  if (entry.count >= 5 && Date.now() - entry.windowStart < 60 * 60 * 1000) {
    return "hourly_limit";
  }
  return null;
}

function recordSend(email) {
  const key = normalizeEmail(email);
  const entry = sendLimits.get(key) || { count: 0, windowStart: Date.now(), lastSent: 0 };
  if (Date.now() - entry.windowStart > 60 * 60 * 1000) {
    entry.count = 0;
    entry.windowStart = Date.now();
  }
  entry.count += 1;
  entry.lastSent = Date.now();
  sendLimits.set(key, entry);
}

export async function sendOtp({ email, purpose }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw Object.assign(new Error("Valid email is required"), { status: 400 });
  }
  if (!["login", "register", "reset"].includes(purpose)) {
    throw Object.assign(new Error("Invalid purpose"), { status: 400 });
  }

  const wait = checkRateLimit(normalized);
  if (wait === "hourly_limit") {
    throw Object.assign(new Error("Too many OTP requests. Try again in an hour."), { status: 429 });
  }
  if (typeof wait === "number") {
    throw Object.assign(new Error(`Wait ${wait}s before requesting another code`), { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (purpose === "login" && !user) {
    throw Object.assign(new Error("No account with this email. Register first."), { status: 404 });
  }
  if (purpose === "register" && user) {
    throw Object.assign(new Error("Email already registered. Login instead."), { status: 409 });
  }
  if (purpose === "reset" && !user) {
    throw Object.assign(new Error("No account with this email."), { status: 404 });
  }

  await prisma.otpCode.deleteMany({ where: { email: normalized, purpose } });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.otpCode.create({
    data: { email: normalized, code, purpose, expiresAt }
  });

  const mail = await sendOtpEmail(normalized, code, purpose);
  recordSend(normalized);

  if (user) {
    await createNotification({
      userId: user.id,
      type: "OTP_SENT",
      title: "Verification code sent",
      message: "A verification code was sent to your email.",
      meta: { purpose }
    });
  }

  return {
    message: mail.devMode
      ? "OTP generated (dev mode — check backend console)"
      : "Verification code sent to your email",
    expiresInSeconds: OTP_TTL_MS / 1000,
    resendAfterSeconds: RESEND_COOLDOWN_MS / 1000,
    devMode: mail.devMode,
    ...(mail.devMode ? { devCode: code } : {})
  };
}

export async function verifyOtp({ email, code, purpose, registerProfile }) {
  const normalized = normalizeEmail(email);
  const cleanCode = String(code || "").trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    throw Object.assign(new Error("OTP must be a 6-digit code"), { status: 400 });
  }

  const record = await prisma.otpCode.findFirst({
    where: { email: normalized, purpose },
    orderBy: { createdAt: "desc" }
  });

  if (!record) {
    throw Object.assign(new Error("No OTP found. Request a new code."), { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    await prisma.otpCode.delete({ where: { id: record.id } });
    throw Object.assign(new Error("OTP expired. Request a new code."), { status: 400 });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw Object.assign(new Error("Too many attempts. Request a new code."), { status: 429 });
  }

  if (record.code !== cleanCode) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } }
    });
    const remaining = MAX_ATTEMPTS - record.attempts - 1;
    throw Object.assign(
      new Error(`Invalid verification code. ${remaining} attempt(s) remaining.`),
      { status: 401 }
    );
  }

  await prisma.otpCode.delete({ where: { id: record.id } });

  if (purpose === "register") {
    const { name, role, phone, password } = registerProfile || {};
    if (!name || !role) {
      throw Object.assign(new Error("Name and role are required to register"), { status: 400 });
    }
    if (!["DONOR", "RECEIVER"].includes(role)) {
      throw Object.assign(new Error("Invalid role"), { status: 400 });
    }
    if (password && password.length < 6) {
      throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
    }
    const passHash = await bcrypt.hash(password || crypto.randomBytes(16).toString("hex"), 10);
    const user = await prisma.user.create({
      data: { name, email: normalized, password: passHash, role, phone: phone || null }
    });
    return user;
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  if (user.isBlocked) throw Object.assign(new Error("Account suspended"), { status: 403 });
  if (user.isBanned) throw Object.assign(new Error("Account banned"), { status: 403 });
  return user;
}
