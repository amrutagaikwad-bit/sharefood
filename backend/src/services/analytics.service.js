import { prisma } from "../config/prisma.js";
import { formatBooking, toBookingLabel } from "./booking.service.js";

function bucketByDay(records, dateField = "createdAt") {
  const byDay = {};
  records.forEach((r) => {
    const day = new Date(r[dateField]).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });
  return Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function sinceDays(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getAdminAnalytics() {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = sinceDays(7);
  const monthStart = sinceDays(30);

  const [users, donations, bookings, todayUsers, weekUsers, monthUsers, todayDonations, weekDonations, monthDonations, todayBookings, weekBookings, monthBookings] =
    await Promise.all([
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.donation.count({ where: { status: { not: "DELETED" } } }),
      prisma.request.count(),
      prisma.user.count({ where: { createdAt: { gte: dayStart }, role: { not: "ADMIN" } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart }, role: { not: "ADMIN" } } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart }, role: { not: "ADMIN" } } }),
      prisma.donation.count({ where: { createdAt: { gte: dayStart }, status: { not: "DELETED" } } }),
      prisma.donation.count({ where: { createdAt: { gte: weekStart }, status: { not: "DELETED" } } }),
      prisma.donation.count({ where: { createdAt: { gte: monthStart }, status: { not: "DELETED" } } }),
      prisma.request.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.request.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.request.count({ where: { createdAt: { gte: monthStart } } })
    ]);

  const recentDonations = await prisma.donation.findMany({
    where: { createdAt: { gte: monthStart } },
    select: { createdAt: true, status: true }
  });
  const recentBookings = await prisma.request.findMany({
    where: { createdAt: { gte: monthStart } },
    select: { createdAt: true, status: true }
  });

  const donors = await prisma.user.count({ where: { role: "DONOR" } });
  const completedDonations = await prisma.donation.count({ where: { status: "COMPLETED" } });
  const activeDonations = await prisma.donation.count({
    where: { status: { in: ["ACTIVE", "REQUESTED", "RESERVED"] }, isPaused: false }
  });
  const completedBookings = await prisma.request.count({ where: { status: "COMPLETED" } });
  const pendingBookings = await prisma.request.count({ where: { status: "PENDING" } });

  return {
    overview: {
      totalUsers: users,
      totalDonors: donors,
      totalBookings: bookings,
      totalDonations: donations,
      completedDonations,
      activeDonations,
      completedBookings,
      pendingBookings
    },
    periods: {
      daily: { newUsers: todayUsers, newDonations: todayDonations, newBookings: todayBookings },
      weekly: { newUsers: weekUsers, newDonations: weekDonations, newBookings: weekBookings },
      monthly: { newUsers: monthUsers, newDonations: monthDonations, newBookings: monthBookings }
    },
    trends: {
      donationTrends: bucketByDay(recentDonations),
      bookingTrends: bucketByDay(recentBookings)
    }
  };
}

export async function listAdminBookings({ status, q } = {}) {
  let rows = await prisma.request.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      receiver: { select: { id: true, name: true, email: true, phone: true } },
      donation: {
        select: {
          id: true,
          foodName: true,
          quantity: true,
          servingsRemaining: true,
          donor: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });

  if (status) {
    const label = String(status).toLowerCase();
    rows = rows.filter((r) => toBookingLabel(r.status).toLowerCase() === label);
  }
  if (q) {
    const term = String(q).toLowerCase();
    rows = rows.filter(
      (r) =>
        r.receiver?.name?.toLowerCase().includes(term) ||
        r.donation?.foodName?.toLowerCase().includes(term) ||
        r.donation?.donor?.name?.toLowerCase().includes(term)
    );
  }
  return rows.map(formatBooking);
}
