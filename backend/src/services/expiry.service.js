import { prisma } from "../config/prisma.js";
import { emitEvent } from "../socket.js";

const ACTIVE_STATUSES = ["CREATED", "ACTIVE", "REQUESTED", "RESERVED", "PICKED_UP"];

export async function expireDonations() {
  const now = new Date();
  const expired = await prisma.donation.findMany({
    where: {
      expiryTime: { lt: now },
      status: { in: ACTIVE_STATUSES }
    }
  });

  if (!expired.length) return [];

  await prisma.donation.updateMany({
    where: { id: { in: expired.map((d) => d.id) } },
    data: { status: "EXPIRED" }
  });

  emitEvent("donation:expired", { ids: expired.map((d) => d.id) });
  return expired;
}

export function startExpiryJob(intervalMs = 60_000) {
  const run = async () => {
    try {
      await expireDonations();
    } catch (err) {
      console.error("Expiry job error:", err.message);
    }
  };
  run();
  return setInterval(run, intervalMs);
}
