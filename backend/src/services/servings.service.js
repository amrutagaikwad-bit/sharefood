import { prisma } from "../config/prisma.js";
import { emitEvent } from "../socket.js";

export async function adjustServings(donationId, delta, reason) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new Error("Donation not found");

  const previous = donation.servingsRemaining;
  const next = Math.max(0, previous + delta);

  const updated = await prisma.donation.update({
    where: { id: donationId },
    data: { servingsRemaining: next },
    include: { donor: { select: { id: true, name: true, phone: true, email: true } } }
  });

  emitEvent("donation:servings", {
    donationId,
    servingsRemaining: next,
    servesCount: updated.servesCount,
    reason
  });
  emitEvent("donation:updated", updated);
  return { previous, next, donation: updated };
}

export function canReserve(donation, amount) {
  if (donation.isPaused || donation.isHidden) return false;
  if (!["ACTIVE", "REQUESTED", "RESERVED"].includes(donation.status)) return false;
  if (donation.servingsRemaining < amount) return false;
  if (new Date(donation.expiryTime) < new Date()) return false;
  return true;
}
