import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import { logActivity, logAdminAction } from "../services/activity.service.js";
import { emitEvent, getSocketStats } from "../socket.js";

const router = express.Router();
router.use(authRequired, roleRequired("ADMIN"));

router.get("/dashboard", async (req, res) => {
  const socketStats = getSocketStats();
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
    pendingRequests,
    approvedRequests,
    rejectedRequests,
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
    prisma.request.count({ where: { status: "PENDING" } }),
    prisma.request.count({ where: { status: { in: ["ACCEPTED", "RESERVED", "COMPLETED"] } } }),
    prisma.request.count({ where: { status: "REJECTED" } }),
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
    users: { totalUsers, totalDonors, totalReceivers, activeUsers, blockedUsers, onlineUsers: socketStats.onlineUsers },
    donations: { totalDonations, activeDonations, completedDonations, expiredDonations },
    requests: { pendingRequests, approvedRequests, rejectedRequests },
    analytics: {
      mealsAvailable,
      mealsDistributed,
      foodWastePreventedKg: mealsDistributed * 0.4,
      topDonors: topDonors.map((t) => ({ name: donorMap[t.donorId] || "Unknown", count: t._count.id }))
    },
    systemErrors,
    recentActivity,
    recentDonations
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
  const { q = "" } = req.query;
  let users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: { id: true, name: true, email: true, role: true, phone: true, isBlocked: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  });
  if (q) {
    const term = String(q).toLowerCase();
    users = users.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }
  res.json(users);
});

router.get("/logs", async (req, res) => {
  const [activity, system] = await Promise.all([
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { name: true, email: true, role: true } } }
    }),
    prisma.systemLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 })
  ]);
  res.json({ activity, system });
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

router.get("/requests", async (req, res) => {
  const requests = await prisma.request.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      receiver: { select: { id: true, name: true, email: true } },
      donation: { select: { id: true, foodName: true, status: true, donorId: true } }
    }
  });
  res.json(requests);
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

router.get("/analytics/trends", async (req, res) => {
  const donations = await prisma.donation.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    select: { createdAt: true, status: true, servingsRemaining: true }
  });
  const byDay = {};
  donations.forEach((d) => {
    const day = d.createdAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });
  res.json({
    dailyDonations: Object.entries(byDay).map(([date, count]) => ({ date, count }))
  });
});

export default router;
