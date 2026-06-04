import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import { logActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import { emitEvent } from "../socket.js";
import { adjustServings, canReserve } from "../services/servings.service.js";

const router = express.Router();

async function getDonationFull(id) {
  return prisma.donation.findUnique({
    where: { id },
    include: { donor: true }
  });
}

router.post("/", authRequired, roleRequired("RECEIVER"), async (req, res) => {
  const { donationId, pickupSlot, message, servingsReserved = 1 } = req.body;
  const amount = Math.max(1, Number(servingsReserved));

  const donation = await getDonationFull(Number(donationId));
  if (!donation || !canReserve(donation, amount)) {
    return res.status(400).json({ message: "Not enough servings available or donation unavailable" });
  }

  const existing = await prisma.request.findFirst({
    where: {
      donationId: Number(donationId),
      receiverId: req.user.id,
      status: { in: ["PENDING", "ACCEPTED", "RESERVED"] }
    }
  });
  if (existing) return res.status(409).json({ message: "Active request already exists" });

  const { donation: donationAfterHold } = await adjustServings(donation.id, -amount, "reservation_hold");

  const request = await prisma.request.create({
    data: {
      donationId: Number(donationId),
      receiverId: req.user.id,
      servingsReserved: amount,
      pickupSlot: pickupSlot ? new Date(pickupSlot) : null,
      message,
      status: "PENDING"
    },
    include: {
      donation: { include: { donor: { select: { name: true, phone: true, email: true } } } },
      receiver: { select: { id: true, name: true, phone: true, email: true } }
    }
  });

  await prisma.donation.update({
    where: { id: donation.id },
    data: { status: donationAfterHold.servingsRemaining <= 0 ? "RESERVED" : "REQUESTED" }
  });

  await logActivity({
    userId: req.user.id,
    action: "FOOD_RESERVATION",
    entityType: "Request",
    entityId: request.id,
    newValue: { servingsReserved: amount, donationId: donation.id }
  });

  await createNotification({
    userId: donation.donorId,
    type: "RESERVATION_REQUEST",
    title: "Reservation request",
    message: `${req.user.name} reserved ${amount} servings of "${donation.foodName}"`,
    meta: { requestId: request.id }
  });

  const refreshedDonation = await getDonationFull(donation.id);
  emitEvent("request:created", request);
  emitEvent("donation:updated", refreshedDonation);
  res.status(201).json(request);
});

router.get("/mine", authRequired, async (req, res) => {
  if (req.user.role === "RECEIVER") {
    return res.json(
      await prisma.request.findMany({
        where: { receiverId: req.user.id },
        include: { donation: { include: { donor: { select: { name: true, phone: true, email: true } } } } },
        orderBy: { createdAt: "desc" }
      })
    );
  }
  return res.json(
    await prisma.request.findMany({
      where: { donation: { donorId: req.user.id } },
      include: { receiver: { select: { name: true, email: true, phone: true } }, donation: true },
      orderBy: { createdAt: "desc" }
    })
  );
});

async function releaseServings(request) {
  if (["PENDING", "ACCEPTED", "RESERVED"].includes(request.status)) {
    await adjustServings(request.donationId, request.servingsReserved, "reservation_release");
  }
}

router.patch("/:id/accept", authRequired, roleRequired("DONOR"), async (req, res) => {
  const request = await prisma.request.findUnique({
    where: { id: Number(req.params.id) },
    include: { donation: true, receiver: true }
  });
  if (!request || request.donation.donorId !== req.user.id) return res.status(404).json({ message: "Not found" });

  const updated = await prisma.request.update({ where: { id: request.id }, data: { status: "ACCEPTED" } });

  await createNotification({
    userId: request.receiverId,
    type: "RESERVATION_APPROVED",
    title: "Reservation approved",
    message: `Your reservation for "${request.donation.foodName}" was approved.`,
    meta: { requestId: request.id }
  });

  await logActivity({ userId: req.user.id, action: "REQUEST_APPROVED", entityType: "Request", entityId: request.id });
  emitEvent("request:updated", updated);
  emitEvent("donation:updated", await getDonationFull(request.donationId));
  res.json(updated);
});

router.patch("/:id/reject", authRequired, roleRequired("DONOR"), async (req, res) => {
  const request = await prisma.request.findUnique({
    where: { id: Number(req.params.id) },
    include: { donation: true }
  });
  if (!request || request.donation.donorId !== req.user.id) return res.status(404).json({ message: "Not found" });

  await releaseServings(request);
  const updated = await prisma.request.update({ where: { id: request.id }, data: { status: "REJECTED" } });

  await createNotification({
    userId: request.receiverId,
    type: "RESERVATION_REJECTED",
    title: "Reservation rejected",
    message: `Your reservation for "${request.donation.foodName}" was rejected.`,
    meta: { requestId: request.id }
  });

  await logActivity({ userId: req.user.id, action: "REQUEST_REJECTED", entityType: "Request", entityId: request.id });
  emitEvent("request:updated", updated);
  emitEvent("donation:updated", await getDonationFull(request.donationId));
  res.json(updated);
});

router.patch("/:id/reserve", authRequired, roleRequired("DONOR"), async (req, res) => {
  const request = await prisma.request.findUnique({
    where: { id: Number(req.params.id) },
    include: { donation: true }
  });
  if (!request || request.donation.donorId !== req.user.id) return res.status(404).json({ message: "Not found" });

  const updated = await prisma.request.update({
    where: { id: request.id },
    data: {
      status: "RESERVED",
      pickupSlot: req.body.pickupSlot ? new Date(req.body.pickupSlot) : request.pickupSlot
    }
  });

  await prisma.donation.update({ where: { id: request.donationId }, data: { status: "RESERVED" } });

  await createNotification({
    userId: request.receiverId,
    type: "PICKUP_RESERVED",
    title: "Pickup reserved",
    message: `Pickup slot confirmed for "${request.donation.foodName}".`,
    meta: { requestId: request.id }
  });

  emitEvent("request:updated", updated);
  emitEvent("donation:updated", await getDonationFull(request.donationId));
  res.json(updated);
});

router.patch("/:id/cancel", authRequired, async (req, res) => {
  const request = await prisma.request.findUnique({
    where: { id: Number(req.params.id) },
    include: { donation: true }
  });
  if (!request) return res.status(404).json({ message: "Not found" });
  const allowed = request.receiverId === req.user.id || request.donation.donorId === req.user.id;
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  await releaseServings(request);
  const updated = await prisma.request.update({ where: { id: request.id }, data: { status: "CANCELLED" } });

  await logActivity({ userId: req.user.id, action: "RESERVATION_CANCELLED", entityType: "Request", entityId: request.id });

  if (request.receiverId === req.user.id) {
    await createNotification({
      userId: request.donation.donorId,
      type: "RESERVATION_CANCELLED",
      title: "Reservation cancelled",
      message: `A reservation for "${request.donation.foodName}" was cancelled.`,
      meta: { requestId: request.id }
    });
  }

  emitEvent("request:updated", updated);
  emitEvent("donation:updated", await getDonationFull(request.donationId));
  res.json(updated);
});

router.patch("/:id/complete", authRequired, async (req, res) => {
  const request = await prisma.request.findUnique({
    where: { id: Number(req.params.id) },
    include: { donation: true }
  });
  if (!request) return res.status(404).json({ message: "Not found" });
  const allowed = request.receiverId === req.user.id || request.donation.donorId === req.user.id;
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  const updated = await prisma.request.update({ where: { id: request.id }, data: { status: "COMPLETED" } });
  const donation = await prisma.donation.update({
    where: { id: request.donationId },
    data: { status: "COMPLETED" }
  });

  await logActivity({ userId: req.user.id, action: "DONATION_COMPLETED", entityType: "Request", entityId: request.id });
  emitEvent("request:updated", updated);
  emitEvent("donation:updated", donation);
  res.json(updated);
});

export default router;
