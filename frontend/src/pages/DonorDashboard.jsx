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
  const [requests, setRequests] = useState([]);

  const load = async () => {
    const [dash, mine, reqs] = await Promise.all([
      api.get("/dashboard"),
      api.get("/donations/mine"),
      api.get("/requests/mine")
    ]);
    setData(dash.data);
    setDonations(mine.data);
    setRequests(reqs.data);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("request:created", refresh);
    socket.on("request:updated", refresh);
    socket.on("donation:created", refresh);
    socket.on("donation:updated", refresh);
    socket.on("donation:servings", refresh);
    return () => {
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Donor Command Center
          </h1>
          <p className="text-sm text-slate-600">Manage multiple listings — each with its own location</p>
        </div>
        <Link to="/donate/new" className="btn-primary flex items-center gap-2">
          <PlusCircle size={18} /> Create Food Donation
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: data.total },
          { label: "Active", value: data.active },
          { label: "Completed", value: data.completed },
          { label: "Pending requests", value: data.pendingRequests }
        ].map((s) => (
          <div key={s.label} className="glass text-center">
            <p className="text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="glass">
        <h2 className="text-lg font-semibold">Your donation listings</h2>
        <div className="mt-4 space-y-4">
          {donations.length === 0 && (
            <div className="text-center py-6">
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
                  <button className="btn-secondary text-sm" onClick={() => action(() => api.patch(`/donations/${d.id}/pause`), "Paused")}>
                    <Pause size={14} className="inline" /> Pause
                  </button>
                ) : (
                  <button className="btn-secondary text-sm" onClick={() => action(() => api.patch(`/donations/${d.id}/resume`), "Resumed")}>
                    <Play size={14} className="inline" /> Resume
                  </button>
                )}
                {d.status !== "COMPLETED" && (
                  <button className="btn-primary text-sm" onClick={() => action(() => api.patch(`/donations/${d.id}/complete`), "Completed")}>
                    <CheckCircle size={14} className="inline" /> Complete
                  </button>
                )}
                <button className="btn-secondary text-sm text-red-600" onClick={() => action(() => api.delete(`/donations/${d.id}`), "Deleted")}>
                  <Trash2 size={14} className="inline" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass">
        <h2 className="text-lg font-semibold">Reservation requests</h2>
        <div className="mt-3 space-y-2">
          {requests.filter((r) => r.status === "PENDING").map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700">
              <div>
                <p className="font-medium">{r.receiver?.name} — {r.servingsReserved} servings</p>
                <p className="text-sm">{r.donation?.foodName}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary text-sm" onClick={() => action(() => api.patch(`/requests/${r.id}/accept`), "Accepted")}>Accept</button>
                <button className="btn-secondary text-sm" onClick={() => action(() => api.patch(`/requests/${r.id}/reject`), "Rejected")}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
