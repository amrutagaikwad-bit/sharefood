import { prisma } from "../config/prisma.js";

export async function createNotification({ userId, type, title, message, meta }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      meta: meta ? JSON.stringify(meta) : null
    }
  });
}

export async function notifyAdmins({ type, title, message, meta }) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isBlocked: false } });
  await Promise.all(
    admins.map((admin) =>
      createNotification({ userId: admin.id, type, title, message, meta })
    )
  );
}
