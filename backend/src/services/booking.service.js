import { prisma } from "../config/prisma.js";
import { logActivity } from "./activity.service.js";
import { createNotification } from "./notification.service.js";
import { emitEvent } from "../socket.js";
import { adjustServings, canReserve } from "./servings.service.js";
import { sendBookingConfirmationEmail } from "./email.service.js";

export const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "ACCEPTED", "RESERVED"];

const bookingInclude = {
  donation: { include: { donor: { select: { id: true, name: true, phone: true, email: true } } } },
  receiver: { select: { id: true, name: true, phone: true, email: true } }
};

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
  return {
    ...record,
    peopleToServe: record.peopleToServe ?? record.servingsReserved,
    bookingDateTime: record.bookingDateTime || record.pickupSlot || record.createdAt,
    statusLabel: toBookingLabel(record.status)
  };
}

export async function getDonationFull(id) {
  return prisma.donation.findUnique({
    where: { id },
    include: { donor: true }
  });
}

export async function createBooking(payload) {
  const user = payload.user;
  const receiverId = payload.receiverId ?? user?.id;
  const receiverName = payload.receiverName ?? user?.name;
  if (!receiverId) throw Object.assign(new Error("Receiver required"), { status: 400 });

  const amount = Math.max(1, Number(payload.peopleToServe) || 1);
  const donation = await getDonationFull(Number(payload.donationId));
  if (!donation || !canReserve(donation, amount)) {
    throw Object.assign(new Error("Not enough food available or listing is inactive"), { status: 400 });
  }

  const existing = await prisma.request.findFirst({
    where: {
      donationId: Number(payload.donationId),
      receiverId,
      status: { in: ACTIVE_BOOKING_STATUSES }
    }
  });
  if (existing) {
    throw Object.assign(new Error("You already have an active booking for this food"), { status: 409 });
  }

  const when = payload.bookingDateTime
    ? new Date(payload.bookingDateTime)
    : payload.pickupSlot
      ? new Date(payload.pickupSlot)
      : new Date();
  if (Number.isNaN(when.getTime())) {
    throw Object.assign(new Error("Invalid booking date/time"), { status: 400 });
  }

  const { donation: donationAfterHold } = await adjustServings(donation.id, -amount, "booking_hold");

  const booking = await prisma.request.create({
    data: {
      donationId: Number(payload.donationId),
      receiverId,
      peopleToServe: amount,
      servingsReserved: amount,
      bookingDateTime: when,
      pickupSlot: payload.pickupSlot ? new Date(payload.pickupSlot) : when,
      message: payload.message?.trim() || null,
      status: "PENDING"
    },
    include: bookingInclude
  });

  await prisma.donation.update({
    where: { id: donation.id },
    data: { status: donationAfterHold.servingsRemaining <= 0 ? "RESERVED" : "REQUESTED" }
  });

  await logActivity({
    userId: receiverId,
    action: "BOOKING_CREATED",
    entityType: "Booking",
    entityId: booking.id,
    newValue: { peopleToServe: amount, donationId: donation.id }
  });

  await createNotification({
    userId: donation.donorId,
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

  if (user?.email) {
    sendBookingConfirmationEmail(user.email, {
      foodName: donation.foodName,
      status: "Pending",
      bookingDateTime: when,
      address: donation.address
    }).catch(() => {});
  }

  return formatBooking(booking);
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

async function getBookingForDonor(bookingId, donorId) {
  const booking = await prisma.request.findUnique({
    where: { id: Number(bookingId) },
    include: { donation: true, receiver: true }
  });
  if (!booking || booking.donation.donorId !== donorId) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }
  return booking;
}

export async function releaseBookingServings(booking) {
  if (ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    await adjustServings(booking.donationId, booking.servingsReserved, "booking_release");
  }
}

export async function confirmBooking(bookingId, userOrDonorId) {
  const donorId = typeof userOrDonorId === "object" ? userOrDonorId.id : userOrDonorId;
  const booking = await getBookingForDonor(bookingId, donorId);
  if (booking.status !== "PENDING") {
    throw Object.assign(new Error("Only pending bookings can be confirmed"), { status: 400 });
  }

  const updated = await prisma.request.update({
    where: { id: booking.id },
    data: { status: "CONFIRMED" },
    include: bookingInclude
  });

  await createNotification({
    userId: booking.receiverId,
    type: "BOOKING_CONFIRMED",
    title: "Booking confirmed",
    message: `Your booking for "${booking.donation.foodName}" was confirmed.`,
    meta: { bookingId: booking.id }
  });
  await logActivity({ userId: donorId, action: "BOOKING_CONFIRMED", entityType: "Booking", entityId: booking.id });
  emitEvent("request:updated", updated);
  emitEvent("booking:updated", updated);
  emitEvent("donation:updated", await getDonationFull(booking.donationId));

  if (booking.receiver?.email) {
    sendBookingConfirmationEmail(booking.receiver.email, {
      foodName: booking.donation.foodName,
      status: "Confirmed",
      bookingDateTime: updated.bookingDateTime,
      address: booking.donation.address
    }).catch(() => {});
  }

  return formatBooking(updated);
}

export async function rejectBooking(bookingId, userOrDonorId) {
  const donorId = typeof userOrDonorId === "object" ? userOrDonorId.id : userOrDonorId;
  const booking = await getBookingForDonor(bookingId, donorId);
  await releaseBookingServings(booking);
  const updated = await prisma.request.update({
    where: { id: booking.id },
    data: { status: "REJECTED" },
    include: bookingInclude
  });
  await createNotification({
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
  return formatBooking(updated);
}

export async function cancelBooking(bookingId, userOrId) {
  const userId = typeof userOrId === "object" ? userOrId.id : userOrId;
  const booking = await prisma.request.findUnique({
    where: { id: Number(bookingId) },
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
  return formatBooking(updated);
}

export async function completeBooking(bookingId, userOrId) {
  const userId = typeof userOrId === "object" ? userOrId.id : userOrId;
  const booking = await prisma.request.findUnique({
    where: { id: Number(bookingId) },
    include: { donation: true, receiver: true }
  });
  if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });
  const allowed = booking.receiverId === userId || booking.donation.donorId === userId;
  if (!allowed) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const updated = await prisma.request.update({
    where: { id: booking.id },
    data: { status: "COMPLETED" },
    include: bookingInclude
  });
  const donation = await prisma.donation.update({
    where: { id: booking.donationId },
    data: { status: "COMPLETED" }
  });
  await createNotification({
    userId: booking.receiverId,
    type: "BOOKING_COMPLETED",
    title: "Pickup completed",
    message: `Booking for "${booking.donation.foodName}" is complete.`,
    meta: { bookingId: booking.id }
  });
  await createNotification({
    userId: booking.donation.donorId,
    type: "BOOKING_COMPLETED",
    title: "Donation completed",
    message: `${booking.receiver.name} completed pickup.`,
    meta: { bookingId: booking.id }
  });
  await logActivity({ userId, action: "BOOKING_COMPLETED", entityType: "Booking", entityId: booking.id });
  emitEvent("request:updated", updated);
  emitEvent("booking:updated", updated);
  emitEvent("donation:updated", donation);
  return formatBooking(updated);
}

export async function getDonorBookingStats(donorId) {
  const donations = await prisma.donation.findMany({
    where: { donorId, status: { not: "DELETED" } },
    select: { id: true, servingsRemaining: true }
  });
  const donationIds = donations.map((d) => d.id);
  const bookings = await prisma.request.findMany({ where: { donationId: { in: donationIds } } });

  return {
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === "PENDING").length,
    confirmedBookings: bookings.filter((b) => ["CONFIRMED", "ACCEPTED", "RESERVED"].includes(b.status)).length,
    completedBookings: bookings.filter((b) => b.status === "COMPLETED").length,
    peopleServed: bookings
      .filter((b) => b.status === "COMPLETED")
      .reduce((s, b) => s + (b.peopleToServe || b.servingsReserved), 0),
    remainingServings: donations.reduce((s, d) => s + d.servingsRemaining, 0)
  };
}
