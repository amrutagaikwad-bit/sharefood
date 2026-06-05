import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import TrackingMap from "../components/TrackingMap";
import { useAuth } from "../context/AuthContext";
import { useLiveTracking } from "../hooks/useLiveTracking";

const TRACKABLE = ["CONFIRMED", "ACCEPTED", "RESERVED", "PENDING"];

export default function LiveTrackingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const trackingEnabled = booking && TRACKABLE.includes(booking.status);

  const { myPosition, peers, gpsError, watching, connected } = useLiveTracking({
    bookingId: id,
    userId: user?.id,
    role: user?.role,
    name: user?.name,
    enabled: trackingEnabled
  });

  useEffect(() => {
    if (!id) return;
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch((err) => setError(err?.response?.data?.message || "Booking not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-4"><div className="skeleton h-96" /></div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!booking) return null;

  const pickupLocation = booking.donation
    ? { lat: booking.donation.latitude, lng: booking.donation.longitude }
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Live pickup tracking</h1>
          <p className="text-sm text-slate-600">{booking.donation?.foodName} — {booking.statusLabel || booking.status}</p>
        </div>
        <Link to="/bookings" className="btn-secondary text-sm">← Back to bookings</Link>
      </div>

      {!connected && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Connecting to live server…</p>
      )}
      {gpsError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{gpsError}</p>
      )}
      {!gpsError && watching && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">GPS active — sharing location every 5 seconds</p>
      )}

      <TrackingMap
        myPosition={myPosition}
        peers={peers}
        pickupLocation={pickupLocation}
        myRole={user?.role}
        myName={user?.name}
      />

      <p className="text-xs text-slate-500">
        Pickup address: {booking.donation?.address}
      </p>
    </div>
  );
}
