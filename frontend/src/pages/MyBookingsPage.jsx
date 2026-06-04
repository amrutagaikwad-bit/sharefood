import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { useSocket } from "../context/SocketContext";

export default function MyBookingsPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const { socket } = useSocket();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/bookings/mine");
      setBookings(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("booking:created", refresh);
    socket.on("booking:updated", refresh);
    return () => {
      socket.off("booking:created", refresh);
      socket.off("booking:updated", refresh);
    };
  }, [socket]);

  const cancel = async (id) => {
    try {
      await api.patch(`/bookings/${id}/cancel`);
      notify("Booking cancelled");
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Cancel failed");
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My bookings</h1>
        <Link to="/map" className="btn-primary text-sm">Find food</Link>
      </div>

      {loading && <div className="skeleton h-32" />}

      {!loading && bookings.length === 0 && (
        <p className="glass text-center text-sm text-slate-600">No bookings yet.</p>
      )}

      <div className="space-y-3">
        {bookings.map((b) => (
          <article key={b.id} className="glass space-y-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-bold">{b.donation?.foodName}</h2>
                <p className="text-sm text-slate-600">{b.donation?.address || b.donation?.donor?.name}</p>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-sm"><strong>People:</strong> {b.peopleToServe}</p>
            <p className="text-sm">
              <strong>Booking time:</strong>{" "}
              {new Date(b.bookingDateTime).toLocaleString()}
            </p>
            {b.message && <p className="text-sm italic">{b.message}</p>}
            <div className="flex flex-wrap gap-2">
              <Link to={`/donations/${b.donationId}`} className="btn-secondary text-sm">View donation</Link>
              {user.role === "RECEIVER" && ["Pending", "Confirmed"].includes(b.status) && (
                <button type="button" className="btn-secondary text-sm text-red-600" onClick={() => cancel(b.id)}>
                  Cancel booking
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
