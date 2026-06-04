import express from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { prisma } from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";
import { adminRequired } from "../middleware/adminAuth.js";
import { logActivity, logAdminAction } from "../services/activity.service.js";
import { getAdminAnalytics, listAdminBookings } from "../services/analytics.service.js";
import { getOverviewStats, bucketByPeriod, startOfDay } from "../services/adminAnalytics.service.js";
import { getMetricsSummary } from "../services/metrics.service.js";
import { emitEvent, getSocketStats, getOnlineUsersList } from "../socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prismaDir = path.join(__dirname, "../../prisma");
const NON_STAFF = { role: { notIn: ["ADMIN", "SUPER_ADMIN"] } };

const router = express.Router();
router.use(authRequired, adminRequired);

router.get("/dashboard", async (req, res) => {
  const socketStats = getSocketStats();
  const overview = await getOverviewStats();
  const analytics = await getAdminAnalytics();
  const today = startOfDay();

  const [totalNotifications, dailyActivityCount, totalRequests, pendingDonations] = await Promise.all([
    prisma.notification.count(),
    prisma.activityLog.count({ where: { createdAt: { gte: today } } }),
    prisma.request.count(),
    prisma.donation.count({ where: { OR: [{ status: "CREATED" }, { isFlagged: true }] } })
  ]);

  const [recentActivity, recentDonations, systemErrors, topDonorsRaw] = await Promise.all([
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { user: { select: { name: true, email: true, role: true } } }
    }),
    prisma.donation.findMany({
      where: { status: { not: "DELETED" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { donor: { select: { name: true } } }
    }),
    prisma.systemLog.count({ where: { level: "ERROR" } }),
    prisma.donation.groupBy({ by: ["donorId"], _count: { id: true } })
  ]);

  topDonorsRaw.sort((a, b) => b._count.id - a._count.id);
  const donorIds = topDonorsRaw.slice(0, 5).map((d) => d.donorId);
  const donors = await prisma.user.findMany({ where: { id: { in: donorIds } }, select: { id: true, name: true } });
  const donorMap = Object.fromEntries(donors.map((d) => [d.id, d.name]));

  res.json({
    overview: {
      ...overview,
      totalNotifications,
      totalRequests,
      dailyActivityCount,
      onlineUsers: socketStats.onlineUsers,
      totalRevenue: 0,
      pendingDonations
    },
    users: {
      totalUsers: overview.totalUsers,
      activeUsers: overview.activeUsers,
      newUsersToday: overview.newUsersToday,
      totalDonors: overview.totalDonors,
      onlineUsers: socketStats.onlineUsers,
      blockedUsers: overview.blockedUsers,
      bannedUsers: overview.bannedUsers
    },
    donations: {
      totalDonations: overview.totalDonations,
      activeDonations: overview.activeDonations,
      completedDonations: overview.completedDonations,
      pendingDonations
    },
    bookings: {
      totalBookings: overview.totalBookings,
      pendingBookings: overview.pendingBookings,
      completedBookings: overview.completedBookings
    },
    analytics: {
      ...analytics,
      topDonors: topDonorsRaw.slice(0, 5).map((t) => ({ name: donorMap[t.donorId] || "Unknown", count: t._count.id }))
    },
    systemErrors,
    recentActivity,
    recentDonations,
    realtime: {
      onlineUsers: socketStats.onlineUsers,
      socketConnections: socketStats.connected,
      liveUsers: getOnlineUsersList()
    }
  });
});

