import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";
import { enrichWithDistance } from "../utils/geo.js";
import { getDonorBookingStats } from "../services/booking.service.js";

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const { lat, lng } = req.query;

  if (req.user.role === "DONOR") {
<<<<<<< HEAD
    const [total, active, completed, expired, recent, pendingRequests, bookingStats] = await Promise.all([
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
      }),
      getDonorBookingStats(req.user.id)
    ]);
=======
    const donorDonationFilter = { donation: { donorId: req.user.id } };
    const [total, active, completed, expired, recent, pendingRequests, totalBookings, confirmedBookings, completedBookings, peopleServedAgg] =
      await Promise.all([
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
        prisma.request.count({ where: { ...donorDonationFilter, status: "PENDING" } }),
        prisma.request.count({ where: donorDonationFilter }),
        prisma.request.count({ where: { ...donorDonationFilter, status: { in: ["CONFIRMED", "ACCEPTED", "RESERVED"] } } }),
        prisma.request.count({ where: { ...donorDonationFilter, status: "COMPLETED" } }),
        prisma.request.aggregate({
          where: { ...donorDonationFilter, status: "COMPLETED" },
          _sum: { peopleToServe: true }
        })
      ]);

    const remainingServings = await prisma.donation.aggregate({
      where: { donorId: req.user.id, status: { in: ["ACTIVE", "REQUESTED", "RESERVED"] } },
      _sum: { servingsRemaining: true }
    });

>>>>>>> ffc4eea (kkr)
    return res.json({
      role: "DONOR",
      total,
      active,
      completed,
      expired,
      pendingRequests,
      recent,
<<<<<<< HEAD
      bookings: bookingStats
=======
      bookingStats: {
        totalBookings,
        pendingBookings: pendingRequests,
        confirmedBookings,
        completedBookings,
        peopleServed: peopleServedAgg._sum.peopleToServe || 0,
        remainingServings: remainingServings._sum.servingsRemaining || 0
      }
>>>>>>> ffc4eea (kkr)
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

    const [requestedPickups, pickupHistory, savedCount, myBookings] = await Promise.all([
      prisma.request.count({
        where: { receiverId: req.user.id, status: { in: ["PENDING", "CONFIRMED", "ACCEPTED", "RESERVED"] } }
      }),
      prisma.request.count({ where: { receiverId: req.user.id, status: "COMPLETED" } }),
      prisma.savedDonation.count({ where: { userId: req.user.id } }),
      prisma.request.count({ where: { receiverId: req.user.id } })
    ]);

    return res.json({
      role: "RECEIVER",
      requestedPickups,
      pickupHistory,
      savedCount,
      totalBookings: myBookings,
      nearbyDonations: nearby
    });
  }

  res.json({ role: req.user.role });
});

export default router;
