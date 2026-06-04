import express from "express";
import { prisma } from "../config/prisma.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import {
  createBooking,
  confirmBooking,
  rejectBooking,
  completeBooking,
  cancelBooking,
  listBookingsForUser,
  ACTIVE_BOOKING_STATUSES
} from "../services/booking.service.js";

const router = express.Router();

router.post("/", authRequired, roleRequired("RECEIVER"), async (req, res) => {
  try {
    const booking = await createBooking({
      user: req.user,
      donationId: req.body.donationId,
      peopleToServe: req.body.peopleToServe ?? req.body.servingsReserved ?? 1,
      bookingDateTime: req.body.bookingDateTime ?? req.body.pickupSlot,
      pickupSlot: req.body.pickupSlot,
      message: req.body.message
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Booking failed" });
  }
});

router.get("/mine", authRequired, async (req, res) => {
  try {
    res.json(await listBookingsForUser(req.user));
  } catch {
    res.status(500).json({ message: "Failed to load bookings" });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  const bookings = await listBookingsForUser(req.user);
  const booking = bookings.find((b) => b.id === Number(req.params.id));
  if (!booking) return res.status(404).json({ message: "Not found" });
  res.json(booking);
});

const donorOnly = [authRequired, roleRequired("DONOR")];

async function handleConfirm(req, res) {
  try {
    res.json(await confirmBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

router.patch("/:id/accept", ...donorOnly, handleConfirm);
router.patch("/:id/confirm", ...donorOnly, handleConfirm);
router.patch("/:id/reserve", ...donorOnly, handleConfirm);

router.patch("/:id/reject", ...donorOnly, async (req, res) => {
  try {
    res.json(await rejectBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch("/:id/cancel", authRequired, async (req, res) => {
  try {
    res.json(await cancelBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch("/:id/complete", authRequired, async (req, res) => {
  try {
    res.json(await completeBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

export { ACTIVE_BOOKING_STATUSES };
export default router;
