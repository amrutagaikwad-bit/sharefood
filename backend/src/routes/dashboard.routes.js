import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";
import { enrichWithDistance } from "../utils/geo.js";

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const { lat, lng } = req.query;

  if (req.user.role === "DONOR") {
    const [total, active, completed, expired, recent, pendingRequests] = await Promise.all([
      prisma.donation.count({ where: { donorId: req.user.id, status: { not: "DELETED" } } }),
      prisma.donation.count({
        where: { donorId: req.user.id, status: { in: ["ACTIVE", "REQUESTED", "RESERVED", "PICKED_UP"] } }
      }),
      prisma.donation.count({ where: { donorId: req.user.id, status: "COMPLETED" } }),
      prisma.donation.count({ where: { donorId: req.user.id, status: "EXPIRED" } }),
      prisma.donation.findMany({
        where: { donorId: req.user.id, status: { not: "DELETED" } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { requests: { include: { receiver: { select: { name: true, phone: true } } } } }
      }),
      prisma.request.count({
        where: { donation: { donorId: req.user.id }, status: "PENDING" }
      })
    ]);
    return res.json({
      role: "DONOR",
      total,
      active,
      completed,
      expired,
      pendingRequests,
      recent
    });
  }

  if (req.user.role === "RECEIVER") {
    let nearby = await prisma.donation.findMany({
      where: {
        status: { in: ["ACTIVE", "REQUESTED", "RESERVED"] },
        expiryTime: { gt: new Date() },
        isFlagged: false
      },
      include: { donor: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    if (lat && lng) {
      nearby = enrichWithDistance(nearby, lat, lng).slice(0, 12);
    } else {
      nearby = nearby.slice(0, 12);
    }

    const [requestedPickups, pickupHistory, savedCount] = await Promise.all([
      prisma.request.count({
        where: { receiverId: req.user.id, status: { in: ["PENDING", "ACCEPTED", "RESERVED"] } }
      }),
      prisma.request.count({ where: { receiverId: req.user.id, status: "COMPLETED" } }),
      prisma.savedDonation.count({ where: { userId: req.user.id } })
    ]);

    return res.json({
      role: "RECEIVER",
      requestedPickups,
      pickupHistory,
      savedCount,
      nearbyDonations: nearby
    });
  }

  res.json({ role: req.user.role });
});

export default router;