router.get("/live/users", async (req, res) => {
  const live = getOnlineUsersList();
  const sessions = await prisma.userSession.findMany({
    where: { endedAt: null },
    orderBy: { lastSeenAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });
  res.json({ live, sessions });
});

router.get("/users", async (req, res) => {
  const { q = "", role = "", status = "" } = req.query;
  const where = { ...NON_STAFF };
  if (role) where.role = role;
  if (status === "blocked") where.isBlocked = true;
  if (status === "banned") where.isBanned = true;
  if (status === "active") {
    where.isBlocked = false;
    where.isBanned = false;
  }

  let users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isBlocked: true,
      isBanned: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { donations: true, pickupRequests: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  if (q) {
    const term = String(q).toLowerCase();
    users = users.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }
  res.json(
    users.map((u) => ({
      ...u,
      donationCount: u._count.donations,
      bookingCount: u._count.pickupRequests,
      status: u.isBanned ? "banned" : u.isBlocked ? "suspended" : "active",
      _count: undefined
    }))
  );
});

router.get("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isBlocked: true,
      isBanned: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { donations: true, pickupRequests: true } }
    }
  });
  if (!user || ["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return res.status(404).json({ message: "User not found" });
  }

  const [activity, loginHistory, sessions] = await Promise.all([
    prisma.activityLog.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.loginHistory.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.userSession.findMany({ where: { userId: id }, orderBy: { lastSeenAt: "desc" }, take: 20 })
  ]);

  res.json({
    user: {
      ...user,
      donationCount: user._count.donations,
      bookingCount: user._count.pickupRequests,
      status: user.isBanned ? "banned" : user.isBlocked ? "suspended" : "active"
    },
    activity,
    loginHistory,
    sessions
  });
});

router.patch("/users/:id/role", async (req, res) => {
  const role = req.body.role;
  if (!["DONOR", "RECEIVER"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { role } });
  await logAdminAction({ adminId: req.user.id, action: "USER_ROLE_CHANGED", targetType: "User", targetId: user.id, details: role });
  res.json(user);
});

router.patch("/users/:id/block", async (req, res) => {
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { isBlocked: true } });
  await logAdminAction({ adminId: req.user.id, action: "USER_SUSPENDED", targetType: "User", targetId: user.id });
  res.json(user);
});

router.patch("/users/:id/ban", async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { isBanned: true, isBlocked: true }
  });
  await logAdminAction({ adminId: req.user.id, action: "USER_BANNED", targetType: "User", targetId: user.id });
  await prisma.securityLog.create({
    data: { type: "USER_BANNED", userId: user.id, email: user.email, message: `Banned by admin #${req.user.id}` }
  });
  res.json(user);
});

router.patch("/users/:id/restore", async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { isBlocked: false, isBanned: false }
  });
  await logAdminAction({ adminId: req.user.id, action: "USER_RESTORED", targetType: "User", targetId: user.id });
  res.json(user);
});

router.patch("/users/:id/reset-password", async (req, res) => {
  const tempPassword = req.body.password || "password123";
  const hashed = await bcrypt.hash(String(tempPassword), 10);
  await prisma.user.update({ where: { id: Number(req.params.id) }, data: { password: hashed } });
  await logAdminAction({ adminId: req.user.id, action: "USER_PASSWORD_RESET", targetType: "User", targetId: Number(req.params.id) });
  res.json({ message: "Password reset", temporaryPassword: tempPassword });
});

router.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id } });
  await logAdminAction({ adminId: req.user.id, action: "USER_DELETED", targetType: "User", targetId: id });
  res.json({ message: "User deleted" });
});

