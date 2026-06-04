import { useState } from "react";
import { Calendar, Users } from "lucide-react";
import api from "../api/client";

/**
 * Form for receivers to book food from a donation listing.
 */
export default function BookingForm({ donation, onSuccess, onError }) {
  const max = donation?.servingsRemaining ?? 1;
  const [peopleToServe, setPeopleToServe] = useState(1);
  const [bookingDateTime, setBookingDateTime] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const people = Number(peopleToServe);
    if (!people || people < 1 || people > max) {
      onError?.(`Enter 1–${max} people to be served`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/bookings", {
        donationId: donation.id,
        peopleToServe: people,
        bookingDateTime: bookingDateTime || undefined,
        message: message || undefined
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
        <span className="mb-1 flex items-center gap-1"><Users size={14} /> Number of people to be served *</span>
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
        <span className="mb-1 flex items-center gap-1"><Calendar size={14} /> Preferred pickup date & time</span>
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
        {submitting ? "Submitting..." : "Submit booking"}
      </button>
    </form>
  );
}
