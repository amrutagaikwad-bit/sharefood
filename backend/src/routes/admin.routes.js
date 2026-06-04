import express from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { prisma } from "../config/prisma.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import { logActivity, logAdminAction } from "../services/activity.service.js";
import { getAdminAnalytics, listAdminBookings } from "../services/analytics.service.js";
import { emitEvent, getSocketStats } from "../socket.js";
import { getOverviewStats, bucketByPeriod, startOfDay } from "../services/adminAnalytics.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prismaDir = path.join(__dirname, "../../prisma");

const router = express.Router();
router.use(authRequired, roleRequired("ADMIN"));

router.get("/overview", async (req, res) => {
  const socketStats = getSocketStats();
  const overview = await getOverviewStats();
  res.json({ ...overview, onlineUsers: socketStats.onlineUsers, activeSessions: socketStats.onlineUsers });
});

router.get("/dashboard", async (req, res) => {
  const socketStats = getSocketStats();
<<<<<<< HEAD
  const analytics = await getAdminAnalytics();
=======
  const overview = await getOverviewStats();
>>>>>>> ffc4eea (kkr)
  const [
    totalUsers,
    totalDonors,
    totalReceivers,
    activeUsers,
    blockedUsers,
    totalDonations,
    activeDonations,
    completedDonations,
    expiredDonations,
    totalBookings,
    pendingRequests,
    confirmedBookings,
    approvedRequests,
    rejectedRequests,
    totalBookings,
    confirmedBookings,
    completedBookings,
    mealsAvailableAgg,
    mealsDistributedAgg,
    recentActivity,
    topDonors,
    recentDonations,
    systemErrors
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),
    prisma.user.count({ where: { role: "DONOR" } }),
    prisma.user.count({ where: { role: "RECEIVER" } }),
    prisma.user.count({ where: { isBlocked: false, role: { not: "ADMIN" } } }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.donation.count({ where: { status: { not: "DELETED" } } }),
    prisma.donation.count({ where: { status: { in: ["ACTIVE", "REQUESTED", "RESERVED", "PICKED_UP"] }, isPaused: false } }),
    prisma.donation.count({ where: { status: "COMPLETED" } }),
    prisma.donation.count({ where: { status: "EXPIRED" } }),
    prisma.request.count(),
    prisma.request.count({ where: { status: "PENDING" } }),
<<<<<<< HEAD
    prisma.request.count({ where: { status: { in: ["ACCEPTED", "RESERVED", "CONFIRMED", "COMPLETED"] } } }),
    prisma.request.count({ where: { status: { in: ["REJECTED", "CANCELLED"] } } }),
    prisma.request.count(),
    prisma.request.count({ where: { status: { in: ["CONFIRMED", "ACCEPTED", "RESERVED"] } } }),
    prisma.request.count({ where: { status: "COMPLETED" } }),
=======
    prisma.request.count({ where: { status: { in: ["CONFIRMED", "ACCEPTED", "RESERVED"] } } }),
    prisma.request.count({ where: { status: { in: ["CONFIRMED", "ACCEPTED", "RESERVED", "COMPLETED"] } } }),
    prisma.request.count({ where: { status: "REJECTED" } }),
>>>>>>> ffc4eea (kkr)
    prisma.donation.aggregate({ where: { status: { in: ["ACTIVE", "REQUESTED", "RESERVED"] } }, _sum: { servingsRemaining: true } }),
    prisma.request.aggregate({ where: { status: "COMPLETED" }, _sum: { servingsReserved: true } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true, email: true, role: true } } } }),
    prisma.donation.groupBy({ by: ["donorId"], _count: { id: true }, take: 5 }),
    prisma.donation.findMany({ where: { status: { not: "DELETED" } }, orderBy: { createdAt: "desc" }, take: 10, include: { donor: { select: { name: true } } } }),
    prisma.systemLog.count({ where: { level: "ERROR" } })
  ]);

  topDonors.sort((a, b) => b._count.id - a._count.id);
  const donorIds = topDonors.map((d) => d.donorId);
  const donors = await prisma.user.findMany({ where: { id: { in: donorIds } }, select: { id: true, name: true } });
  const donorMap = Object.fromEntries(donors.map((d) => [d.id, d.name]));

  const mealsDistributed = mealsDistributedAgg._sum.servingsReserved || 0;
  const mealsAvailable = mealsAvailableAgg._sum.servingsRemaining || 0;

  res.json({
<<<<<<< HEAD
    users: { totalUsers, totalDonors, totalReceivers, activeUsers, blockedUsers, onlineUsers: socketStats.onlineUsers },
    donations: { totalDonations, activeDonations, completedDonations, expiredDonations },
    bookings: {
      totalBookings,
      pendingBookings: pendingRequests,
      confirmedBookings,
      completedBookings,
      cancelledBookings: rejectedRequests
=======
    overview,
    users: {
      totalUsers,
      totalDonors,
      totalReceivers,
      activeUsers,
      blockedUsers,
      newUsersToday: overview.newUsersToday,
      onlineUsers: socketStats.onlineUsers
    },
    donations: {
      totalDonations,
      activeDonations,
      completedDonations,
      expiredDonations,
      pendingDonations: overview.pendingDonations
    },
    bookings: {
      totalBookings,
      pendingRequests,
      confirmedBookings,
      completedBookings: overview.completedBookings,
      rejectedBookings: rejectedRequests
>>>>>>> ffc4eea (kkr)
    },
    requests: { pendingRequests, approvedRequests, rejectedRequests },
    analytics: {
      ...analytics,
      mealsAvailable,
      mealsDistributed: overview.foodDistributed,
      foodWastePreventedKg: overview.foodDistributed * 0.4,
      topDonors: topDonors.map((t) => ({ name: donorMap[t.donorId] || "Unknown", count: t._count.id }))
    },
    systemErrors,
    recentActivity,
    recentDonations,
    realtime: {
      onlineUsers: socketStats.onlineUsers,
      socketConnections: socketStats.connected
    }
  });
});

