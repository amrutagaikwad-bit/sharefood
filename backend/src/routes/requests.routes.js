import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authRequired, roleRequired("RECEIVER"), async (req, res) => {
  const { donationId } = req.body;
  if (!donationId) return res.status(400).json({ message: "donationId is required" });

  const donation = await prisma.donation.findUnique({ where: { id: Number(donationId) } });
  if (!donation || donation.status !== "ACTIVE") {
    return res.status(404).json({ message: "Donation not available" });
  }

  const existing = await prisma.request.findFirst({
    where: {
      donationId: Number(donationId),
      receiverId: req.user.id,
      status: { in: ["PENDING", "ACCEPTED"] }
    }
  });
  if (existing) return res.status(409).json({ message: "Request already exists" });

  const request = await prisma.request.create({
    data: { donationId: Number(donationId), receiverId: req.user.id },
    include: {
      donation: { include: { donor: { select: { name: true, phone: true, email: true } } } }
    }
  });
  return res.status(201).json(request);
});

router.get("/mine", authRequired, async (req, res) => {
  if (req.user.role === "RECEIVER") {
    const requests = await prisma.request.findMany({
      where: { receiverId: req.user.id },
      include: { donation: { include: { donor: { select: { name: true, phone: true, email: true } } } } },
      orderBy: { createdAt: "desc" }
    });
    return res.json(requests);
  }

  const requests = await prisma.request.findMany({
    where: { donation: { donorId: req.user.id } },
    include: { receiver: { select: { name: true, email: true, phone: true } }, donation: true },
    orderBy: { createdAt: "desc" }
  });
  return res.json(requests);
});

router.patch("/:id/complete", authRequired, async (req, res) => {
  const request = await prisma.request.findUnique({
    where: { id: Number(req.params.id) },
    include: { donation: true }
  });
  if (!request) return res.status(404).json({ message: "Request not found" });

  const allowed =
    request.receiverId === req.user.id || request.donation.donorId === req.user.id;
  if (!allowed) return res.status(403).json({ message: "Forbidden" });

  const updated = await prisma.request.update({
    where: { id: request.id },
    data: { status: "COMPLETED" }
  });
  return res.json(updated);
});

export default router;

