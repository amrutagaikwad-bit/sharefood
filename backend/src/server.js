import "dotenv/config";
import { assertEnv, getAllowedOrigins, getDatabaseHost, logDatabaseConfig } from "./config/env.js";
assertEnv();
logDatabaseConfig();
import http from "http";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import donationRoutes from "./routes/donations.routes.js";
import requestRoutes from "./routes/requests.routes.js";
import bookingRoutes from "./routes/bookings.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import geocodeRoutes from "./routes/geocode.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { metricsMiddleware } from "./middleware/metrics.middleware.js";
import { initSocket, incrementRequestCount } from "./socket.js";
import { startExpiryJob } from "./services/expiry.service.js";
import { logSystemError } from "./services/activity.service.js";
import { prisma } from "./config/prisma.js";

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: getAllowedOrigins(),
  credentials: true
};

initSocket(server, corsOptions.origin);
startExpiryJob();

app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.use(metricsMiddleware);
app.use((req, res, next) => {
  incrementRequestCount();
  next();
});

app.get("/", (_, res) => {
  res.json({
    service: "FoodBridge API",
    status: "running",
    health: "/api/health/public",
    frontend: "https://foodbridgeplatform.netlify.app"
  });
});

app.get("/api", (_, res) => {
  res.json({
    service: "FoodBridge API",
    version: "1.0",
    endpoints: ["/api/auth", "/api/donations", "/api/bookings", "/api/health/public"]
  });
});

app.get("/api/health/public", async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      ok: true,
      service: "FoodBridge API",
      database: "connected"
    });
  } catch (error) {
    console.error("[health] Database check failed:", error.message);
    return res.status(500).json({
      ok: false,
      service: "FoodBridge API",
      database: "error",
      error: error.message
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use("/api/health", healthRoutes);

app.use((err, req, res, next) => {
  logSystemError(err.message, err.stack, { path: req.path, method: req.method });
  console.error("[api]", req.method, req.path, err.message);
  res.status(500).json({ message: "Internal server error" });
});

app.use((_, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = Number(process.env.PORT) || 5000;

async function verifyDatabaseOnStartup() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    console.log(`Database connected (${getDatabaseHost()}) — ${users} users`);
  } catch (err) {
    console.error(`Database connection FAILED (${getDatabaseHost()}): ${err.message}`);
  }
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use. Stop the other backend:\n` +
        `  cd sharefood && npm run kill-port\n`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`FoodBridge API + Socket.io running on port ${PORT}`);
  console.log(`API: https://foodbridge-54z7.onrender.com`);
  console.log(`Frontend: https://foodbridgeplatform.netlify.app`);
  console.log(`CORS origins: ${getAllowedOrigins().join(", ")}`);
  verifyDatabaseOnStartup();
});