router.get("/donations", async (req, res) => {
  const donations = await prisma.donation.findMany({
    where: { status: { not: "DELETED" } },
    include: { donor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(donations);
});

router.get("/users", async (req, res) => {
  const { q = "", role = "", status = "" } = req.query;
  const where = { role: { not: "ADMIN" } };
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
      updatedAt: true,
      _count: { select: { donations: true, pickupRequests: true } }
    }
  });
  if (!user || user.role === "ADMIN") return res.status(404).json({ message: "User not found" });

  const [activity, logins] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.loginHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);

  res.json({
    user: {
      ...user,
      donationCount: user._count.donations,
      bookingCount: user._count.pickupRequests
    },
    activity,
    loginHistory: logins
  });
});

router.patch("/users/:id/ban", async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { isBanned: true, isBlocked: true }
  });
  await logAdminAction({ adminId: req.user.id, action: "USER_BANNED", targetType: "User", targetId: user.id });
  await prisma.securityLog.create({
    data: { type: "USER_BANNED", userId: user.id, email: user.email, message: `Banned by admin ${req.user.id}` }
  });
  res.json(user);
});

router.patch("/users/:id/reset-password", async (req, res) => {
  const tempPassword = req.body.password || "password123";
  const hashed = await bcrypt.hash(String(tempPassword), 10);
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { password: hashed }
  });
  await logAdminAction({
    adminId: req.user.id,
    action: "USER_PASSWORD_RESET",
    targetType: "User",
    targetId: user.id
  });
  res.json({ message: "Password reset", temporaryPassword: tempPassword });
});

router.get("/logs", async (req, res) => {
  const { q = "", action = "" } = req.query;
  const activityWhere = {};
  if (action) activityWhere.action = { contains: String(action) };
  let activity = await prisma.activityLog.findMany({
    where: activityWhere,
    orderBy: { createdAt: "desc" },
    take: 300,
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
    prisma.systemLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { admin: { select: { name: true, email: true } } }
    })
  ]);
  res.json({ activity, system, adminActions });
});

