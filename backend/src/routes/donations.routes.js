import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired, authOptional, roleRequired } from "../middleware/auth.js";
import { enrichWithDistance } from "../utils/geo.js";
import { logActivity } from "../services/activity.service.js";
import { createNotification, notifyAdmins } from "../services/notification.service.js";
import { emitEvent } from "../socket.js";
import { expireDonations } from "../services/expiry.service.js";

const router = express.Router();
const PUBLIC_STATUSES = ["ACTIVE", "REQUESTED", "RESERVED", "PICKED_UP"];

function buildDonationData(body, donorId, userPhone) {
  const serves = Number(body.servesCount) || 1;
  return {
    donorId,
    foodName: body.foodName,
    category: body.category || "Other",
    quantity: body.quantity,
    servesCount: serves,
    servingsRemaining: body.servingsRemaining != null ? Number(body.servingsRemaining) : serves,
    description: body.description,
    image: body.image,
    latitude: Number(body.latitude),
    longitude: Number(body.longitude),
    address: body.address,
    city: body.city,
    state: body.state,
    postalCode: body.postalCode,
    specialInstructions: body.specialInstructions,
    contactPhone: body.contactPhone || userPhone,
    preparationAt: body.preparationAt ? new Date(body.preparationAt) : null,
    expiryTime: new Date(body.expiryTime),
    pickupStart: body.pickupStart ? new Date(body.pickupStart) : null,
    pickupEnd: body.pickupEnd ? new Date(body.pickupEnd) : null,
    status: "ACTIVE",
    isPaused: false
  };
}

const donorInclude = {
  donor: { select: { id: true, name: true, phone: true, email: true } },
  requests: { include: { receiver: { select: { id: true, name: true, phone: true, email: true } } } }
};

router.post("/", authRequired, roleRequired("DONOR"), async (req, res) => {
  try {
    const { foodName, quantity, latitude, longitude, address, expiryTime } = req.body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!foodName?.trim() || !quantity?.trim() || !address?.trim() || !expiryTime) {
      return res.status(400).json({ message: "Missing required fields: food name, quantity, address, expiry" });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Valid latitude and longitude are required (use GPS or address search)" });
    }
    const expiry = new Date(expiryTime);
    if (Number.isNaN(expiry.getTime())) {
      return res.status(400).json({ message: "Invalid expiry date/time" });
    }

    const donation = await prisma.donation.create({
      data: buildDonationData({ ...req.body, latitude: lat, longitude: lng, expiryTime: expiry }, req.user.id, req.user.phone),
      include: { donor: { select: { id: true, name: true, phone: true, email: true } } }
    });

    await logActivity({
      userId: req.user.id,
      action: "DONATION_CREATED",
      entityType: "Donation",
      entityId: donation.id,
      newValue: { foodName: donation.foodName, servingsRemaining: donation.servingsRemaining }
    });

    await notifyAdmins({
      type: "NEW_DONATION",
      title: "New donation posted",
      message: `${donation.foodName} (${donation.servingsRemaining} servings) by ${req.user.name}`,
      meta: { donationId: donation.id }
    });

    const { sendDonationConfirmationEmail } = await import("../services/email.service.js");
    if (req.user.email) {
      sendDonationConfirmationEmail(req.user.email, {
        foodName: donation.foodName,
        address: donation.address,
        expiryTime: donation.expiryTime
      }).catch(() => {});
    }

    emitEvent("donation:created", donation);
    return res.status(201).json(donation);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create donation" });
  }
});

router.get("/mine", authRequired, roleRequired("DONOR"), async (req, res) => {
  const donations = await prisma.donation.findMany({
    where: { donorId: req.user.id, status: { not: "DELETED" } },
    include: donorInclude,
    orderBy: { createdAt: "desc" }
  });
  res.json(donations);
});

router.get("/", authOptional, async (req, res) => {
  await expireDonations();

  const {
    q = "",
    category = "",
    lat,
    lng,
    maxDistance = 25,
    minServings = 0,
    sort = "distance",
    donorName = ""
  } = req.query;
  const maxKm = Number(maxDistance);

  let donations = await prisma.donation.findMany({
    where: {
      status: { in: PUBLIC_STATUSES },
      expiryTime: { gt: new Date() },
      isFlagged: false,
      isHidden: false,
      isPaused: false,
      servingsRemaining: { gte: Math.max(0, Number(minServings) || 0) }
    },
    include: {
      donor: { select: { id: true, name: true, phone: true, email: true } },
      ...(req.user
        ? { requests: { where: { receiverId: req.user.id }, select: { id: true, status: true, servingsReserved: true } } }
        : {})
    },
    orderBy: sort === "recent" ? { createdAt: "desc" } : sort === "expiry" ? { expiryTime: "asc" } : { createdAt: "desc" }
  });

  const term = String(q).toLowerCase();
  if (term) {
    donations = donations.filter(
      (d) =>
        d.foodName.toLowerCase().includes(term) ||
        d.address.toLowerCase().includes(term) ||
        (d.city || "").toLowerCase().includes(term) ||
        (d.state || "").toLowerCase().includes(term) ||
        (d.postalCode || "").includes(term) ||
        d.donor?.name?.toLowerCase().includes(term) ||
        d.category.toLowerCase().includes(term)
    );
  }
  if (category) donations = donations.filter((d) => d.category === category);
  if (donorName) {
    const dn = String(donorName).toLowerCase();
    donations = donations.filter((d) => d.donor?.name?.toLowerCase().includes(dn));
  }

  if (lat && lng) {
    donations = enrichWithDistance(donations, lat, lng).filter((d) => d.distanceKm <= maxKm);
    if (sort === "distance") donations.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  res.json(donations);
});

router.get("/:id", authOptional, async (req, res) => {
  const donation = await prisma.donation.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      donor: { select: { id: true, name: true, phone: true, email: true } },
      requests: { include: { receiver: { select: { id: true, name: true, phone: true, email: true } } } }
    }
  });
  if (!donation || donation.status === "DELETED") return res.status(404).json({ message: "Not found" });
  res.json(donation);
});

