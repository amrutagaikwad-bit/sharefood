import { useState } from "react";
import { Calendar, Users } from "lucide-react";
import api from "../api/client";

/**
 * Book food from a donation listing.
 * Pass `donation` object or `donationId` + `maxServings`.
 */
export default function BookingForm({ donation, donationId, maxServings, onSuccess, onError }) {
  const id = donationId ?? donation?.id;
  const max = maxServings ?? donation?.servingsRemaining ?? 1;
  const [peopleToServe, setPeopleToServe] = useState(1);
  const [bookingDateTime, setBookingDateTime] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const people = Number(peopleToServe);
    if (!people || people < 1 || people > max) {
      onError?.(`Enter 1–${max} people to serve`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/bookings", {
        donationId: Number(id),
        peopleToServe: people,
        bookingDateTime: bookingDateTime || undefined,
        message: message.trim() || undefined
      });
      onSuccess?.(res.data);
    } catch (err) {
      onError?.(err?.response?.data?.message || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4" onSubmit={submit}>
      <h3 className="font-semibold text-primary">Book this food</h3>
      <label className="block text-sm">
        <span className="mb-1 flex items-center gap-1"><Users size={14} /> People to serve *</span>
        <input
          type="number"
          className="input-field"
          min={1}
          max={max}
          required
          value={peopleToServe}
          onChange={(e) => setPeopleToServe(e.target.value)}
        />
        <span className="text-xs text-slate-500">{max} servings available</span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 flex items-center gap-1"><Calendar size={14} /> Preferred pickup time</span>
        <input
          type="datetime-local"
          className="input-field"
          value={bookingDateTime}
          onChange={(e) => setBookingDateTime(e.target.value)}
        />
      </label>
      <textarea
        className="input-field"
        rows={2}
        placeholder="Message to donor (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "Booking…" : "Book food"}
      </button>
    </form>
  );
}
