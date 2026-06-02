import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import donationRoutes from "./routes/donations.routes.js";
import requestRoutes from "./routes/requests.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_, res) => res.json({ ok: true, service: "FoodBridge API" }));

app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((_, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FoodBridge API running on port ${PORT}`);
});