router.get("/security", async (req, res) => {
  const [failedLogins, securityLogs, bannedUsers] = await Promise.all([
    prisma.securityLog.findMany({ where: { type: "FAILED_LOGIN" }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.securityLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.findMany({
      where: { OR: [{ isBanned: true }, { isBlocked: true }] },
      select: { id: true, name: true, email: true, isBlocked: true, isBanned: true, updatedAt: true }
    })
  ]);
  res.json({ failedLogins, securityLogs, bannedUsers });
});

router.get("/database/stats", async (req, res) => {
  const [users, donations, bookings, notifications, activity, system, settings] = await Promise.all([
    prisma.user.count(),
    prisma.donation.count(),
    prisma.request.count(),
    prisma.notification.count(),
    prisma.activityLog.count(),
    prisma.systemLog.count(),
    prisma.siteSetting.count()
  ]);
  const dbPath = path.join(prismaDir, "dev.db");
  let fileSizeMb = 0;
  if (fs.existsSync(dbPath)) {
    fileSizeMb = Math.round((fs.statSync(dbPath).size / 1024 / 1024) * 100) / 100;
  }
  res.json({
    engine: "SQLite (Prisma)",
    path: "backend/prisma/dev.db",
    fileSizeMb,
    tables: { users, donations, bookings, notifications, activity, system, settings }
  });
});

router.post("/database/backup", async (req, res) => {
  const src = path.join(prismaDir, "dev.db");
  if (!fs.existsSync(src)) return res.status(404).json({ message: "Database file not found" });
  const backupDir = path.join(prismaDir, "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const name = `dev-${Date.now()}.db`;
  const dest = path.join(backupDir, name);
  fs.copyFileSync(src, dest);
  await logAdminAction({ adminId: req.user.id, action: "DB_BACKUP", details: name });
  res.json({ message: "Backup created", file: name });
});

function toCsv(rows, headers) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  rows.forEach((row) => lines.push(headers.map((h) => escape(row[h])).join(",")));
  return lines.join("\n");
}

router.get("/export/:type", async (req, res) => {
  const type = req.params.type;
  let csv = "";
  let filename = "export.csv";

  if (type === "users") {
    const users = await prisma.user.findMany({ where: { role: { not: "ADMIN" } } });
    csv = toCsv(users, ["id", "name", "email", "role", "phone", "isBlocked", "isBanned", "createdAt"]);
    filename = "users.csv";
  } else if (type === "donations") {
    const rows = await prisma.donation.findMany({ include: { donor: { select: { name: true, email: true } } } });
    csv = toCsv(
      rows.map((d) => ({
        id: d.id,
        foodName: d.foodName,
        status: d.status,
        donor: d.donor?.name,
        email: d.donor?.email,
        servingsRemaining: d.servingsRemaining,
        createdAt: d.createdAt
      })),
      ["id", "foodName", "status", "donor", "email", "servingsRemaining", "createdAt"]
    );
    filename = "donations.csv";
  } else if (type === "bookings") {
    const rows = await prisma.request.findMany({
      include: {
        receiver: { select: { name: true, email: true } },
        donation: { select: { foodName: true } }
      }
    });
    csv = toCsv(
      rows.map((r) => ({
        id: r.id,
        food: r.donation?.foodName,
        receiver: r.receiver?.name,
        email: r.receiver?.email,
        status: r.status,
        peopleToServe: r.peopleToServe,
        bookingDateTime: r.bookingDateTime,
        createdAt: r.createdAt
      })),
      ["id", "food", "receiver", "email", "status", "peopleToServe", "bookingDateTime", "createdAt"]
    );
    filename = "bookings.csv";
  } else {
    return res.status(400).json({ message: "Unknown export type" });
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

router.get("/reports/monthly", async (req, res) => {
  const overview = await getOverviewStats();
  const month = new Date().toISOString().slice(0, 7);
  res.json({
    title: `FoodBridge Monthly Report — ${month}`,
    generatedAt: new Date().toISOString(),
    summary: overview
  });
});

router.put("/donations/:id", async (req, res) => {
  const prev = await prisma.donation.findUnique({ where: { id: Number(req.params.id) } });
  const updated = await prisma.donation.update({ where: { id: Number(req.params.id) }, data: req.body });
  await logAdminAction({ adminId: req.user.id, action: "DONATION_EDIT", targetType: "Donation", targetId: updated.id, previousValue: prev, newValue: updated });
  emitEvent("donation:updated", updated);
  res.json(updated);
});

router.patch("/donations/:id/hide", async (req, res) => {
  const updated = await prisma.donation.update({ where: { id: Number(req.params.id) }, data: { isHidden: true } });
  await logAdminAction({ adminId: req.user.id, action: "DONATION_HIDDEN", targetType: "Donation", targetId: updated.id });
  emitEvent("donation:updated", updated);
  res.json(updated);
});

router.patch("/donations/:id/restore", async (req, res) => {
  const updated = await prisma.donation.update({
    where: { id: Number(req.params.id) },
    data: { isHidden: false, isFlagged: false, status: "ACTIVE" }
  });
  await logAdminAction({ adminId: req.user.id, action: "DONATION_RESTORED", targetType: "Donation", targetId: updated.id });
  emitEvent("donation:updated", updated);
  res.json(updated);
});

router.get("/activity", async (req, res) => {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true, role: true } } }
  });
  res.json(logs);
});

