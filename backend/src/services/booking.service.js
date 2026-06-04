import { prisma } from "../config/prisma.js";
import { logActivity } from "./activity.service.js";
import { createNotification } from "./notification.service.js";
import { emitEvent } from "../socket.js";
import { adjustServings, canReserve } from "./servings.service.js";

<<<<<<< HEAD
const ACTIVE_BOOKING_STATUSES = ["PENDING", "ACCEPTED", "RESERVED", "CONFIRMED"];

/** User-facing booking status labels */
export function toBookingLabel(status) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "ACCEPTED":
    case "RESERVED":
    case "CONFIRMED":
      return "Confirmed";
    case "COMPLETED":
      return "Completed";
    case "REJECTED":
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export function formatBooking(record) {
  if (!record) return null;
  const bookingDateTime = record.bookingDateTime || record.pickupSlot || record.createdAt;
  return {
    id: record.id,
    userId: record.receiverId,
    donationId: record.donationId,
    peopleToServe: record.servingsReserved,
    servingsReserved: record.servingsReserved,
    bookingDateTime,
    pickupSlot: record.pickupSlot,
    message: record.message,
    status: toBookingLabel(record.status),
    internalStatus: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    receiver: record.receiver,
    donation: record.donation
  };
}
=======
export const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "ACCEPTED", "RESERVED"];
>>>>>>> ffc4eea (kkr)

const bookingInclude = {
  donation: { include: { donor: { select: { id: true, name: true, phone: true, email: true } } } },
  receiver: { select: { id: true, name: true, phone: true, email: true } }
};