router.get("/donations", async (req, res) => {
  const donations = await prisma.donation.findMany({
    where: { status: { not: "DELETED" } },
    include: {
      donor: { select: { id: true, name: true, email: true } },
      requests: { include: { receiver: { select: { name: true, email: true } } } }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json(donations);
});

router.patch("/donations/:id/approve", async (req, res) => {
  const donation = await prisma.donation.update({
    where: { id: Number(req.params.id) },
    data: { isFlagged: false, status: "ACTIVE" }
  });
  await logAdminAction({ adminId: req.user.id, action: "DONATION_APPROVED", targetType: "Donation", targetId: donation.id });
  emitEvent("donation:updated", donation);
  res.json(donation);
});

router.patch("/donations/:id/reject", async (req, res) => {
  const donation = await prisma.donation.update({
    where: { id: Number(req.params.id) },
    data: { status: "INVALID", isFlagged: true }
  });
  await logAdminAction({ adminId: req.user.id, action: "DONATION_REJECTED", targetType: "Donation", targetId: donation.id });
  emitEvent("donation:updated", donation);
  res.json(donation);
});

router.delete("/donations/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.donation.update({ where: { id }, data: { status: "DELETED" } });
  await logAdminAction({ adminId: req.user.id, action: "DONATION_DELETED", targetType: "Donation", targetId: id });
  res.json({ message: "Deleted" });
});

router.get("/bookings", async (req, res) => {
  res.json(await listAdminBookings({ status: req.query.status, q: req.query.q }));
});

router.get("/requests", async (req, res) => {
  res.json(await listAdminBookings({ status: req.query.status, q: req.query.q }));
});

router.patch("/bookings/:id/approve", async (req, res) => {
  const booking = await prisma.request.update({
    where: { id: Number(req.params.id) },
    data: { status: "CONFIRMED" },
    include: { receiver: true, donation: true }
  });
  await logAdminAction({ adminId: req.user.id, action: "BOOKING_APPROVED", targetType: "Booking", targetId: booking.id });
  emitEvent("booking:updated", booking);
  res.json(booking);
});

router.patch("/bookings/:id/cancel", async (req, res) => {
  const booking = await prisma.request.update({
    where: { id: Number(req.params.id) },
    data: { status: "CANCELLED" }
  });
  await logAdminAction({ adminId: req.user.id, action: "BOOKING_CANCELLED", targetType: "Booking", targetId: booking.id });
  emitEvent("booking:updated", booking);
  res.json(booking);
});

router.get("/logs", async (req, res) => {
  const { q = "", action = "" } = req.query;
  const where = {};
  if (action) where.action = { contains: String(action) };
  let activity = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 400,
    include: { user: { select: { name: true, email: true, role: true } } }
  });
  if (q) {
    const term = String(q).toLowerCase();
    activity = activity.filter(
      (l) =>
        l.action.toLowerCase().includes(term) ||
        l.user?.name?.toLowerCase().includes(term) ||
        l.user?.email?.toLowerCase().includes(term)
    );
  }
  const [system, adminActions] = await Promise.all([
    prisma.systemLog.findMany({ orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      include: { admin: { select: { name: true, email: true } } }
    })
  ]);
  res.json({ activity, system, adminActions });
});

router.get("/security", async (req, res) => {
  const [failedLogins, securityLogs, bannedUsers, rateLimitEvents] = await Promise.all([
    prisma.securityLog.findMany({ where: { type: "FAILED_LOGIN" }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.securityLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.findMany({
      where: { OR: [{ isBanned: true }, { isBlocked: true }] },
      select: { id: true, name: true, email: true, isBlocked: true, isBanned: true, updatedAt: true }
    }),
    prisma.securityLog.findMany({ where: { type: "RATE_LIMIT" }, orderBy: { createdAt: "desc" }, take: 50 })
  ]);
  res.json({ failedLogins, securityLogs, bannedUsers, rateLimitEvents });
});

router.get("/performance", async (req, res) => {
  const metrics = getMetricsSummary();
  const socketStats = getSocketStats();
  res.json({ metrics, socketStats });
});

router.get("/analytics/full", async (req, res) => {
  const data = await getAdminAnalytics();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({ where: { createdAt: { gte: since }, ...NON_STAFF }, select: { createdAt: true } });
  const donations = await prisma.donation.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, city: true } });
  const bookings = await prisma.request.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });

  const geo = {};
  donations.forEach((d) => {
    const city = d.city || "Unknown";
    geo[city] = (geo[city] || 0) + 1;
  });

  res.json({
    ...data,
    daily: {
      usersJoined: bucketByPeriod(users, "createdAt", 90).daily,
      donationsCreated: bucketByPeriod(donations, "createdAt", 90).daily,
      foodBooked: bucketByPeriod(bookings, "createdAt", 90).daily
    },
    weekly: {
      users: bucketByPeriod(users, "createdAt", 90).weekly,
      donations: bucketByPeriod(donations, "createdAt", 90).weekly,
      bookings: bucketByPeriod(bookings, "createdAt", 90).weekly
    },
    monthly: {
      users: bucketByPeriod(users, "createdAt", 365).monthly,
      donations: bucketByPeriod(donations, "createdAt", 365).monthly,
      bookings: bucketByPeriod(bookings, "createdAt", 365).monthly
    },
    geographic: Object.entries(geo).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 15),
    traffic: getMetricsSummary().traffic
  });
});

router.get("/analytics/trends", async (req, res) => {
  const data = await getAdminAnalytics();
  res.json({
    dailyDonations: data.trends.donationTrends,
    dailyBookings: data.trends.bookingTrends,
    periods: data.periods
  });
});

router.get("/notifications", async (req, res) => {
  res.json(
    await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true, role: true } } }
    })
  );
});

router.get("/settings", async (req, res) => {
  res.json(await prisma.siteSetting.findMany({ orderBy: { key: "asc" } }));
});