router.patch("/users/:id/block", async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { isBlocked: true }
  });
  await logAdminAction({ adminId: req.user.id, action: "USER_SUSPENDED", targetType: "User", targetId: user.id });
  emitEvent("user:blocked", { userId: user.id });
  res.json(user);
});

router.patch("/users/:id/restore", async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { isBlocked: false }
  });
  await logAdminAction({ adminId: req.user.id, action: "USER_RESTORED", targetType: "User", targetId: user.id });
  res.json(user);
});

router.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id } });
  await logAdminAction({ adminId: req.user.id, action: "USER_DELETED", targetType: "User", targetId: id });
  res.json({ message: "User deleted" });
});

router.patch("/donations/:id/invalidate", async (req, res) => {
  const donation = await prisma.donation.update({
    where: { id: Number(req.params.id) },
    data: { status: "INVALID" }
  });
  await logAdminAction({ adminId: req.user.id, action: "DONATION_INVALIDATED", targetType: "Donation", targetId: donation.id });
  emitEvent("donation:updated", donation);
  res.json(donation);
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

router.delete("/donations/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.donation.update({ where: { id }, data: { status: "DELETED" } });
  await logAdminAction({ adminId: req.user.id, action: "DONATION_DELETED", targetType: "Donation", targetId: id });
  emitEvent("donation:deleted", { id });
  res.json({ message: "Donation removed" });
});

router.get("/reports", async (req, res) => {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { name: true } },
      donation: { select: { foodName: true } },
      reportedUser: { select: { name: true } }
    }
  });
  res.json(reports);
});

router.patch("/reports/:id/resolve", async (req, res) => {
  const report = await prisma.report.update({
    where: { id: Number(req.params.id) },
    data: { status: "RESOLVED" }
  });
  res.json(report);
});

<<<<<<< HEAD
router.get("/requests", async (req, res) => {
  res.json(await listAdminBookings({ status: req.query.status, q: req.query.q }));
});

router.get("/bookings", async (req, res) => {
  res.json(await listAdminBookings({ status: req.query.status, q: req.query.q }));
});

router.get("/donors", async (req, res) => {
  const { q = "" } = req.query;
  let donors = await prisma.user.findMany({
    where: { role: "DONOR" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isBlocked: true,
      createdAt: true,
      _count: { select: { donations: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  if (q) {
    const term = String(q).toLowerCase();
    donors = donors.filter((d) => d.name.toLowerCase().includes(term) || d.email.toLowerCase().includes(term));
  }
  res.json(donors);
=======
router.get("/bookings", async (req, res) => {
  const { status = "", q = "" } = req.query;
  const where = {};
  if (status) where.status = status;
  let bookings = await prisma.request.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      receiver: { select: { id: true, name: true, email: true, phone: true } },
      donation: {
        select: {
          id: true,
          foodName: true,
          status: true,
          donorId: true,
          donor: { select: { name: true, email: true, phone: true } }
        }
      }
    }
  });
  if (q) {
    const term = String(q).toLowerCase();
    bookings = bookings.filter(
      (b) =>
        b.receiver?.name?.toLowerCase().includes(term) ||
        b.donation?.foodName?.toLowerCase().includes(term) ||
        b.donation?.donor?.name?.toLowerCase().includes(term)
    );
  }
  res.json(bookings);
});

router.get("/requests", async (req, res) => {
  const { status = "", q = "" } = req.query;
  const where = {};
  if (status) where.status = status;
  const bookings = await prisma.request.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      receiver: { select: { id: true, name: true, email: true } },
      donation: {
        select: {
          id: true,
          foodName: true,
          status: true,
          donor: { select: { name: true, email: true } }
        }
      }
    }
  });
  const filtered = q
    ? bookings.filter((b) => JSON.stringify(b).toLowerCase().includes(String(q).toLowerCase()))
    : bookings;
  res.json(filtered);
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
>>>>>>> ffc4eea (kkr)
});

router.get("/notifications", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true, role: true } } }
  });
  res.json(notifications);
});

