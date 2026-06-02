import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import { estimateWalk, haversineDistanceKm } from "../utils/geo.js";

const router = express.Router();

router.post("/", authRequired, roleRequired("DONOR"), async (req, res) => {
  try {
    const {
      foodName,
      category = "Other",
      quantity,
      description,
      image,
      latitude,
      longitude,
      address,
      pickupInstructions,
      expiryTime
    } = req.body;

    if (!foodName || !quantity || !latitude || !longitude || !address || !expiryTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const donation = await prisma.donation.create({
      data: {
        donorId: req.user.id,
        foodName,
        category,
        quantity,
        description,
        image,
        latitude: Number(latitude),
        longitude: Number(longitude),
        address,
        pickupInstructions,
        expiryTime: new Date(expiryTime)
      }
    });
    return res.status(201).json(donation);
  } catch {
    return res.status(500).json({ message: "Failed to create donation" });
  }
});

router.get("/mine", authRequired, roleRequired("DONOR"), async (req, res) => {
  const donations = await prisma.donation.findMany({
    where: { donorId: req.user.id, status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" }
  });
  return res.json(donations);
});

router.get("/", authRequired, async (req, res) => {
  const { q = "", category = "", lat, lng, maxDistance = 10 } = req.query;
  const donations = await prisma.donation.findMany({
    where: {
      status: "ACTIVE",
      foodName: { contains: String(q), mode: "insensitive" },
      category: category ? String(category) : undefined,
      expiryTime: { gt: new Date() }
    },
    include: {
      donor: { select: { id: true, name: true, phone: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  let enriched = donations;
  if (lat && lng) {
    enriched = donations
      .map((d) => {
        const distanceKm = haversineDistanceKm(
          Number(lat),
          Number(lng),
          d.latitude,
          d.longitude
        );
        return { ...d, distanceKm, ...estimateWalk(distanceKm) };
      })
      .filter((d) => d.distanceKm <= Number(maxDistance))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return res.json(enriched);
});

router.get("/:id", authRequired, async (req, res) => {
  const donation = await prisma.donation.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      donor: { select: { id: true, name: true, phone: true, email: true } },
      requests: { include: { receiver: { select: { id: true, name: true, email: true, phone: true } } } }
    }
  });
  if (!donation || donation.status === "DELETED") return res.status(404).json({ message: "Not found" });
  return res.json(donation);
});

router.patch("/:id/complete", authRequired, roleRequired("DONOR"), async (req, res) => {
  const donation = await prisma.donation.findUnique({ where: { id: Number(req.params.id) } });
  if (!donation || donation.donorId !== req.user.id) {
    return res.status(404).json({ message: "Donation not found" });
  }
  const updated = await prisma.donation.update({
    where: { id: donation.id },
    data: { status: "COMPLETED" }
  });
  return res.json(updated);
});

router.delete("/:id", authRequired, roleRequired("DONOR"), async (req, res) => {
  const donation = await prisma.donation.findUnique({ where: { id: Number(req.params.id) } });
  if (!donation || donation.donorId !== req.user.id) {
    return res.status(404).json({ message: "Donation not found" });
  }
  await prisma.donation.update({ where: { id: donation.id }, data: { status: "DELETED" } });
  return res.json({ message: "Donation deleted" });
});

export default router;

