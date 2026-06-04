import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Edit, Pause, Play, PlusCircle, Trash2, CheckCircle } from "lucide-react";
import api from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { useNotifications } from "../context/NotificationContext";
import { useSocket } from "../context/SocketContext";

export default function DonorDashboard() {
  const { notify } = useNotifications();
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [donations, setDonations] = useState([]);
  const [bookings, setBookings] = useState([]);

  const load = async () => {
    const [dash, mine, bookingList] = await Promise.all([
      api.get("/dashboard"),
      api.get("/donations/mine"),
      api.get("/bookings/mine")
    ]);
    setData(dash.data);
    setDonations(mine.data);
    setBookings(bookingList.data);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("booking:created", refresh);
    socket.on("booking:updated", refresh);
    socket.on("request:created", refresh);
    socket.on("request:updated", refresh);
    socket.on("donation:created", refresh);
    socket.on("donation:updated", refresh);
    socket.on("donation:servings", refresh);
    return () => {
      socket.off("booking:created", refresh);
      socket.off("booking:updated", refresh);
      socket.off("request:created", refresh);
      socket.off("request:updated", refresh);
      socket.off("donation:created", refresh);
      socket.off("donation:updated", refresh);
      socket.off("donation:servings", refresh);
    };
  }, [socket]);

  const action = async (fn, msg) => {
    try {
      await fn();
      notify(msg);
      load();
    } catch (err) {
      notify(err?.response?.data?.message || "Action failed");
    }
  };

  if (!data) return <div className="p-4"><div className="skeleton mx-auto h-40 max-w-6xl" /></div>;

  const stats = data.bookings || {};
  const pending = bookings.filter((b) => b.status === "Pending");
  const confirmed = bookings.filter((b) => b.status === "Confirmed");
  const history = bookings.filter((b) => ["Completed", "Cancelled"].includes(b.status));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Donor Command Center
          </h1>
          <p className="text-sm text-slate-600">Manage donations and food bookings in real time</p>
        </div>
        <Link to="/donate/new" className="btn-primary flex items-center gap-2">
          <PlusCircle size={18} /> Create Food Donation
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total listings", value: data.total },
          { label: "Active listings", value: data.active },
          { label: "Total bookings", value: stats.totalBookings ?? 0 },
          { label: "Pending bookings", value: stats.pendingBookings ?? pending.length },
          { label: "Confirmed", value: stats.confirmedBookings ?? confirmed.length },
          { label: "People served", value: stats.peopleServed ?? 0 },
          { label: "Remaining servings", value: stats.remainingServings ?? "—" },
          { label: "Completed bookings", value: stats.completedBookings ?? 0 }
        ].map((s) => (
          <div key={s.label} className="glass text-center">
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="glass">
        <h2 className="text-lg font-semibold">Pending bookings — confirm or decline</h2>
        <div className="mt-3 space-y-2">
          {pending.length === 0 && <p className="text-sm text-slate-500">No pending bookings.</p>}
          {pending.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700">
              <div>
                <p className="font-medium">{b.receiver?.name} — {b.peopleToServe} people</p>
                <p className="text-sm">{b.donation?.foodName}</p>
                <p className="text-xs text-slate-500">{new Date(b.bookingDateTime).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-primary text-sm" onClick={() => action(() => api.patch(`/bookings/${b.id}/confirm`), "Booking confirmed")}>Accept</button>
                <button type="button" className="btn-secondary text-sm" onClick={() => action(() => api.patch(`/bookings/${b.id}/reject`), "Booking declined")}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass">
        <h2 className="text-lg font-semibold">Confirmed bookings</h2>
        <div className="mt-3 space-y-2">
          {confirmed.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
          {confirmed.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700">
              <div>
                <p className="font-medium">{b.receiver?.name} — {b.peopleToServe} people</p>
                <p className="text-sm">{b.donation?.foodName} · <StatusBadge status={b.status} /></p>
              </div>
              <button type="button" className="btn-primary text-sm" onClick={() => action(() => api.patch(`/bookings/${b.id}/complete`), "Marked completed")}>Mark completed</button>
            </div>
          ))}
        </div>
      </section>

      <section className="glass">
        <h2 className="text-lg font-semibold">Booking history</h2>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {history.length === 0 && <p className="text-sm text-slate-500">No history yet.</p>}
          {history.map((b) => (
            <div key={b.id} className="rounded-xl border p-3 text-sm dark:border-slate-700">
              <p className="font-medium">{b.donation?.foodName} — {b.receiver?.name}</p>
              <p>{b.peopleToServe} people · <StatusBadge status={b.status} /></p>
              <p className="text-xs text-slate-500">{new Date(b.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass">
        <h2 className="text-lg font-semibold">Your donation listings</h2>
        <div className="mt-4 space-y-4">
          {donations.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">No food donations yet.</p>
              <Link to="/donate/new" className="btn-primary mt-3 inline-flex items-center gap-2">
                <PlusCircle size={16} /> Create Food Donation
              </Link>
            </div>
          )}
          {donations.map((d) => (
            <div key={d.id} className="fade-in rounded-2xl border border-green-100/80 p-4 dark:border-slate-700">
              <div className="flex flex-wrap gap-4">
                {d.image && <img src={d.image} alt="" className="h-24 w-24 rounded-xl object-cover" />}
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{d.foodName}</h3>
                    <StatusBadge status={d.status} />
                    {d.isPaused && <StatusBadge status="PAUSED" />}
                  </div>
                  <p className="text-sm">{d.quantity} • {d.category}</p>
                  <p className="text-sm font-medium text-primary">
                    {d.servingsRemaining} / {d.servesCount} servings remaining
                  </p>
                  <p className="text-xs text-slate-500">{d.address}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/donate/edit/${d.id}`} className="btn-secondary flex items-center gap-1 text-sm">
                  <Edit size={14} /> Edit
                </Link>
                {!d.isPaused ? (
                  <button type="button" className="btn-secondary text-sm" onClick={() => action(() => api.patch(`/donations/${d.id}/pause`), "Paused")}>
                    <Pause size={14} className="inline" /> Pause
                  </button>
                ) : (
                  <button type="button" className="btn-secondary text-sm" onClick={() => action(() => api.patch(`/donations/${d.id}/resume`), "Resumed")}>
                    <Play size={14} className="inline" /> Resume
                  </button>
                )}
                {d.status !== "COMPLETED" && (
                  <button type="button" className="btn-primary text-sm" onClick={() => action(() => api.patch(`/donations/${d.id}/complete`), "Completed")}>
                    <CheckCircle size={14} className="inline" /> Complete
                  </button>
                )}
                <button type="button" className="btn-secondary text-sm text-red-600" onClick={() => action(() => api.delete(`/donations/${d.id}`), "Deleted")}>
                  <Trash2 size={14} className="inline" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
