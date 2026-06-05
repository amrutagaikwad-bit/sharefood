import { Server } from "socket.io";
import { prisma } from "./config/prisma.js";
import { parseUserAgent } from "./utils/userAgent.js";
import {
  updateLocation,
  getBookingLocations,
  removeLocation
} from "./services/location.service.js";

let io = null;
const onlineUsers = new Map();
let totalConnections = 0;
let requestCount = 0;

export function initSocket(httpServer, allowedOrigins = ["http://localhost:5173"]) {
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];
  io = new Server(httpServer, {
    cors: {
      origin: origins.length ? origins : true,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    totalConnections += 1;

    socket.on("presence", async ({ userId, name, role, page, ip, userAgent }) => {
      if (!userId) return;
      const uid = String(userId);
      const parsed = parseUserAgent(userAgent);
      onlineUsers.set(uid, {
        socketId: socket.id,
        name,
        role,
        page: page || "/",
        ip,
        userAgent,
        browser: parsed.browser,
        device: parsed.device,
        connectedAt: Date.now(),
        lastSeenAt: Date.now()
      });

      try {
        const active = await prisma.userSession.findFirst({
          where: { userId: Number(userId), endedAt: null },
          orderBy: { lastSeenAt: "desc" }
        });
        if (active) {
          await prisma.userSession.update({
            where: { id: active.id },
            data: {
              socketId: socket.id,
              currentPage: page || "/",
              lastSeenAt: new Date(),
              ip: ip || active.ip,
              browser: parsed.browser,
              device: parsed.device
            }
          });
        } else {
          await prisma.userSession.create({
            data: {
              userId: Number(userId),
              socketId: socket.id,
              currentPage: page || "/",
              ip: ip || null,
              userAgent: userAgent?.slice(0, 500) || null,
              browser: parsed.browser,
              device: parsed.device
            }
          });
        }
      } catch {
        /* session table may be unavailable during migration */
      }

      broadcastPresence();
    });

    socket.on("pageview", async ({ userId, page }) => {
      if (!userId) return;
      const uid = String(userId);
      const existing = onlineUsers.get(uid);
      if (existing) {
        existing.page = page || "/";
        existing.lastSeenAt = Date.now();
        onlineUsers.set(uid, existing);
      }
      try {
        const session = await prisma.userSession.findFirst({
          where: { userId: Number(userId), endedAt: null },
          orderBy: { lastSeenAt: "desc" }
        });
        if (session) {
          await prisma.userSession.update({
            where: { id: session.id },
            data: { currentPage: page || "/", lastSeenAt: new Date() }
          });
        }
      } catch {
        /* ignore */
      }
      broadcastPresence();
    });

    socket.on("join", (room) => {
      if (room) socket.join(String(room));
    });

    socket.on("location:join", ({ bookingId, userId, role, name }) => {
      if (!bookingId || !userId) return;
      const room = `tracking:${bookingId}`;
      socket.join(room);
      socket.data.trackingBookingId = bookingId;
      socket.data.trackingUserId = userId;
      const existing = getBookingLocations(bookingId);
      socket.emit("location:snapshot", { bookingId, locations: existing });
      io.to(room).emit("location:joined", { bookingId, userId, role, name });
    });

    socket.on("location:update", (payload) => {
      const { bookingId, userId, role, name, latitude, longitude } = payload || {};
      if (!bookingId || !userId || latitude == null || longitude == null) return;
      const entry = updateLocation(bookingId, {
        userId,
        role,
        name,
        latitude,
        longitude,
        timestamp: Date.now()
      });
      const room = `tracking:${bookingId}`;
      io.to(room).emit("location:update", { bookingId, ...entry });
    });

    socket.on("location:leave", ({ bookingId, userId }) => {
      if (!bookingId || !userId) return;
      removeLocation(bookingId, userId);
      const room = `tracking:${bookingId}`;
      socket.leave(room);
      io.to(room).emit("location:left", { bookingId, userId });
    });

    socket.on("disconnect", async () => {
      if (socket.data.trackingBookingId && socket.data.trackingUserId) {
        removeLocation(socket.data.trackingBookingId, socket.data.trackingUserId);
        io.to(`tracking:${socket.data.trackingBookingId}`).emit("location:left", {
          bookingId: socket.data.trackingBookingId,
          userId: socket.data.trackingUserId
        });
      }
      totalConnections = Math.max(0, totalConnections - 1);
      for (const [uid, data] of onlineUsers.entries()) {
        if (data.socketId === socket.id) {
          onlineUsers.delete(uid);
          try {
            const session = await prisma.userSession.findFirst({
              where: { userId: Number(uid), endedAt: null },
              orderBy: { lastSeenAt: "desc" }
            });
            if (session) {
              await prisma.userSession.update({
                where: { id: session.id },
                data: { endedAt: new Date() }
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
      broadcastPresence();
    });
  });

  return io;
}

function broadcastPresence() {
  emitEvent("presence:update", {
    onlineCount: onlineUsers.size,
    users: getOnlineUsersList()
  });
}

export function getOnlineUsersList() {
  const now = Date.now();
  return Array.from(onlineUsers.entries()).map(([id, v]) => ({
    userId: Number(id),
    name: v.name,
    role: v.role,
    currentPage: v.page,
    ip: v.ip,
    browser: v.browser,
    device: v.device,
    sessionDurationSec: Math.floor((now - (v.connectedAt || now)) / 1000),
    lastSeenAt: v.lastSeenAt
  }));
}

export function getIO() {
  return io;
}

export function incrementRequestCount() {
  requestCount += 1;
}

export function getSocketStats() {
  return {
    connected: io?.engine?.clientsCount ?? 0,
    onlineUsers: onlineUsers.size,
    totalConnections,
    requestCount,
    users: getOnlineUsersList()
  };
}

export function emitEvent(event, payload, room) {
  if (!io) return;
  if (room) io.to(String(room)).emit(event, payload);
  else io.emit(event, payload);
}
