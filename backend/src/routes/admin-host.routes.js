import express from "express";
import bcrypt from "bcryptjs";
import { authRequired, roleRequired } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { logAdminAction } from "../services/activity.service.js";
import { formatBooking } from "../services/booking.service.js";
import { adjustServings } from "../services/servings.service.js";
import {
  backupDatabase,
  exportReport,
  getAdminNotifications,
  getDatabaseStats,
  getHostOverview,
  getLiveSnapshot,
  getSecurityDashboard,
  getUserProfile,
  listUsersDetailed,
  searchActivityLogs
} from "../services/admin-host.service.js";
import { getPerfStats } from "../middleware/perf.js";
import { emitEvent } from "../socket.js";

const router = express.Router();
router.use(authRequired, roleRequired("ADMIN"));

router.get("/overview", async (req, res) => {
  res.json(await getHostOverview());
});

router.get("/live", async (req, res) => {
  res.json(await getLiveSnapshot());
});

router.get("/performance", async (req, res) => {
  res.json({ perf: getPerfStats() });
});

router.get("/users", async (req, res) => {
  res.json(await listUsersDetailed(req.query));
});

router.get("/users/:id", async (req, res) => {
  const profile = await getUserProfile(req.params.id);
  if (!profile) return res.status(404).json({ message: "User not found" });
  res.json(profile);
});

router.patch("/users/:id/ban", async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { isBlocked: true }
  });
  await logAdminAction({ adminId: req.user.id, action: "USER_BANNED", targetType: "User", targetId: user.id });
  emitEvent("user:blocked", { userId: user.id });
  res.json(user);
});

router.patch("/users/:id/unban", async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { isBlocked: false }
  });
  await logAdminAction({ adminId: req.user.id, action: "USER_UNBANNED", targetType: "User", targetId: user.id });
  res.json(user);
});

router.post("/users/:id/reset-password", async (req, res) => {
  const password = String(req.body.password || "password123");
  if (password.length < 6) return res.status(400).json({ message: "Password min 6 characters" });
  const hashed = await bcrypt.hash(password, 10);
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
  res.json({ message: "Password reset", userId: user.id });
});

router.get("/activity", async (req, res) => {
  res.json(await searchActivityLogs(req.query));
});

router.get("/security", async (req, res) => {
  res.json(await getSecurityDashboard());
});

router.get("/notifications", async (req, res) => {
  res.json(await getAdminNotifications());
});

router.get("/database", async (req, res) => {
  res.json(await getDatabaseStats());
});

router.post("/database/backup", async (req, res) => {
  try {
    res.json(await backupDatabase());
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.get("/export/:type.csv", async (req, res) => {
  try {
    const csv = await exportReport(req.params.type);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.type}-report.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

const bookingInclude = {
  donation: { include: { donor: { select: { id: true, name: true, email: true } } } },
  receiver: { select: { id: true, name: true, email: true, phone: true } }
};

async function adminSetBookingStatus(req, id, status, { release = false } = {}) {
  const row = await prisma.request.findUnique({ where: { id: Number(id) }, include: { donation: true } });
  if (!row) {
    const err = new Error("Booking not found");
    err.status = 404;
    throw err;
  }
  if (release && ["PENDING", "CONFIRMED", "ACCEPTED", "RESERVED"].includes(row.status)) {
    await adjustServings(row.donationId, row.servingsReserved, "admin_booking_release");
  }
  const updated = await prisma.request.update({
    where: { id: row.id },
    data: { status },
    include: bookingInclude
  });
  await logAdminAction({
    adminId: req.user.id,
    action: `BOOKING_ADMIN_${status}`,
    targetType: "Booking",
    targetId: row.id
  });
  const booking = formatBooking(updated);
  emitEvent("booking:updated", booking);
  return booking;
}

router.patch("/bookings/:id/approve", async (req, res) => {
  try {
    res.json(await adminSetBookingStatus(req, req.params.id, "CONFIRMED"));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch("/bookings/:id/cancel", async (req, res) => {
  try {
    res.json(await adminSetBookingStatus(req, req.params.id, "CANCELLED", { release: true }));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch("/bookings/:id/complete", async (req, res) => {
  try {
    res.json(await adminSetBookingStatus(req, req.params.id, "COMPLETED"));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

export default router;
