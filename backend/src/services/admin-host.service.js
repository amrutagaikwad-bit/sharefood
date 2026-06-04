import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/prisma.js";
import { getAdminAnalytics, listAdminBookings } from "./analytics.service.js";
import { formatBooking } from "./booking.service.js";
import { getPerfStats } from "../middleware/perf.js";
import { getSocketStats } from "../socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../../prisma/dev.db");
const backupDir = path.resolve(__dirname, "../../prisma/backups");

function dayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getHostOverview() {
  const socketStats = getSocketStats();
  const perf = getPerfStats();
  const analytics = await getAdminAnalytics();
  const today = dayStart();

  const [
    activeUsers,
    newUsersToday,
    pendingDonations,
    foodDistributed,
    onlineList
  ] = await Promise.all([
    prisma.user.count({ where: { isBlocked: false, role: { not: "ADMIN" } } }),
    prisma.user.count({ where: { createdAt: { gte: today }, role: { not: "ADMIN" } } }),
    prisma.donation.count({
      where: { OR: [{ status: "CREATED" }, { isFlagged: true }] }
    }),
    prisma.request.aggregate({ where: { status: "COMPLETED" }, _sum: { servingsReserved: true } }),
    Promise.resolve(socketStats)
  ]);

  const foodDelivered = foodDistributed._sum.servingsReserved || 0;

  return {
    cards: {
      totalUsers: analytics.overview.totalUsers,
      activeUsers,
      newUsersToday,
      totalDonations: analytics.overview.totalDonations,
      totalBookings: analytics.overview.totalBookings,
      foodDistributed: foodDelivered,
      totalDonors: analytics.overview.totalDonors,
      completedDonations: analytics.overview.completedDonations,
      pendingDonations,
      pendingBookings: analytics.overview.pendingBookings
    },
    analytics,
    live: {
      onlineUsers: socketStats.onlineUsers,
      activeSessions: socketStats.onlineUsers,
      socketConnections: socketStats.connected
    },
    performance: perf
  };
}

export async function listUsersDetailed({ q = "", role = "", blocked = "" } = {}) {
  let users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isBlocked: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { donations: true, pickupRequests: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  if (role) users = users.filter((u) => u.role === role);
  if (blocked === "true") users = users.filter((u) => u.isBlocked);
  if (blocked === "false") users = users.filter((u) => !u.isBlocked);
  if (q) {
    const term = String(q).toLowerCase();
    users = users.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }

  return users.map((u) => ({
    ...u,
    donationCount: u._count.donations,
    bookingCount: u._count.pickupRequests
  }));
}

export async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isBlocked: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { donations: true, pickupRequests: true, notifications: true } }
    }
  });
  if (!user || user.role === "ADMIN") return null;

  const [activity, logins, donations, bookings] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.loginHistory.findMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      orderBy: { createdAt: "desc" },
      take: 30
    }),
    prisma.donation.findMany({
      where: { donorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.request.findMany({
      where: { receiverId: user.id },
      include: { donation: { select: { foodName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return {
    user: {
      ...user,
      donationCount: user._count.donations,
      bookingCount: user._count.pickupRequests
    },
    activity,
    loginHistory: logins,
    donations,
    bookings: bookings.map(formatBooking)
  };
}

export async function searchActivityLogs({ q = "", action = "", limit = 200 } = {}) {
  let logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit) || 200, 500),
    include: { user: { select: { name: true, email: true, role: true } } }
  });
  if (action) logs = logs.filter((l) => l.action.includes(String(action).toUpperCase()));
  if (q) {
    const term = String(q).toLowerCase();
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(term) ||
        l.user?.name?.toLowerCase().includes(term) ||
        l.user?.email?.toLowerCase().includes(term) ||
        (l.newValue || "").toLowerCase().includes(term)
    );
  }
  return logs;
}

export async function getSecurityDashboard() {
  const [failedLogins, bannedUsers, events] = await Promise.all([
    prisma.loginHistory.count({ where: { success: false, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.user.count({ where: { isBlocked: true, role: { not: "ADMIN" } } }),
    prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true, email: true } } } })
  ]);
  return { failedLoginsWeek: failedLogins, bannedUsers, events };
}

