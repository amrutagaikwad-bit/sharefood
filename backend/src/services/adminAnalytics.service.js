import { prisma } from "../config/prisma.js";

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function bucketByPeriod(items, dateField, days) {
  const daily = {};
  const weekly = {};
  const monthly = {};
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  items.forEach((item) => {
    const dt = item[dateField];
    if (!dt || new Date(dt).getTime() < cutoff) return;
    const day = new Date(dt).toISOString().slice(0, 10);
    const weekStart = new Date(dt);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const week = weekStart.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    daily[day] = (daily[day] || 0) + 1;
    weekly[week] = (weekly[week] || 0) + 1;
    monthly[month] = (monthly[month] || 0) + 1;
  });
  const toSeries = (obj) =>
    Object.entries(obj)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  return { daily: toSeries(daily), weekly: toSeries(weekly), monthly: toSeries(monthly) };
}

export async function getOverviewStats() {
  const today = startOfDay();
  const [
    totalUsers,
    activeUsers,
    newUsersToday,
    totalDonors,
    totalDonations,
    activeDonations,
    completedDonations,
    pendingDonations,
    totalBookings,
    pendingBookings,
    completedBookings,
    foodDistributedAgg,
    blockedUsers,
    bannedUsers
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),
    prisma.user.count({ where: { isBlocked: false, isBanned: false, role: { not: "ADMIN" } } }),
    prisma.user.count({ where: { createdAt: { gte: today }, role: { not: "ADMIN" } } }),
    prisma.user.count({ where: { role: "DONOR" } }),
    prisma.donation.count({ where: { status: { not: "DELETED" } } }),
    prisma.donation.count({
      where: { status: { in: ["ACTIVE", "REQUESTED", "RESERVED", "PICKED_UP"] }, isPaused: false }
    }),
    prisma.donation.count({ where: { status: "COMPLETED" } }),
    prisma.donation.count({
      where: { OR: [{ status: "CREATED" }, { isFlagged: true }] }
    }),
    prisma.request.count(),
    prisma.request.count({ where: { status: "PENDING" } }),
    prisma.request.count({ where: { status: "COMPLETED" } }),
    prisma.request.aggregate({
      where: { status: "COMPLETED" },
      _sum: { peopleToServe: true, servingsReserved: true }
    }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.user.count({ where: { isBanned: true } })
  ]);

  const foodDistributed =
    foodDistributedAgg._sum.peopleToServe || foodDistributedAgg._sum.servingsReserved || 0;

  return {
    totalUsers,
    activeUsers,
    newUsersToday,
    totalDonors,
    totalDonations,
    activeDonations,
    completedDonations,
    pendingDonations,
    totalBookings,
    pendingBookings,
    completedBookings,
    foodDistributed
  };
}