router.put("/:id", authRequired, roleRequired("DONOR"), async (req, res) => {
  const donation = await prisma.donation.findUnique({ where: { id: Number(req.params.id) } });
  if (!donation || donation.donorId !== req.user.id) {
    return res.status(404).json({ message: "Donation not found" });
  }

  const serves = Number(req.body.servesCount) || donation.servesCount;
  const remaining = Number(req.body.servingsRemaining ?? donation.servingsRemaining);

  const updated = await prisma.donation.update({
    where: { id: donation.id },
    data: {
      foodName: req.body.foodName ?? donation.foodName,
      category: req.body.category ?? donation.category,
      quantity: req.body.quantity ?? donation.quantity,
      servesCount: serves,
      servingsRemaining: Math.min(remaining, serves),
      description: req.body.description ?? donation.description,
      image: req.body.image ?? donation.image,
      latitude: req.body.latitude != null ? Number(req.body.latitude) : donation.latitude,
      longitude: req.body.longitude != null ? Number(req.body.longitude) : donation.longitude,
      address: req.body.address ?? donation.address,
      city: req.body.city ?? donation.city,
      state: req.body.state ?? donation.state,
      postalCode: req.body.postalCode ?? donation.postalCode,
      specialInstructions: req.body.specialInstructions ?? donation.specialInstructions,
      contactPhone: req.body.contactPhone ?? donation.contactPhone,
      preparationAt: req.body.preparationAt ? new Date(req.body.preparationAt) : donation.preparationAt,
      expiryTime: req.body.expiryTime ? new Date(req.body.expiryTime) : donation.expiryTime,
      pickupStart: req.body.pickupStart ? new Date(req.body.pickupStart) : donation.pickupStart,
      pickupEnd: req.body.pickupEnd ? new Date(req.body.pickupEnd) : donation.pickupEnd
    },
    include: { donor: { select: { id: true, name: true, phone: true, email: true } } }
  });

  await logActivity({
    userId: req.user.id,
    action: "DONATION_EDIT",
    entityType: "Donation",
    entityId: donation.id,
    previousValue: donation,
    newValue: updated
  });

  emitEvent("donation:updated", updated);
  res.json(updated);
});

router.patch("/:id/pause", authRequired, roleRequired("DONOR"), async (req, res) => {
  const donation = await prisma.donation.findFirst({ where: { id: Number(req.params.id), donorId: req.user.id } });
  if (!donation) return res.status(404).json({ message: "Not found" });
  const updated = await prisma.donation.update({ where: { id: donation.id }, data: { isPaused: true } });
  await logActivity({ userId: req.user.id, action: "DONATION_PAUSED", entityType: "Donation", entityId: donation.id, previousValue: { isPaused: false }, newValue: { isPaused: true } });
  emitEvent("donation:updated", updated);
  res.json(updated);
});

router.patch("/:id/resume", authRequired, roleRequired("DONOR"), async (req, res) => {
  const donation = await prisma.donation.findFirst({ where: { id: Number(req.params.id), donorId: req.user.id } });
  if (!donation) return res.status(404).json({ message: "Not found" });
  const updated = await prisma.donation.update({ where: { id: donation.id }, data: { isPaused: false, status: "ACTIVE" } });
  await logActivity({ userId: req.user.id, action: "DONATION_RESUMED", entityType: "Donation", entityId: donation.id, previousValue: { isPaused: true }, newValue: { isPaused: false } });
  emitEvent("donation:updated", updated);
  res.json(updated);
});

router.patch("/:id/complete", authRequired, roleRequired("DONOR"), async (req, res) => {
  const donation = await prisma.donation.findFirst({ where: { id: Number(req.params.id), donorId: req.user.id } });
  if (!donation) return res.status(404).json({ message: "Not found" });
  const updated = await prisma.donation.update({ where: { id: donation.id }, data: { status: "COMPLETED", servingsRemaining: 0 } });
  await logActivity({ userId: req.user.id, action: "DONATION_COMPLETED", entityType: "Donation", entityId: donation.id, previousValue: { status: donation.status }, newValue: { status: "COMPLETED" } });
  emitEvent("donation:updated", updated);
  res.json(updated);
});

router.delete("/:id", authRequired, roleRequired("DONOR"), async (req, res) => {
  const donation = await prisma.donation.findFirst({ where: { id: Number(req.params.id), donorId: req.user.id } });
  if (!donation) return res.status(404).json({ message: "Not found" });
  await prisma.donation.update({ where: { id: donation.id }, data: { status: "DELETED" } });
  await logActivity({ userId: req.user.id, action: "DONATION_DELETED", entityType: "Donation", entityId: donation.id });
  emitEvent("donation:deleted", { id: donation.id });
  res.json({ message: "Deleted" });
});

router.post("/:id/report", authRequired, async (req, res) => {
  const donationId = Number(req.params.id);
  const report = await prisma.report.create({
    data: { reporterId: req.user.id, donationId, reason: req.body.reason || "Flagged" }
  });
  await prisma.donation.update({ where: { id: donationId }, data: { isFlagged: true } });
  await notifyAdmins({ type: "DONATION_FLAGGED", title: "Suspicious donation", message: `Donation #${donationId} flagged`, meta: { donationId } });
  res.status(201).json(report);
});

export default router;
