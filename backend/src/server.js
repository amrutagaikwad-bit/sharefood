import "dotenv/config";
import { assertEnv } from "./config/env.js";
assertEnv();
import http from "http";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import donationRoutes from "./routes/donations.routes.js";
import requestRoutes from "./routes/requests.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import geocodeRoutes from "./routes/geocode.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { initSocket, incrementRequestCount } from "./socket.js";
import { startExpiryJob } from "./services/expiry.service.js";
import { logSystemError } from "./services/activity.service.js";

const app = express();
const server = http.createServer(app);

initSocket(server);
startExpiryJob();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.use((req, res, next) => {
  incrementRequestCount();
  next();
});

app.get("/api/health/public", (_, res) => res.json({ ok: true, service: "FoodBridge API" }));

app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use("/api/health", healthRoutes);

app.use((err, req, res, next) => {
  logSystemError(err.message, err.stack, { path: req.path, method: req.method });
  res.status(500).json({ message: "Internal server error" });
});

app.use((_, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`FoodBridge API + Socket.io running on port ${PORT}`);
});
