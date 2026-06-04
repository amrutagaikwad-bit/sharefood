import { prisma } from "../config/prisma.js";

export function clientMeta(req) {
  return {
    ip: req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket?.remoteAddress || null,
    userAgent: req.headers["user-agent"]?.slice(0, 512) || null
  };
}

export async function recordLoginAttempt({ email, userId, success, req }) {
  const { ip, userAgent } = clientMeta(req);
  await prisma.loginHistory.create({
    data: { email: String(email).toLowerCase(), userId: userId || null, success, ip, userAgent }
  });

  if (success && userId) {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    return;
  }

  await recordSecurityEvent({
    type: "FAILED_LOGIN",
    email,
    userId,
    message: `Failed login for ${email}`,
    metadata: { ip }
  });
}

export async function recordSecurityEvent({ type, email, userId, message, metadata }) {
  return prisma.securityEvent.create({
    data: {
      type,
      email: email ? String(email).toLowerCase() : null,
      userId: userId || null,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });
}
