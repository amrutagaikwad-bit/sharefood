import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  if (req.user.role === "DONOR") {
    const [total, active, completed, recent] = await Promise.all([
      prisma.donation.count({ where: { donorId: req.user.id, status: { not: "DELETED" } } }),
      prisma.donation.count({ where: { donorId: req.user.id, status: "ACTIVE" } }),
      prisma.donation.count({ where: { donorId: req.user.id, status: "COMPLETED" } }),
      prisma.donation.findMany({
        where: { donorId: req.user.id, status: { not: "DELETED" } },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);
    return res.json({ role: "DONOR", total, active, completed, recent });
  }

  const [requestedPickups, pickupHistory, nearbyDonations] = await Promise.all([
    prisma.request.count({ where: { receiverId: req.user.id, status: { in: ["PENDING", "ACCEPTED"] } } }),
    prisma.request.count({ where: { receiverId: req.user.id, status: "COMPLETED" } }),
    prisma.donation.count({ where: { status: "ACTIVE", expiryTime: { gt: new Date() } } })
  ]);
  return res.json({
    role: "RECEIVER",
    requestedPickups,
    pickupHistory,
    nearbyDonations
  });
});

export default router;