<<<<<<< HEAD
async function getDonationFull(id) {
=======
export async function getDonationFull(id) {
>>>>>>> ffc4eea (kkr)
  return prisma.donation.findUnique({
    where: { id },
    include: { donor: true }
  });
}

<<<<<<< HEAD
export async function createBooking({ user, donationId, peopleToServe, bookingDateTime, message }) {
  const amount = Math.max(1, Number(peopleToServe) || 1);
  const donation = await getDonationFull(Number(donationId));

  if (!donation || !canReserve(donation, amount)) {
    const err = new Error("Not enough food available or donation is unavailable");
    err.status = 400;
    throw err;
=======
export async function createBooking({ donationId, receiverId, receiverName, peopleToServe, bookingDateTime, pickupSlot, message }) {
  const amount = Math.max(1, Number(peopleToServe) || 1);
  const donation = await getDonationFull(Number(donationId));
  if (!donation || !canReserve(donation, amount)) {
    throw Object.assign(new Error("Not enough food available or listing is inactive"), { status: 400 });
>>>>>>> ffc4eea (kkr)
  }

  const existing = await prisma.request.findFirst({
    where: {
      donationId: Number(donationId),
<<<<<<< HEAD
      receiverId: user.id,
=======
      receiverId,
>>>>>>> ffc4eea (kkr)
      status: { in: ACTIVE_BOOKING_STATUSES }
    }
  });
  if (existing) {
<<<<<<< HEAD
    const err = new Error("You already have an active booking for this donation");
    err.status = 409;
    throw err;
  }

  const when = bookingDateTime ? new Date(bookingDateTime) : null;
  if (when && Number.isNaN(when.getTime())) {
    const err = new Error("Invalid booking date/time");
    err.status = 400;
    throw err;
=======
    throw Object.assign(new Error("You already have an active booking for this food"), { status: 409 });
  }

  const when = bookingDateTime ? new Date(bookingDateTime) : pickupSlot ? new Date(pickupSlot) : new Date();
  if (Number.isNaN(when.getTime())) {
    throw Object.assign(new Error("Invalid booking date/time"), { status: 400 });
>>>>>>> ffc4eea (kkr)
  }

  const { donation: donationAfterHold } = await adjustServings(donation.id, -amount, "booking_hold");

<<<<<<< HEAD
  const record = await prisma.request.create({
    data: {
      donationId: Number(donationId),
      receiverId: user.id,
      servingsReserved: amount,
      bookingDateTime: when,
      pickupSlot: when,
      message: message || null,
=======
  const booking = await prisma.request.create({
    data: {
      donationId: Number(donationId),
      receiverId,
      peopleToServe: amount,
      servingsReserved: amount,
      bookingDateTime: when,
      pickupSlot: pickupSlot ? new Date(pickupSlot) : when,
      message: message?.trim() || null,
>>>>>>> ffc4eea (kkr)
      status: "PENDING"
    },
    include: bookingInclude
  });

  await prisma.donation.update({
    where: { id: donation.id },
    data: { status: donationAfterHold.servingsRemaining <= 0 ? "RESERVED" : "REQUESTED" }
  });

  await logActivity({
<<<<<<< HEAD
    userId: user.id,
    action: "BOOKING_CREATED",
    entityType: "Booking",
    entityId: record.id,
    newValue: { peopleToServe: amount, donationId: donation.id }
=======
    userId: receiverId,
    action: "BOOKING_CREATED",
    entityType: "Booking",
    entityId: booking.id,
    newValue: { peopleToServe: amount, donationId: donation.id, bookingDateTime: when }
>>>>>>> ffc4eea (kkr)
  });

  await createNotification({
    userId: donation.donorId,
<<<<<<< HEAD
    type: "BOOKING_CREATED",
    title: "New food booking",
    message: `${user.name} booked ${amount} servings of "${donation.foodName}"`,
    meta: { bookingId: record.id, donationId: donation.id }
  });

  await createNotification({
    userId: user.id,
    type: "BOOKING_SUBMITTED",
    title: "Booking submitted",
    message: `Your booking for "${donation.foodName}" is pending donor confirmation.`,
    meta: { bookingId: record.id }
  });

  const refreshedDonation = await getDonationFull(donation.id);
  const booking = formatBooking(record);

  emitEvent("booking:created", booking);
  emitEvent("request:created", record);
  emitEvent("donation:updated", refreshedDonation);

  return booking;
}

export async function listBookingsForUser(user) {
  const where =
    user.role === "RECEIVER"
      ? { receiverId: user.id }
      : user.role === "DONOR"
        ? { donation: { donorId: user.id } }
        : {};

  const rows = await prisma.request.findMany({
    where,
    include: bookingInclude,
    orderBy: { createdAt: "desc" }
  });
  return rows.map(formatBooking);
}

async function getBookingForAction(bookingId, user, { donorOnly = false, participant = false } = {}) {
  const record = await prisma.request.findUnique({
    where: { id: Number(bookingId) },
    include: { donation: true, receiver: true }
  });
  if (!record) {
    const err = new Error("Booking not found");
    err.status = 404;
    throw err;
  }
  if (donorOnly && record.donation.donorId !== user.id) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  if (participant) {
    const allowed = record.receiverId === user.id || record.donation.donorId === user.id;
    if (!allowed) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
  }
  return record;
}

async function releaseServings(record) {
  if (ACTIVE_BOOKING_STATUSES.includes(record.status)) {
    await adjustServings(record.donationId, record.servingsReserved, "booking_release");
  }
}

export async function confirmBooking(bookingId, user) {
  const record = await getBookingForAction(bookingId, user, { donorOnly: true });
  if (record.status !== "PENDING") {
    const err = new Error("Only pending bookings can be confirmed");
    err.status = 400;
    throw err;
  }

  const updated = await prisma.request.update({
    where: { id: record.id },
=======
    type: "BOOKING_REQUEST",
    title: "New food booking",
    message: `${receiverName} booked ${amount} serving(s) of "${donation.foodName}"`,
    meta: { bookingId: booking.id, donationId: donation.id }
  });

  await createNotification({
    userId: receiverId,
    type: "BOOKING_PENDING",
    title: "Booking submitted",
    message: `Your booking for "${donation.foodName}" is pending donor confirmation.`,
    meta: { bookingId: booking.id }
  });

  const refreshedDonation = await getDonationFull(donation.id);
  emitEvent("request:created", booking);
  emitEvent("booking:created", booking);
  emitEvent("donation:updated", refreshedDonation);
  return booking;
}

export async function releaseBookingServings(booking) {
  if (ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    await adjustServings(booking.donationId, booking.servingsReserved, "booking_release");
  }
}

export async function confirmBooking(bookingId, donorId) {
  const booking = await prisma.request.findUnique({
    where: { id: bookingId },
    include: { donation: true, receiver: true }
  });
  if (!booking || booking.donation.donorId !== donorId) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }
  if (booking.status !== "PENDING") {
    throw Object.assign(new Error("Only pending bookings can be confirmed"), { status: 400 });
  }

  const updated = await prisma.request.update({
    where: { id: booking.id },
>>>>>>> ffc4eea (kkr)
    data: { status: "CONFIRMED" },
    include: bookingInclude
  });

  await createNotification({
<<<<<<< HEAD
    userId: record.receiverId,
    type: "BOOKING_CONFIRMED",
    title: "Booking confirmed",
    message: `Your booking for "${record.donation.foodName}" was confirmed by the donor.`,
    meta: { bookingId: record.id }
  });

  await logActivity({ userId: user.id, action: "BOOKING_CONFIRMED", entityType: "Booking", entityId: record.id });
  const booking = formatBooking(updated);
  emitEvent("booking:updated", booking);
  emitEvent("request:updated", updated);
  emitEvent("donation:updated", await getDonationFull(record.donationId));
  return booking;
}

export async function rejectBooking(bookingId, user) {
  const record = await getBookingForAction(bookingId, user, { donorOnly: true });
  if (!["PENDING", "CONFIRMED"].includes(record.status)) {
    const err = new Error("Booking cannot be rejected in its current state");
    err.status = 400;
    throw err;
  }

  await releaseServings(record);
  const updated = await prisma.request.update({
    where: { id: record.id },
    data: { status: "CANCELLED" },
=======
    userId: booking.receiverId,
    type: "BOOKING_CONFIRMED",
    title: "Booking confirmed",
    message: `Your booking for "${booking.donation.foodName}" was confirmed by the donor.`,
    meta: { bookingId: booking.id }
  });

  await logActivity({ userId: donorId, action: "BOOKING_CONFIRMED", entityType: "Booking", entityId: booking.id });
  emitEvent("request:updated", updated);
  emitEvent("booking:updated", updated);
  emitEvent("donation:updated", await getDonationFull(booking.donationId));
  return updated;
}

export async function rejectBooking(bookingId, donorId) {
  const booking = await prisma.request.findUnique({
    where: { id: bookingId },
    include: { donation: true, receiver: true }
  });
  if (!booking || booking.donation.donorId !== donorId) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }

  await releaseBookingServings(booking);
  const updated = await prisma.request.update({
    where: { id: booking.id },
    data: { status: "REJECTED" },
>>>>>>> ffc4eea (kkr)
    include: bookingInclude
  });

  await createNotification({
<<<<<<< HEAD
    userId: record.receiverId,
    type: "BOOKING_CANCELLED",
    title: "Booking declined",
    message: `Your booking for "${record.donation.foodName}" was declined.`,
    meta: { bookingId: record.id }
  });

  await logActivity({ userId: user.id, action: "BOOKING_REJECTED", entityType: "Booking", entityId: record.id });
  const booking = formatBooking(updated);
  emitEvent("booking:updated", booking);
  emitEvent("request:updated", updated);
  emitEvent("donation:updated", await getDonationFull(record.donationId));
  return booking;
}

export async function cancelBooking(bookingId, user) {
  const record = await getBookingForAction(bookingId, user, { participant: true });
  if (!ACTIVE_BOOKING_STATUSES.includes(record.status)) {
    const err = new Error("Booking is already finished");
    err.status = 400;
    throw err;
  }

  await releaseServings(record);
  const updated = await prisma.request.update({
    where: { id: record.id },
    data: { status: "CANCELLED" },
    include: bookingInclude
  });

  const notifyId = user.id === record.receiverId ? record.donation.donorId : record.receiverId;
  await createNotification({
    userId: notifyId,
    type: "BOOKING_CANCELLED",
    title: "Booking cancelled",
    message: `A booking for "${record.donation.foodName}" was cancelled.`,
    meta: { bookingId: record.id }
  });

  await logActivity({ userId: user.id, action: "BOOKING_CANCELLED", entityType: "Booking", entityId: record.id });
  const booking = formatBooking(updated);
  emitEvent("booking:updated", booking);
  emitEvent("request:updated", updated);
  emitEvent("donation:updated", await getDonationFull(record.donationId));
  return booking;
}

export async function completeBooking(bookingId, user) {
  const record = await getBookingForAction(bookingId, user, { participant: true });
  if (!["CONFIRMED", "ACCEPTED", "RESERVED", "PENDING"].includes(record.status)) {
    const err = new Error("Booking cannot be completed");
    err.status = 400;
    throw err;
  }

  const updated = await prisma.request.update({
    where: { id: record.id },
=======
    userId: booking.receiverId,
    type: "BOOKING_REJECTED",
    title: "Booking rejected",
    message: `Your booking for "${booking.donation.foodName}" was declined.`,
    meta: { bookingId: booking.id }
  });

  await logActivity({ userId: donorId, action: "BOOKING_REJECTED", entityType: "Booking", entityId: booking.id });
  emitEvent("request:updated", updated);
  emitEvent("booking:updated", updated);
  emitEvent("donation:updated", await getDonationFull(booking.donationId));
  return updated;
}

export async function completeBooking(bookingId, userId) {
  const booking = await prisma.request.findUnique({
    where: { id: bookingId },
    include: { donation: true, receiver: true }
  });
  if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });
  const allowed = booking.receiverId === userId || booking.donation.donorId === userId;
  if (!allowed) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const updated = await prisma.request.update({
    where: { id: booking.id },
>>>>>>> ffc4eea (kkr)
    data: { status: "COMPLETED" },
    include: bookingInclude
  });

  const donation = await prisma.donation.update({
<<<<<<< HEAD
    where: { id: record.donationId },
=======
    where: { id: booking.donationId },
>>>>>>> ffc4eea (kkr)
    data: { status: "COMPLETED" }
  });

  await createNotification({
<<<<<<< HEAD
    userId: record.receiverId,
    type: "BOOKING_COMPLETED",
    title: "Booking completed",
    message: `Pickup completed for "${record.donation.foodName}".`,
    meta: { bookingId: record.id }
  });
  await createNotification({
    userId: record.donation.donorId,
    type: "BOOKING_COMPLETED",
    title: "Booking completed",
    message: `Booking #${record.id} for "${record.donation.foodName}" is marked complete.`,
    meta: { bookingId: record.id }
  });

  await logActivity({ userId: user.id, action: "BOOKING_COMPLETED", entityType: "Booking", entityId: record.id });
  const booking = formatBooking(updated);
  emitEvent("booking:updated", booking);
  emitEvent("request:updated", updated);
  emitEvent("donation:updated", donation);
  return booking;
}

export async function getDonorBookingStats(donorId) {
  const donations = await prisma.donation.findMany({
    where: { donorId, status: { not: "DELETED" } },
    select: { id: true, servingsRemaining: true, servesCount: true, quantity: true }
  });
  const donationIds = donations.map((d) => d.id);

  const bookings = await prisma.request.findMany({
    where: { donationId: { in: donationIds } },
    include: { receiver: { select: { name: true } }, donation: { select: { foodName: true, quantity: true } } },
    orderBy: { createdAt: "desc" }
  });

  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const confirmed = bookings.filter((b) => ["CONFIRMED", "ACCEPTED", "RESERVED"].includes(b.status)).length;
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;
  const peopleServed = bookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + b.servingsReserved, 0);
  const peopleBooked = bookings
    .filter((b) => ACTIVE_BOOKING_STATUSES.includes(b.status))
    .reduce((sum, b) => sum + b.servingsReserved, 0);
  const remainingServings = donations.reduce((sum, d) => sum + d.servingsRemaining, 0);

  return {
    totalBookings: bookings.length,
    pendingBookings: pending,
    confirmedBookings: confirmed,
    completedBookings: completed,
    peopleServed,
    peopleBooked,
    remainingServings,
    bookingHistory: bookings.map(formatBooking)
  };
=======
    userId: booking.receiverId,
    type: "BOOKING_COMPLETED",
    title: "Pickup completed",
    message: `Booking for "${booking.donation.foodName}" is marked complete.`,
    meta: { bookingId: booking.id }
  });
  await createNotification({
    userId: booking.donation.donorId,
    type: "BOOKING_COMPLETED",
    title: "Donation completed",
    message: `${booking.receiver.name} completed pickup for "${booking.donation.foodName}".`,
    meta: { bookingId: booking.id }
  });

  await logActivity({ userId, action: "BOOKING_COMPLETED", entityType: "Booking", entityId: booking.id });
  emitEvent("request:updated", updated);
  emitEvent("booking:updated", updated);
  emitEvent("donation:updated", donation);
  return updated;
}

export async function cancelBooking(bookingId, userId) {
  const booking = await prisma.request.findUnique({
    where: { id: bookingId },
    include: { donation: true, receiver: true }
  });
  if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });
  const allowed = booking.receiverId === userId || booking.donation.donorId === userId;
  if (!allowed) throw Object.assign(new Error("Forbidden"), { status: 403 });

  await releaseBookingServings(booking);
  const updated = await prisma.request.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
    include: bookingInclude
  });

  const notifyId = booking.receiverId === userId ? booking.donation.donorId : booking.receiverId;
  await createNotification({
    userId: notifyId,
    type: "BOOKING_CANCELLED",
    title: "Booking cancelled",
    message: `A booking for "${booking.donation.foodName}" was cancelled.`,
    meta: { bookingId: booking.id }
  });

  await logActivity({ userId, action: "BOOKING_CANCELLED", entityType: "Booking", entityId: booking.id });
  emitEvent("request:updated", updated);
  emitEvent("booking:updated", updated);
  emitEvent("donation:updated", await getDonationFull(booking.donationId));
  return updated;
>>>>>>> ffc4eea (kkr)
}
