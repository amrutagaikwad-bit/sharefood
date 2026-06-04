import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import api from "../api/client";
import MapView from "../components/MapView";
import StatusBadge from "../components/StatusBadge";
import { useSocket } from "../context/SocketContext";

function HealthDot({ status }) {
  const colors = { healthy: "bg-green-500", warning: "bg-amber-500", critical: "bg-red-500" };
  return <span className={`inline-block h-3 w-3 rounded-full ${colors[status] || colors.warning}`} />;
}

export default function AdminDashboard() {
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState({ activity: [], system: [] });
  const [liveFeed, setLiveFeed] = useState([]);
  const [tab, setTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");
  const [requests, setRequests] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [trends, setTrends] = useState([]);

  const load = async () => {
    const [dash, u, d, h, l] = await Promise.all([
      api.get("/admin/dashboard"),
      api.get("/admin/users", { params: { q: userSearch } }),
      api.get("/admin/donations"),
      api.get("/health"),
      api.get("/admin/logs")
    ]);
    setData(dash.data);
    setUsers(u.data);
    setDonations(d.data);
    setHealth(h.data);
    setLogs(l.data);
    setLiveFeed(dash.data.recentActivity || []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (tab === "users") api.get("/admin/users", { params: { q: userSearch } }).then((r) => setUsers(r.data));
    if (tab === "requests") api.get("/admin/requests").then((r) => setRequests(r.data));
    if (tab === "notifications") api.get("/admin/notifications").then((r) => setAdminNotifications(r.data));
    if (tab === "overview") api.get("/admin/analytics/trends").then((r) => setTrends(r.data.dailyDonations || []));
  }, [userSearch, tab]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    const onActivity = (log) => setLiveFeed((prev) => [log, ...prev].slice(0, 40));
    socket.on("donation:created", refresh);
    socket.on("donation:updated", refresh);
    socket.on("donation:servings", refresh);
    socket.on("request:created", refresh);
    socket.on("activity:new", onActivity);
    socket.on("system:error", onActivity);
    socket.on("presence:update", refresh);
    return () => {
      socket.off("donation:created", refresh);
      socket.off("donation:updated", refresh);
      socket.off("donation:servings", refresh);
      socket.off("request:created", refresh);
      socket.off("activity:new", onActivity);
      socket.off("system:error", onActivity);
      socket.off("presence:update", refresh);
    };
  }, [socket]);

  const blockUser = (id) => api.patch(`/admin/users/${id}/block`).then(load);
  const restoreUser = (id) => api.patch(`/admin/users/${id}/restore`).then(load);
  const hideDonation = (id) => api.patch(`/admin/donations/${id}/hide`).then(load);
  const restoreDonation = (id) => api.patch(`/admin/donations/${id}/restore`).then(load);
  const deleteDonation = (id) => api.delete(`/admin/donations/${id}`).then(load);

  if (!data) return <div className="p-4"><div className="skeleton mx-auto h-48 max-w-7xl" /></div>;

  const chartData = (data.analytics?.topDonors || []).map((d) => ({ name: d.name, donations: d.count }));
  const tabs = ["overview", "users", "donations", "requests", "notifications", "map", "logs", "health"];

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <h1 className="text-3xl font-bold">Admin Control Center</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} type="button" className={tab === t ? "btn-primary capitalize" : "btn-secondary capitalize"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total users", data.users.totalUsers],
              ["Online now", data.users.onlineUsers],
              ["Active donations", data.donations.activeDonations],
              ["Meals available", data.analytics.mealsAvailable],
              ["Meals distributed", data.analytics.mealsDistributed],
              ["Food waste prevented (kg)", data.analytics.foodWastePreventedKg?.toFixed?.(1)],
              ["Pending requests", data.requests.pendingRequests],
              ["System errors", data.systemErrors]
            ].map(([label, value]) => (
              <div key={label} className="glass">
                <p className="text-2xl font-bold text-primary">{value}</p>
                <p className="text-sm text-slate-600">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass h-72">
              <h3 className="mb-2 font-semibold">Top donors</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="donations" fill="#2E7D32" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass max-h-72 overflow-y-auto">
              <h3 className="mb-2 font-semibold">Live activity feed</h3>
              {liveFeed.map((log) => (
                <div key={log.id} className="border-b border-green-100 py-2 text-sm dark:border-slate-700">
                  <strong>{log.action}</strong> — {log.user?.name || "System"}
                  <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "users" && (
        <div className="glass space-y-3">
          <input className="input-field max-w-md" placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700">
              <div>
                <p className="font-medium">{u.name} — {u.role}</p>
                <p className="text-sm text-slate-500">{u.email}</p>
              </div>
              <div className="flex gap-2">
                {u.isBlocked ? (
                  <button type="button" className="btn-secondary text-sm" onClick={() => restoreUser(u.id)}>Restore</button>
                ) : (
                  <button type="button" className="btn-secondary text-sm" onClick={() => blockUser(u.id)}>Suspend</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "donations" && (
        <div className="glass space-y-2">
          {donations.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700">
              <div>
                <p className="font-medium">{d.foodName} — {d.servingsRemaining}/{d.servesCount} left</p>
                <StatusBadge status={d.status} />
                {d.isHidden && <span className="ml-2 text-xs text-red-600">Hidden</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {d.isHidden ? (
                  <button type="button" className="btn-primary text-sm" onClick={() => restoreDonation(d.id)}>Restore</button>
                ) : (
                  <button type="button" className="btn-secondary text-sm" onClick={() => hideDonation(d.id)}>Hide</button>
                )}
                <button type="button" className="btn-secondary text-sm" onClick={() => deleteDonation(d.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "map" && <MapView donations={donations} showRanges={false} />}

      {tab === "logs" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass max-h-[32rem] overflow-y-auto">
            <h3 className="font-semibold">Audit trail</h3>
            {logs.activity?.map((log) => (
              <div key={log.id} className="border-b py-2 text-sm dark:border-slate-700">
                <p><strong>{log.action}</strong> by {log.user?.name || "—"}</p>
                {log.previousValue && <p className="text-xs text-red-600">Before: {log.previousValue.slice(0, 80)}...</p>}
                {log.newValue && <p className="text-xs text-green-700">After: {log.newValue.slice(0, 80)}...</p>}
                <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="glass max-h-[32rem] overflow-y-auto">
            <h3 className="font-semibold">System errors</h3>
            {logs.system?.map((log) => (
              <div key={log.id} className="border-b py-2 text-sm text-red-700 dark:border-slate-700">
                {log.message}
                <p className="text-xs">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div className="glass space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border p-3 text-sm dark:border-slate-700">
              <p className="font-medium">{r.donation?.foodName} — {r.receiver?.name}</p>
              <p>{r.servingsReserved} servings · <StatusBadge status={r.status} /></p>
              <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "notifications" && (
        <div className="glass max-h-[32rem] space-y-2 overflow-y-auto">
          {adminNotifications.map((n) => (
            <div key={n.id} className="border-b py-2 text-sm dark:border-slate-700">
              <p className="font-medium">{n.title}</p>
              <p>{n.message}</p>
              <p className="text-xs text-slate-500">{n.user?.name} · {new Date(n.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "health" && health && (
        <div className="glass grid gap-4 sm:grid-cols-2">
          {Object.entries(health.indicators || {}).map(([key, status]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border p-4 dark:border-slate-700">
              <span className="capitalize">{key}</span>
              <HealthDot status={status} />
            </div>
          ))}
          <p className="sm:col-span-2 text-sm">Uptime: {health.uptimeSeconds}s • Requests: {health.totalRequests} • Sessions: {health.activeSessions}</p>
          <p className="sm:col-span-2 text-sm">Memory: {health.memory?.heapUsedMb}MB heap • {health.memory?.systemUsedPct}% system</p>
        </div>
      )}
    </div>
  );
}
