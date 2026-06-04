import express from "express";
import { authRequired, roleRequired } from "../middleware/auth.js";
import {
<<<<<<< HEAD
  cancelBooking,
  completeBooking,
  confirmBooking,
  createBooking,
  listBookingsForUser,
  rejectBooking
=======
  createBooking,
  confirmBooking,
  rejectBooking,
  completeBooking,
  cancelBooking,
  ACTIVE_BOOKING_STATUSES
>>>>>>> ffc4eea (kkr)
} from "../services/booking.service.js";

const router = express.Router();

<<<<<<< HEAD
/** Legacy alias — prefer POST /api/bookings */
router.post("/", authRequired, roleRequired("RECEIVER"), async (req, res) => {
  try {
    const booking = await createBooking({
      user: req.user,
      donationId: req.body.donationId,
      peopleToServe: req.body.servingsReserved ?? req.body.peopleToServe ?? 1,
      bookingDateTime: req.body.pickupSlot ?? req.body.bookingDateTime,
=======
router.post("/", authRequired, roleRequired("RECEIVER"), async (req, res) => {
  try {
    const peopleToServe = req.body.peopleToServe ?? req.body.servingsReserved ?? 1;
    const booking = await createBooking({
      donationId: req.body.donationId,
      receiverId: req.user.id,
      receiverName: req.user.name,
      peopleToServe,
      bookingDateTime: req.body.bookingDateTime,
      pickupSlot: req.body.pickupSlot,
>>>>>>> ffc4eea (kkr)
      message: req.body.message
    });
    res.status(201).json(booking);
  } catch (err) {
<<<<<<< HEAD
    res.status(err.status || 500).json({ message: err.message || "Failed to create request" });
=======
    return res.status(err.status || 500).json({ message: err.message || "Booking failed" });
>>>>>>> ffc4eea (kkr)
  }
});

router.get("/mine", authRequired, async (req, res) => {
<<<<<<< HEAD
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
=======
  const include = {
    donation: { include: { donor: { select: { name: true, phone: true, email: true } } } },
    receiver: { select: { id: true, name: true, phone: true, email: true } }
  };
  if (req.user.role === "RECEIVER") {
    return res.json(
      await prisma.request.findMany({
        where: { receiverId: req.user.id },
        include,
        orderBy: { createdAt: "desc" }
      })
    );
  }
  return res.json(
    await prisma.request.findMany({
      where: { donation: { donorId: req.user.id } },
      include,
      orderBy: { createdAt: "desc" }
    })
  );
});

router.get("/:id", authRequired, async (req, res) => {
  const booking = await prisma.request.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      donation: { include: { donor: { select: { id: true, name: true, phone: true, email: true } } } },
      receiver: { select: { id: true, name: true, phone: true, email: true } }
    }
  });
  if (!booking) return res.status(404).json({ message: "Not found" });
  const allowed = booking.receiverId === req.user.id || booking.donation.donorId === req.user.id || req.user.role === "ADMIN";
  if (!allowed) return res.status(403).json({ message: "Forbidden" });
  res.json(booking);
});

const donorOnly = [authRequired, roleRequired("DONOR")];

router.patch("/:id/accept", ...donorOnly, handleConfirm);
router.patch("/:id/confirm", ...donorOnly, handleConfirm);

async function handleConfirm(req, res) {
  try {
    const updated = await confirmBooking(Number(req.params.id), req.user.id);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

router.patch("/:id/reject", ...donorOnly, async (req, res) => {
  try {
    const updated = await rejectBooking(Number(req.params.id), req.user.id);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch("/:id/reserve", ...donorOnly, async (req, res) => {
  try {
    const updated = await confirmBooking(Number(req.params.id), req.user.id);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
>>>>>>> ffc4eea (kkr)
  }
});

router.patch("/:id/cancel", authRequired, async (req, res) => {
  try {
<<<<<<< HEAD
    res.json(await cancelBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to cancel" });
=======
    const updated = await cancelBooking(Number(req.params.id), req.user.id);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
>>>>>>> ffc4eea (kkr)
  }
});

router.patch("/:id/complete", authRequired, async (req, res) => {
  try {
<<<<<<< HEAD
    res.json(await completeBooking(req.params.id, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Failed to complete" });
=======
    const updated = await completeBooking(Number(req.params.id), req.user.id);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
>>>>>>> ffc4eea (kkr)
  }
});

export { ACTIVE_BOOKING_STATUSES };
export default router;
