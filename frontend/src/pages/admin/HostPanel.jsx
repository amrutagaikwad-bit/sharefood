import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Database,
  LayoutDashboard,
  Package,
  Shield,
  Users,
  Utensils,
  Zap,
  Settings,
  FileText,
  Radio
} from "lucide-react";
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
import api from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import { useSocket } from "../../context/SocketContext";
import { useTheme } from "../../context/ThemeContext";
import { downloadCsv, StatCard } from "./hostUtils";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "live", label: "Live", icon: Radio },
  { id: "users", label: "Users", icon: Users },
  { id: "donations", label: "Donations", icon: Package },
  { id: "bookings", label: "Bookings", icon: Utensils },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "performance", label: "Performance", icon: Zap },
  { id: "logs", label: "Activity Logs", icon: Activity },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "database", label: "Database", icon: Database },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings }
];

function HealthDot({ status }) {
  const colors = { healthy: "bg-green-500", warning: "bg-amber-500", critical: "bg-red-500" };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status] || colors.warning}`} />;
}

export default function HostPanel() {
  const { socket } = useSocket();
  const { darkMode, setDarkMode } = useTheme();
  const [section, setSection] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState({ q: "", role: "", blocked: "" });
  const [selectedUser, setSelectedUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState({ status: "", q: "" });
  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState({ q: "", action: "" });
  const [security, setSecurity] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [live, setLive] = useState(null);
  const [settings, setSettings] = useState([]);
  const [perf, setPerf] = useState(null);
  const [trends, setTrends] = useState({ donations: [], bookings: [] });

  const refreshOverview = useCallback(async () => {
    const [ov, h, t] = await Promise.all([
      api.get("/admin/host/overview"),
      api.get("/health"),
      api.get("/admin/analytics/trends")
    ]);
    setOverview(ov.data);
    setHealth(h.data);
    setTrends({ donations: t.data.dailyDonations || [], bookings: t.data.dailyBookings || [] });
    setPerf(ov.data.performance);
  }, []);

  useEffect(() => { refreshOverview(); }, [refreshOverview]);

  useEffect(() => {
    if (!socket) return;
    const onRefresh = () => refreshOverview();
    socket.on("booking:created", onRefresh);
    socket.on("donation:created", onRefresh);
    socket.on("activity:new", onRefresh);
    return () => {
      socket.off("booking:created", onRefresh);
      socket.off("donation:created", onRefresh);
      socket.off("activity:new", onRefresh);
    };
  }, [socket, refreshOverview]);

  useEffect(() => {
    if (section === "users") {
      api.get("/admin/host/users", { params: userFilter }).then((r) => setUsers(r.data));
    }
    if (section === "donations") api.get("/admin/donations").then((r) => setDonations(r.data));
    if (section === "bookings") {
      api.get("/admin/bookings", { params: bookingFilter }).then((r) => setBookings(r.data));
    }
    if (section === "logs") {
      api.get("/admin/host/activity", { params: logSearch }).then((r) => setLogs(r.data));
    }
    if (section === "security") api.get("/admin/host/security").then((r) => setSecurity(r.data));
    if (section === "database") api.get("/admin/host/database").then((r) => setDbStats(r.data));
    if (section === "notifications") api.get("/admin/host/notifications").then((r) => setNotifications(r.data));
    if (section === "live") api.get("/admin/host/live").then((r) => setLive(r.data));
    if (section === "settings") api.get("/admin/settings").then((r) => setSettings(r.data));
    if (section === "performance") {
      api.get("/admin/host/performance").then((r) => setPerf(r.data.perf));
      api.get("/health").then((r) => setHealth(r.data));
    }
  }, [section, userFilter, bookingFilter, logSearch]);

  const openUser = async (id) => {
    const res = await api.get(`/admin/host/users/${id}`);
    setSelectedUser(res.data);
  };

  const cards = overview?.cards || {};

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
        <h1 className="mb-1 text-lg font-bold text-primary">Host Panel</h1>
        <p className="mb-4 text-xs text-slate-500">Super Admin Control</p>
        <nav className="space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setSection(id); setSelectedUser(null); }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                section === id ? "bg-primary text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <button type="button" className="btn-secondary mt-6 w-full text-sm" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
          <select className="input-field" value={section} onChange={(e) => setSection(e.target.value)}>
            {NAV.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
        </div>

        {section === "overview" && overview && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Website Overview</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard label="Total Users" value={cards.totalUsers} />
              <StatCard label="Active Users" value={cards.activeUsers} />
              <StatCard label="New Users Today" value={cards.newUsersToday} />
              <StatCard label="Total Donations" value={cards.totalDonations} />
              <StatCard label="Total Bookings" value={cards.totalBookings} />
              <StatCard label="Food Distributed (servings)" value={cards.foodDistributed} />
              <StatCard label="Donors / NGOs" value={cards.totalDonors} />
              <StatCard label="Completed Donations" value={cards.completedDonations} />
              <StatCard label="Pending Donations" value={cards.pendingDonations} />
              <StatCard label="Pending Bookings" value={cards.pendingBookings} />
              <StatCard label="Online Now" value={overview.live?.onlineUsers} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-2 font-semibold">30-day trends</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
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
              </div>
              <div className="rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-2 font-semibold">System health</h3>
                {health && Object.entries(health.indicators || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b py-2 text-sm dark:border-slate-700">
                    <span className="capitalize">{k}</span>
                    <HealthDot status={v} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === "live" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Real-time monitoring</h2>
            {!live ? <div className="skeleton h-40" /> : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label="Online users" value={live.onlineUsers} />
                  <StatCard label="Recent bookings" value={live.recentBookings?.length} />
                  <StatCard label="Recent donations" value={live.recentDonations?.length} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="font-semibold">Live bookings</h3>
                    {live.recentBookings?.map((b) => (
                      <p key={b.id} className="border-b py-2 text-sm dark:border-slate-700">
                        {b.donation?.foodName} — {b.receiver?.name} · <StatusBadge status={b.status} />
                      </p>
                    ))}
                  </div>
                  <div className="rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="font-semibold">Live donations</h3>
                    {live.recentDonations?.map((d) => (
                      <p key={d.id} className="border-b py-2 text-sm dark:border-slate-700">
                        {d.foodName} by {d.donor?.name}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {section === "users" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">User management</h2>
            <div className="flex flex-wrap gap-2">
              <input className="input-field max-w-xs" placeholder="Search..." value={userFilter.q} onChange={(e) => setUserFilter((f) => ({ ...f, q: e.target.value }))} />
              <select className="input-field max-w-[140px]" value={userFilter.role} onChange={(e) => setUserFilter((f) => ({ ...f, role: e.target.value }))}>
                <option value="">All roles</option>
                <option value="DONOR">Donor</option>
                <option value="RECEIVER">Receiver</option>
              </select>
              <select className="input-field max-w-[140px]" value={userFilter.blocked} onChange={(e) => setUserFilter((f) => ({ ...f, blocked: e.target.value }))}>
                <option value="">All status</option>
                <option value="false">Active</option>
                <option value="true">Banned</option>
              </select>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full rounded-xl border bg-white p-3 text-left text-sm dark:border-slate-700 dark:bg-slate-900"
                    onClick={() => openUser(u.id)}
                  >
                    <p className="font-medium">{u.name} — {u.role}</p>
                    <p className="text-slate-500">{u.email}</p>
                    <p className="text-xs">Donations: {u.donationCount} · Bookings: {u.bookingCount} · Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
              {selectedUser && (
                <div className="rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="font-bold">{selectedUser.user.name}</h3>
                  <p className="text-sm">{selectedUser.user.email}</p>
                  <p className="text-sm">Last login: {selectedUser.user.lastLoginAt ? new Date(selectedUser.user.lastLoginAt).toLocaleString() : "—"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedUser.user.isBlocked ? (
                      <button type="button" className="btn-primary text-sm" onClick={() => api.patch(`/admin/host/users/${selectedUser.user.id}/unban`).then(() => openUser(selectedUser.user.id))}>Unban</button>
                    ) : (
                      <button type="button" className="btn-secondary text-sm" onClick={() => api.patch(`/admin/host/users/${selectedUser.user.id}/ban`).then(() => openUser(selectedUser.user.id))}>Ban</button>
                    )}
                    <button type="button" className="btn-secondary text-sm" onClick={() => api.post(`/admin/host/users/${selectedUser.user.id}/reset-password`, { password: "password123" }).then(() => alert("Password reset to password123"))}>Reset password</button>
                    <button type="button" className="btn-secondary text-sm text-red-600" onClick={() => api.delete(`/admin/users/${selectedUser.user.id}`).then(() => { setSelectedUser(null); setUserFilter((f) => ({ ...f })); })}>Delete</button>
                  </div>
                  <h4 className="mt-4 font-semibold">Login history</h4>
                  <div className="max-h-32 overflow-y-auto text-xs">
                    {selectedUser.loginHistory?.map((l) => (
                      <p key={l.id}>{new Date(l.createdAt).toLocaleString()} — {l.success ? "OK" : "Failed"}</p>
                    ))}
                  </div>
                  <h4 className="mt-2 font-semibold">Recent activity</h4>
                  <div className="max-h-32 overflow-y-auto text-xs">
                    {selectedUser.activity?.slice(0, 10).map((a) => (
                      <p key={a.id}>{a.action} — {new Date(a.createdAt).toLocaleString()}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {section === "donations" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Donation management</h2>
            {donations.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div>
                  <p className="font-medium">{d.foodName} — {d.donor?.name}</p>
                  <StatusBadge status={d.status} />
                  {d.isFlagged && <span className="ml-2 text-xs text-red-600">Flagged</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary text-sm" onClick={() => api.patch(`/admin/donations/${d.id}/approve`).then(() => api.get("/admin/donations").then((r) => setDonations(r.data)))}>Approve</button>
                  <button type="button" className="btn-secondary text-sm" onClick={() => api.patch(`/admin/donations/${d.id}/invalidate`).then(() => api.get("/admin/donations").then((r) => setDonations(r.data)))}>Reject</button>
                  <button type="button" className="btn-secondary text-sm" onClick={() => api.delete(`/admin/donations/${d.id}`).then(() => api.get("/admin/donations").then((r) => setDonations(r.data)))}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {section === "bookings" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Booking management</h2>
            <div className="flex gap-2">
              <input className="input-field" placeholder="Search" value={bookingFilter.q} onChange={(e) => setBookingFilter((f) => ({ ...f, q: e.target.value }))} />
              <select className="input-field" value={bookingFilter.status} onChange={(e) => setBookingFilter((f) => ({ ...f, status: e.target.value }))}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {bookings.map((b) => (
              <div key={b.id} className="rounded-xl border bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="font-medium">{b.donation?.foodName} — {b.receiver?.name} ({b.peopleToServe} people)</p>
                <p className="text-sm">Donor: {b.donation?.donor?.name} · {new Date(b.bookingDateTime).toLocaleString()}</p>
                <StatusBadge status={b.status} />
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn-primary text-sm" onClick={() => api.patch(`/admin/host/bookings/${b.id}/approve`).then(() => api.get("/admin/bookings", { params: bookingFilter }).then((r) => setBookings(r.data)))}>Approve</button>
                  <button type="button" className="btn-secondary text-sm" onClick={() => api.patch(`/admin/host/bookings/${b.id}/cancel`).then(() => api.get("/admin/bookings", { params: bookingFilter }).then((r) => setBookings(r.data)))}>Cancel</button>
                  <button type="button" className="btn-secondary text-sm" onClick={() => api.patch(`/admin/host/bookings/${b.id}/complete`).then(() => api.get("/admin/bookings", { params: bookingFilter }).then((r) => setBookings(r.data)))}>Complete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {section === "analytics" && overview && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Analytics</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {["daily", "weekly", "monthly"].map((p) => (
                <div key={p} className="rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs uppercase text-slate-500">{p}</p>
                  <p className="text-sm">Users: {overview.analytics?.periods?.[p]?.newUsers ?? 0}</p>
                  <p className="text-sm">Donations: {overview.analytics?.periods?.[p]?.newDonations ?? 0}</p>
                  <p className="text-sm">Bookings: {overview.analytics?.periods?.[p]?.newBookings ?? 0}</p>
                </div>
              ))}
            </div>
            <div className="h-80 rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.donations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2E7D32" name="Donations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {section === "performance" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Performance monitoring</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Uptime (sec)" value={health?.uptimeSeconds} />
              <StatCard label="DB latency (ms)" value={health?.dbLatencyMs} />
              <StatCard label="Avg response (ms)" value={perf?.avgMs} />
              <StatCard label="Failed requests" value={perf?.failed} />
              <StatCard label="Heap (MB)" value={health?.memory?.heapUsedMb} />
              <StatCard label="System memory %" value={health?.memory?.systemUsedPct} />
              <StatCard label="Total API requests" value={health?.totalRequests} />
              <StatCard label="Errors logged" value={health?.errorCount} />
            </div>
            <div className="rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold">Recent API calls</h3>
              {perf?.recent?.map((r, i) => (
                <p key={i} className="border-b py-1 text-xs font-mono dark:border-slate-700">
                  {r.method} {r.path} — {r.status} — {r.ms}ms
                </p>
              ))}
            </div>
          </div>
        )}

        {section === "logs" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Activity logs</h2>
            <div className="flex gap-2">
              <input className="input-field" placeholder="Search logs..." value={logSearch.q} onChange={(e) => setLogSearch((s) => ({ ...s, q: e.target.value }))} />
              <input className="input-field max-w-xs" placeholder="Action filter" value={logSearch.action} onChange={(e) => setLogSearch((s) => ({ ...s, action: e.target.value }))} />
            </div>
            <div className="max-h-[32rem] overflow-y-auto rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              {logs.map((log) => (
                <div key={log.id} className="border-b py-2 text-sm dark:border-slate-700">
                  <strong>{log.action}</strong> — {log.user?.name || "System"}
                  <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "notifications" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Notification center</h2>
            {notifications.map((n) => (
              <div key={n.id} className="rounded-xl border bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-slate-500">{n.type} · {new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {section === "security" && security && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Security panel</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="Failed logins (7d)" value={security.failedLoginsWeek} />
              <StatCard label="Banned users" value={security.bannedUsers} />
            </div>
            {security.events?.map((e) => (
              <div key={e.id} className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-sm dark:border-red-900 dark:bg-red-950/30">
                <strong>{e.type}</strong> — {e.message}
                <p className="text-xs">{new Date(e.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {section === "database" && dbStats && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Database management</h2>
            <p className="text-sm text-slate-600">{dbStats.engine} · {dbStats.sizeMb} MB</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(dbStats.tables || {}).map(([k, v]) => (
                <StatCard key={k} label={k} value={v} />
              ))}
            </div>
            <button type="button" className="btn-primary" onClick={() => api.post("/admin/host/database/backup").then((r) => alert(`Backup: ${r.data.filename}`))}>
              Backup database
            </button>
          </div>
        )}

        {section === "reports" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Report generation</h2>
            <p className="text-sm text-slate-600">Export CSV reports (opens download).</p>
            <div className="flex flex-wrap gap-2">
              {["users", "donations", "bookings"].map((t) => (
                <button key={t} type="button" className="btn-primary capitalize" onClick={() => downloadCsv(t)}>
                  Export {t} CSV
                </button>
              ))}
            </div>
          </div>
        )}

        {section === "settings" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">System settings</h2>
            {settings.map((s) => (
              <div key={s.key} className="flex flex-wrap items-center gap-2">
                <label className="w-48 text-sm font-medium">{s.key}</label>
                <input className="input-field flex-1" defaultValue={s.value} onBlur={(e) => api.put(`/admin/settings/${s.key}`, { value: e.target.value })} />
              </div>
            ))}
            {settings.length === 0 && <p className="text-sm">Run seed to load defaults.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
