import { prisma } from "../config/prisma.js";

export async function recordLogin({ userId, email, success, ip, userAgent }) {
  await prisma.loginHistory.create({
    data: {
      userId: userId || null,
      email: String(email).toLowerCase(),
      success: Boolean(success),
      ip: ip || null,
      userAgent: userAgent?.slice(0, 500) || null
    }
  });
  if (success && userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }
}

export async function recordFailedLogin(email, message, metadata) {
  await prisma.securityLog.create({
    data: {
      type: "FAILED_LOGIN",
      email: String(email).toLowerCase(),
      message,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });
}
