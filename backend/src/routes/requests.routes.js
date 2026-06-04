import express from "express";
import { authRequired, roleRequired } from "../middleware/auth.js";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  createBooking,
  listBookingsForUser,
  rejectBooking
} from "../services/booking.service.js";

const router = express.Router();

/** Legacy alias — prefer POST /api/bookings */
router.post("/", authRequired, roleRequired("RECEIVER"), async (req, res) => {
  try {
    const booking = await createBooking({
      user: req.user,
      donationId: req.body.donationId,
      peopleToServe: req.body.servingsReserved ?? req.body.peopleToServe ?? 1,
      bookingDateTime: req.body.pickupSlot ?? req.body.bookingDateTime,
      message: req.body.message
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to create request" });
  }
});

router.get("/mine", authRequired, async (req, res) => {
  try {
    res.json(await listBookingsForUser(req.user));
  } catch {
    res.status(500).json({ message: "Failed to load requests" });
  }
});

router.patch("/:id/accept", authRequired, roleRequired("DONOR"), async (req, res) => {
  try {
    res.json(await confirmBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to accept" });
  }
});

router.patch("/:id/reject", authRequired, roleRequired("DONOR"), async (req, res) => {
  try {
    res.json(await rejectBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to reject" });
  }
});

router.patch("/:id/reserve", authRequired, roleRequired("DONOR"), async (req, res) => {
  try {
    res.json(await confirmBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to reserve" });
  }
});

router.patch("/:id/cancel", authRequired, async (req, res) => {
  try {
    res.json(await cancelBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to cancel" });
  }
});

router.patch("/:id/complete", authRequired, async (req, res) => {
  try {
    res.json(await completeBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to complete" });
  }
});

export default router;
