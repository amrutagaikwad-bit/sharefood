import express from "express";
import os from "os";
import { prisma } from "../config/prisma.js";
import { getSocketStats } from "../socket.js";
import { authRequired } from "../middleware/auth.js";
import { adminRequired } from "../middleware/adminAuth.js";
import { getMetricsSummary } from "../services/metrics.service.js";

const router = express.Router();
const startedAt = Date.now();

router.get("/", authRequired, adminRequired, async (req, res) => {
  let dbStatus = "healthy";
  let dbLatency = 0;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - t0;
  } catch {
    dbStatus = "critical";
  }

  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedPct = ((totalMem - freeMem) / totalMem) * 100;
  const socketStats = getSocketStats();

  const errorCount = await prisma.systemLog.count({ where: { level: "ERROR" } });

  const indicators = {
    server: dbStatus === "healthy" ? "healthy" : "critical",
    database: dbStatus,
    api: "healthy",
    socket: socketStats.connected > 0 ? "healthy" : "warning",
    memory: usedPct > 90 ? "critical" : usedPct > 75 ? "warning" : "healthy"
  };

  const apiMetrics = getMetricsSummary();

  res.json({
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    serverStatus: indicators.server,
    databaseStatus: indicators.database,
    apiStatus: indicators.api,
    socketStatus: indicators.socket,
    websiteUptime: `${Math.floor((Date.now() - startedAt) / 3600000)}h+`,
    dbLatencyMs: dbLatency,
    totalRequests: socketStats.requestCount,
    errorCount,
    activeSessions: socketStats.onlineUsers,
    socketConnections: socketStats.connected,
    cpuUsage: os.loadavg(),
    memory: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      systemUsedPct: Math.round(usedPct)
    },
    indicators,
    apiMetrics
  });
});

export default router;
