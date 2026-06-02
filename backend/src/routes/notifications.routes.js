import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json(notifications);
});

router.patch("/:id/read", authRequired, async (req, res) => {
  const notification = await prisma.notification.updateMany({
    where: { id: Number(req.params.id), userId: req.user.id },
    data: { read: true }
  });
  res.json({ updated: notification.count });
});

router.patch("/read-all", authRequired, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data: { read: true }
  });
  res.json({ message: "All marked as read" });
});

export default router;
