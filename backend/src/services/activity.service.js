import { prisma } from "../config/prisma.js";
import { emitEvent } from "../socket.js";

export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  metadata,
  previousValue,
  newValue
}) {
  const log = await prisma.activityLog.create({
    data: {
      userId: userId || null,
      action,
      entityType: entityType || null,
      entityId: entityId || null,
      previousValue: previousValue ? JSON.stringify(previousValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      metadata: metadata ? JSON.stringify(metadata) : null
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });

  emitEvent("activity:new", log);
  return log;
}

export async function logAdminAction({ adminId, action, targetType, targetId, details, previousValue, newValue }) {
  await prisma.adminLog.create({
    data: { adminId, action, targetType, targetId, details: details || null }
  });
  return logActivity({
    userId: adminId,
    action: `ADMIN_${action}`,
    entityType: targetType,
    entityId: targetId,
    previousValue,
    newValue,
    metadata: { details }
  });
}

export async function logSystemError(message, stack, metadata) {
  const log = await prisma.systemLog.create({
    data: {
      level: "ERROR",
      message,
      stack: stack || null,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });
  emitEvent("system:error", log);
  return log;
}
