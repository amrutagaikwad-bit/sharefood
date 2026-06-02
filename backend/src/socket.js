import { Server } from "socket.io";

let io = null;
const onlineUsers = new Map();
let totalConnections = 0;
let requestCount = 0;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.on("connection", (socket) => {
    totalConnections += 1;

    socket.on("presence", ({ userId, name, role }) => {
      if (userId) {
        onlineUsers.set(String(userId), { socketId: socket.id, name, role, at: Date.now() });
        emitEvent("presence:update", { onlineCount: onlineUsers.size, users: getOnlineUsersList() });
      }
    });

    socket.on("join", (room) => {
      if (room) socket.join(String(room));
    });

    socket.on("disconnect", () => {
      totalConnections = Math.max(0, totalConnections - 1);
      for (const [uid, data] of onlineUsers.entries()) {
        if (data.socketId === socket.id) onlineUsers.delete(uid);
      }
      emitEvent("presence:update", { onlineCount: onlineUsers.size, users: getOnlineUsersList() });
    });
  });

  return io;
}

function getOnlineUsersList() {
  return Array.from(onlineUsers.entries()).map(([id, v]) => ({
    userId: Number(id),
    name: v.name,
    role: v.role
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
    requestCount
  };
}

export function emitEvent(event, payload, room) {
  if (!io) return;
  if (room) io.to(String(room)).emit(event, payload);
  else io.emit(event, payload);
}