router.put("/settings/:key", async (req, res) => {
  const key = req.params.key;
  const value = String(req.body.value ?? "");
  const setting = await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  });
  await logAdminAction({ adminId: req.user.id, action: "SETTING_UPDATED", targetType: "SiteSetting", details: `${key}=${value}` });
  res.json(setting);
});

router.get("/database/stats", async (req, res) => {
  const tables = {
    users: await prisma.user.count(),
    donations: await prisma.donation.count(),
    bookings: await prisma.request.count(),
    notifications: await prisma.notification.count(),
    activityLogs: await prisma.activityLog.count(),
    loginHistory: await prisma.loginHistory.count(),
    sessions: await prisma.userSession.count()
  };
  const dbPath = path.join(prismaDir, "dev.db");
  let fileSizeMb = 0;
  if (fs.existsSync(dbPath)) fileSizeMb = Math.round((fs.statSync(dbPath).size / 1024 / 1024) * 100) / 100;
  res.json({
    engine: "SQLite + Prisma (production-ready; MongoDB-compatible API design)",
    path: "backend/prisma/dev.db",
    fileSizeMb,
    totalRecords: Object.values(tables).reduce((a, b) => a + b, 0),
    tables
  });
});

router.post("/database/backup", async (req, res) => {
  const src = path.join(prismaDir, "dev.db");
  if (!fs.existsSync(src)) return res.status(404).json({ message: "Database not found" });
  const backupDir = path.join(prismaDir, "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const name = `dev-${Date.now()}.db`;
  fs.copyFileSync(src, path.join(backupDir, name));
  await logAdminAction({ adminId: req.user.id, action: "DB_BACKUP", details: name });
  res.json({ message: "Backup created", file: name });
});

router.post("/database/restore", async (req, res) => {
  const file = req.body.file;
  if (!file) return res.status(400).json({ message: "file required" });
  const src = path.join(prismaDir, "backups", path.basename(file));
  const dest = path.join(prismaDir, "dev.db");
  if (!fs.existsSync(src)) return res.status(404).json({ message: "Backup not found" });
  fs.copyFileSync(src, dest);
  await logAdminAction({ adminId: req.user.id, action: "DB_RESTORE", details: file });
  res.json({ message: "Database restored. Restart the server." });
});

function toCsv(rows, headers) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  rows.forEach((row) => lines.push(headers.map((h) => escape(row[h])).join(",")));
  return lines.join("\n");
}

router.get("/export/:type", async (req, res) => {
  const format = req.query.format || "csv";
  const type = req.params.type;

  let data = [];
  let headers = [];

  if (type === "users") {
    data = await prisma.user.findMany({ where: NON_STAFF });
    headers = ["id", "name", "email", "role", "phone", "isBlocked", "isBanned", "createdAt"];
  } else if (type === "donations") {
    const rows = await prisma.donation.findMany({ include: { donor: { select: { name: true } } } });
    data = rows.map((d) => ({ id: d.id, foodName: d.foodName, status: d.status, donor: d.donor?.name, createdAt: d.createdAt }));
    headers = ["id", "foodName", "status", "donor", "createdAt"];
  } else if (type === "bookings") {
    const rows = await prisma.request.findMany({ include: { receiver: { select: { name: true } }, donation: { select: { foodName: true } } } });
    data = rows.map((r) => ({ id: r.id, food: r.donation?.foodName, receiver: r.receiver?.name, status: r.status, createdAt: r.createdAt }));
    headers = ["id", "food", "receiver", "status", "createdAt"];
  } else if (type === "logs") {
    data = await prisma.activityLog.findMany({ take: 500, orderBy: { createdAt: "desc" } });
    headers = ["id", "action", "userId", "entityType", "entityId", "createdAt"];
  } else {
    return res.status(400).json({ message: "Unknown export type" });
  }

  if (format === "json") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${type}.json"`);
    return res.json(data);
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${type}.csv"`);
  res.send(toCsv(data, headers));
});

router.get("/reports/:type", async (req, res) => {
  const overview = await getOverviewStats();
  const type = req.params.type;
  res.json({
    title: `FoodBridge ${type} report`,
    generatedAt: new Date().toISOString(),
    summary: overview,
    note: "Open in browser and use Print → Save as PDF for PDF export"
  });
});

export default router;
