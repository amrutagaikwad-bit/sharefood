import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  const [donors, setDonors] = useState([]);
  const [donations, setDonations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState({ activity: [], system: [] });
  const [liveFeed, setLiveFeed] = useState([]);
  const [tab, setTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");
  const [donorSearch, setDonorSearch] = useState("");
  const [bookingFilter, setBookingFilter] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [trends, setTrends] = useState({ donations: [], bookings: [] });
  const [settings, setSettings] = useState([]);

  const load = async () => {
    const [dash, u, d, h, l, t] = await Promise.all([
      api.get("/admin/dashboard"),
      api.get("/admin/users", { params: { q: userSearch } }),
      api.get("/admin/donations"),
      api.get("/health"),
      api.get("/admin/logs"),
      api.get("/admin/analytics/trends")
    ]);
    setData(dash.data);
    setUsers(u.data);
    setDonations(d.data);
    setHealth(h.data);
    setLogs(l.data);
    setLiveFeed(dash.data.recentActivity || []);
    setTrends({
      donations: t.data.dailyDonations || [],
      bookings: t.data.dailyBookings || []
    });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tab === "users") api.get("/admin/users", { params: { q: userSearch } }).then((r) => setUsers(r.data));
    if (tab === "donors") api.get("/admin/donors", { params: { q: donorSearch } }).then((r) => setDonors(r.data));
    if (tab === "bookings") {
      api.get("/admin/bookings", { params: { status: bookingFilter, q: bookingSearch } }).then((r) => setBookings(r.data));
    }
    if (tab === "settings") api.get("/admin/settings").then((r) => setSettings(r.data)).catch(() => setSettings([]));
  }, [userSearch, donorSearch, bookingFilter, bookingSearch, tab]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    const onActivity = (log) => setLiveFeed((prev) => [log, ...prev].slice(0, 40));
    socket.on("donation:created", refresh);
    socket.on("donation:updated", refresh);
    socket.on("booking:created", refresh);
    socket.on("booking:updated", refresh);
    socket.on("activity:new", onActivity);
    socket.on("system:error", onActivity);
    return () => {
      socket.off("donation:created", refresh);
      socket.off("donation:updated", refresh);
      socket.off("booking:created", refresh);
      socket.off("booking:updated", refresh);
      socket.off("activity:new", onActivity);
      socket.off("system:error", onActivity);
    };
  }, [socket]);

  const blockUser = (id) => api.patch(`/admin/users/${id}/block`).then(load);
  const restoreUser = (id) => api.patch(`/admin/users/${id}/restore`).then(load);
  const hideDonation = (id) => api.patch(`/admin/donations/${id}/hide`).then(load);
  const restoreDonation = (id) => api.patch(`/admin/donations/${id}/restore`).then(load);
  const deleteDonation = (id) => api.delete(`/admin/donations/${id}`).then(load);
  const saveSetting = (key, value) => api.put(`/admin/settings/${key}`, { value }).then(load);

  if (!data) return <div className="p-4"><div className="skeleton mx-auto h-48 max-w-7xl" /></div>;

  const ov = data.analytics?.overview || {};
  const periods = data.analytics?.periods || {};
  const donorChartData = (data.analytics?.topDonors || []).map((d) => ({ name: d.name, donations: d.count }));

  const tabs = ["overview", "analytics", "users", "donors", "donations", "bookings", "map", "logs", "health", "settings"];

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <h1 className="text-3xl font-bold">Admin Monitoring Panel</h1>

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
              ["Total users", ov.totalUsers ?? data.users?.totalUsers],
              ["Total donors", ov.totalDonors ?? data.users?.totalDonors],
              ["Total bookings", ov.totalBookings ?? data.bookings?.totalBookings],
              ["Total donations", ov.totalDonations ?? data.donations?.totalDonations],
              ["Completed donations", ov.completedDonations ?? data.donations?.completedDonations],
              ["Active donations", ov.activeDonations ?? data.donations?.activeDonations],
              ["Pending bookings", ov.pendingBookings ?? data.bookings?.pendingBookings],
              ["System errors", data.systemErrors]
            ].map(([label, value]) => (
              <div key={label} className="glass">
                <p className="text-2xl font-bold text-primary">{value ?? 0}</p>
                <p className="text-sm text-slate-600">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass max-h-72 overflow-y-auto">
              <h3 className="mb-2 font-semibold">Recent bookings</h3>
              {(data.recentActivity || []).slice(0, 8).map((log) => (
                <div key={log.id} className="border-b py-2 text-sm dark:border-slate-700">
                  <strong>{log.action}</strong> — {log.user?.name || "System"}
                  <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="glass max-h-72 overflow-y-auto">
              <h3 className="mb-2 font-semibold">Recent donations</h3>
              {(data.recentDonations || []).map((d) => (
                <div key={d.id} className="border-b py-2 text-sm dark:border-slate-700">
                  {d.foodName} — {d.donor?.name}
                  <p className="text-xs text-slate-500">{new Date(d.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass text-center">
              <p className="text-xs uppercase text-slate-500">Today</p>
              <p className="text-lg font-bold">{periods.daily?.newBookings ?? 0} bookings</p>
              <p className="text-sm">{periods.daily?.newDonations ?? 0} donations</p>
            </div>
            <div className="glass text-center">
              <p className="text-xs uppercase text-slate-500">This week</p>
              <p className="text-lg font-bold">{periods.weekly?.newBookings ?? 0} bookings</p>
              <p className="text-sm">{periods.weekly?.newDonations ?? 0} donations</p>
            </div>
            <div className="glass text-center">
              <p className="text-xs uppercase text-slate-500">This month</p>
              <p className="text-lg font-bold">{periods.monthly?.newBookings ?? 0} bookings</p>
              <p className="text-sm">{periods.monthly?.newDonations ?? 0} donations</p>
            </div>
          </div>
          <div className="glass h-80">
            <h3 className="mb-2 font-semibold">Donation & booking trends (30 days)</h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={trends.donations.map((d, i) => ({
                date: d.date?.slice(5),
                donations: d.count,
                bookings: trends.bookings[i]?.count ?? 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="donations" stroke="#2E7D32" />
                <Line type="monotone" dataKey="bookings" stroke="#1565C0" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {donorChartData.length > 0 && (
            <div className="glass h-72">
              <h3 className="mb-2 font-semibold">Top donors</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={donorChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="donations" fill="#2E7D32" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
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

      {tab === "donors" && (
        <div className="glass space-y-3">
          <input className="input-field max-w-md" placeholder="Search donors..." value={donorSearch} onChange={(e) => setDonorSearch(e.target.value)} />
          {donors.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700">
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-sm text-slate-500">{d.email} · {d._count?.donations ?? 0} listings</p>
              </div>
              {d.isBlocked ? (
                <button type="button" className="btn-secondary text-sm" onClick={() => restoreUser(d.id)}>Restore</button>
              ) : (
                <button type="button" className="btn-secondary text-sm" onClick={() => blockUser(d.id)}>Suspend</button>
              )}
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
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-sm" onClick={() => hideDonation(d.id)}>Hide</button>
                <button type="button" className="btn-secondary text-sm" onClick={() => deleteDonation(d.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "bookings" && (
        <div className="glass space-y-3">
          <div className="flex flex-wrap gap-2">
            <input className="input-field max-w-xs" placeholder="Search..." value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} />
            <select className="input-field max-w-xs" value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {bookings.map((b) => (
            <div key={b.id} className="rounded-xl border p-3 text-sm dark:border-slate-700">
              <p className="font-medium">{b.donation?.foodName} — {b.receiver?.name}</p>
              <p>{b.peopleToServe} people · Donor: {b.donation?.donor?.name}</p>
              <StatusBadge status={b.status} />
              <p className="text-xs text-slate-500">{new Date(b.bookingDateTime).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "map" && <MapView donations={donations} showRanges={false} />}

      {tab === "logs" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass max-h-[32rem] overflow-y-auto">
            <h3 className="font-semibold">Activity logs</h3>
            {logs.activity?.map((log) => (
              <div key={log.id} className="border-b py-2 text-sm dark:border-slate-700">
                <p><strong>{log.action}</strong> by {log.user?.name || "—"}</p>
                <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="glass max-h-[32rem] overflow-y-auto">
            <h3 className="font-semibold">Error tracking</h3>
            {logs.system?.map((log) => (
              <div key={log.id} className="border-b py-2 text-sm text-red-700 dark:border-slate-700">
                {log.message}
                <p className="text-xs">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
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
          <p className="sm:col-span-2 text-sm">Uptime: {health.uptimeSeconds}s · Requests: {health.totalRequests}</p>
        </div>
      )}

      {tab === "settings" && (
        <div className="glass space-y-3">
          {settings.map((s) => (
            <div key={s.key} className="flex flex-wrap items-center gap-2">
              <label className="w-40 text-sm font-medium">{s.key}</label>
              <input
                className="input-field flex-1"
                defaultValue={s.value}
                onBlur={(e) => saveSetting(s.key, e.target.value)}
              />
            </div>
          ))}
          {settings.length === 0 && <p className="text-sm text-slate-500">Run npm run seed to load default settings.</p>}
        </div>
      )}
    </div>
  );
}