router.get("/settings", async (req, res) => {
  const settings = await prisma.siteSetting.findMany({ orderBy: { key: "asc" } });
  res.json(settings);
});

router.put("/settings/:key", async (req, res) => {
  const key = req.params.key;
  const value = String(req.body.value ?? "");
  const setting = await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  });
  await logAdminAction({
    adminId: req.user.id,
    action: "SETTING_UPDATED",
    targetType: "SiteSetting",
    details: `${key}=${value}`
  });
  res.json(setting);
});

<<<<<<< HEAD
router.get("/analytics/trends", async (req, res) => {
  const data = await getAdminAnalytics();
  res.json({
    dailyDonations: data.trends.donationTrends,
    dailyBookings: data.trends.bookingTrends,
    periods: data.periods,
    overview: data.overview
=======
router.get("/analytics/full", async (req, res) => {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const today = startOfDay();
  const [users, donations, bookings, completedBookings] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: since }, role: { not: "ADMIN" } }, select: { createdAt: true } }),
    prisma.donation.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.request.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, status: true } }),
    prisma.request.findMany({ where: { status: "COMPLETED", updatedAt: { gte: since } }, select: { updatedAt: true } })
  ]);

  const usersToday = await prisma.user.count({ where: { createdAt: { gte: today }, role: { not: "ADMIN" } } });
  const donationsToday = await prisma.donation.count({ where: { createdAt: { gte: today } } });
  const bookingsToday = await prisma.request.count({ where: { createdAt: { gte: today } } });
  const deliveredToday = await prisma.request.count({
    where: { status: "COMPLETED", updatedAt: { gte: today } }
  });

  let topDonors = await prisma.donation.groupBy({
    by: ["donorId"],
    _count: { id: true }
  });
  topDonors = topDonors.sort((a, b) => b._count.id - a._count.id).slice(0, 5);
  const donorIds = topDonors.map((d) => d.donorId);
  const donorUsers = await prisma.user.findMany({ where: { id: { in: donorIds } }, select: { id: true, name: true } });
  const donorMap = Object.fromEntries(donorUsers.map((d) => [d.id, d.name]));

  let activeReceivers = await prisma.request.groupBy({
    by: ["receiverId"],
    _count: { id: true }
  });
  activeReceivers = activeReceivers.sort((a, b) => b._count.id - a._count.id).slice(0, 5);
  const receiverIds = activeReceivers.map((r) => r.receiverId);
  const receiverUsers = await prisma.user.findMany({ where: { id: { in: receiverIds } }, select: { id: true, name: true } });
  const receiverMap = Object.fromEntries(receiverUsers.map((r) => [r.id, r.name]));

  res.json({
    daily: {
      usersJoined: bucketByPeriod(users, "createdAt", 90).daily,
      donationsCreated: bucketByPeriod(donations, "createdAt", 90).daily,
      foodBooked: bucketByPeriod(bookings, "createdAt", 90).daily,
      foodDelivered: bucketByPeriod(completedBookings, "updatedAt", 90).daily
    },
    today: { usersJoined: usersToday, donationsCreated: donationsToday, foodBooked: bookingsToday, foodDelivered: deliveredToday },
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
    topDonors: topDonors.map((t) => ({ name: donorMap[t.donorId] || "Unknown", count: t._count.id })),
    mostActiveUsers: activeReceivers.map((r) => ({
      name: receiverMap[r.receiverId] || "Unknown",
      bookings: r._count.id
    }))
  });
});

router.get("/analytics/trends", async (req, res) => {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [donations, bookings] = await Promise.all([
    prisma.donation.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true }
    }),
    prisma.request.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true }
    })
  ]);
  const donationTrends = bucketByPeriod(donations, "createdAt", 90);
  const bookingTrends = bucketByPeriod(bookings, "createdAt", 90);
  res.json({
    dailyDonations: donationTrends.daily,
    weeklyDonations: donationTrends.weekly,
    monthlyDonations: donationTrends.monthly,
    dailyBookings: bookingTrends.daily,
    weeklyBookings: bookingTrends.weekly,
    monthlyBookings: bookingTrends.monthly
>>>>>>> ffc4eea (kkr)
  });
});

export default router;
