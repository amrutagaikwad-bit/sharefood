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

/** Create a food booking (receiver only) */
router.post("/", authRequired, roleRequired("RECEIVER"), async (req, res) => {
  try {
    const { donationId, peopleToServe, bookingDateTime, message } = req.body;
    if (!donationId) {
      return res.status(400).json({ message: "donationId is required" });
    }
    const people = Number(peopleToServe ?? req.body.servingsReserved);
    if (!people || people < 1) {
      return res.status(400).json({ message: "peopleToServe must be at least 1" });
    }

    const booking = await createBooking({
      user: req.user,
      donationId,
      peopleToServe: people,
      bookingDateTime,
      message
    });
    return res.status(201).json(booking);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Failed to create booking" });
  }
});

/** List bookings for current user (receiver: own, donor: on their donations) */
router.get("/mine", authRequired, async (req, res) => {
  try {
    const bookings = await listBookingsForUser(req.user);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to load bookings" });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  try {
    const bookings = await listBookingsForUser(req.user);
    const booking = bookings.find((b) => b.id === Number(req.params.id));
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch {
    res.status(500).json({ message: "Failed to load booking" });
  }
});

router.patch("/:id/confirm", authRequired, roleRequired("DONOR"), async (req, res) => {
  try {
    const booking = await confirmBooking(req.params.id, req.user);
    res.json(booking);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to confirm booking" });
  }
});

router.patch("/:id/reject", authRequired, roleRequired("DONOR"), async (req, res) => {
  try {
    const booking = await rejectBooking(req.params.id, req.user);
    res.json(booking);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to reject booking" });
  }
});

router.patch("/:id/cancel", authRequired, async (req, res) => {
  try {
    const booking = await cancelBooking(req.params.id, req.user);
    res.json(booking);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to cancel booking" });
  }
});

router.patch("/:id/complete", authRequired, async (req, res) => {
  try {
    const booking = await completeBooking(req.params.id, req.user);
    res.json(booking);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to complete booking" });
  }
});

export default router;