export async function getDatabaseStats() {
  const [users, donations, bookings, notifications, activity, system, settings, logins, security] =
    await Promise.all([
      prisma.user.count(),
      prisma.donation.count(),
      prisma.request.count(),
      prisma.notification.count(),
      prisma.activityLog.count(),
      prisma.systemLog.count(),
      prisma.siteSetting.count(),
      prisma.loginHistory.count(),
      prisma.securityEvent.count()
    ]);

  let dbSizeBytes = 0;
  try {
    if (fs.existsSync(dbPath)) dbSizeBytes = fs.statSync(dbPath).size;
  } catch {
    /* ignore */
  }

  return {
    engine: "SQLite (Prisma)",
    path: "backend/prisma/dev.db",
    sizeMb: (dbSizeBytes / 1024 / 1024).toFixed(2),
    tables: {
      users,
      donations,
      bookings,
      notifications,
      activityLogs: activity,
      systemLogs: system,
      siteSettings: settings,
      loginHistory: logins,
      securityEvents: security
    }
  };
}

export async function backupDatabase() {
  if (!fs.existsSync(dbPath)) throw Object.assign(new Error("Database file not found"), { status: 404 });
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const name = `dev-${Date.now()}.db`;
  const dest = path.join(backupDir, name);
  fs.copyFileSync(dbPath, dest);
  return { filename: name, path: dest };
}

export function toCsv(rows, columns) {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col] ?? "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") ? `"${str}"` : str;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export async function exportReport(type) {
  if (type === "users") {
    const users = await listUsersDetailed();
    return toCsv(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        blocked: u.isBlocked,
        donations: u.donationCount,
        bookings: u.bookingCount,
        registered: u.createdAt,
        lastLogin: u.lastLoginAt || ""
      })),
      ["id", "name", "email", "role", "blocked", "donations", "bookings", "registered", "lastLogin"]
    );
  }
  if (type === "donations") {
    const rows = await prisma.donation.findMany({
      include: { donor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
    return toCsv(
      rows.map((d) => ({
        id: d.id,
        foodName: d.foodName,
        status: d.status,
        donor: d.donor?.name,
        servings: d.servesCount,
        remaining: d.servingsRemaining,
        address: d.address,
        createdAt: d.createdAt
      })),
      ["id", "foodName", "status", "donor", "servings", "remaining", "address", "createdAt"]
    );
  }
  if (type === "bookings") {
    const rows = await listAdminBookings();
    return toCsv(
      rows.map((b) => ({
        id: b.id,
        food: b.donation?.foodName,
        receiver: b.receiver?.name,
        people: b.peopleToServe,
        status: b.status,
        bookingDateTime: b.bookingDateTime,
        createdAt: b.createdAt
      })),
      ["id", "food", "receiver", "people", "status", "bookingDateTime", "createdAt"]
    );
  }
  throw Object.assign(new Error("Unknown report type"), { status: 400 });
}

export async function getLiveSnapshot() {
  const socketStats = getSocketStats();
  const [recentBookings, recentDonations, recentUsers] = await Promise.all([
    prisma.request.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        receiver: { select: { name: true } },
        donation: { select: { foodName: true, donor: { select: { name: true } } } }
      }
    }),
    prisma.donation.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { donor: { select: { name: true } } }
    }),
    prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, role: true, createdAt: true }
    })
  ]);

  return {
    onlineUsers: socketStats.onlineUsers,
    recentBookings: recentBookings.map(formatBooking),
    recentDonations,
    recentUsers
  };
}

export async function getAdminNotifications() {
  return prisma.notification.findMany({
    where: {
      type: {
        in: [
          "NEW_USER",
          "NEW_DONATION",
          "BOOKING_CREATED",
          "RESERVATION_REQUEST",
          "SYSTEM_ERROR",
          "SECURITY_ALERT"
        ]
      }
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: { name: true, email: true, role: true } } }
  });
}
