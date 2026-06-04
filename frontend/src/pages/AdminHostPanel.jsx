import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Database,
  Download,
  LayoutDashboard,
  Map,
  Settings,
  Shield,
  Users,
  Utensils,
  CalendarCheck,
  Radio,
  FileText
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { useTheme } from "../context/ThemeContext";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "live", label: "Live users", icon: Radio },
  { id: "users", label: "Users", icon: Users },
  { id: "donations", label: "Donations", icon: Utensils },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "performance", label: "Performance", icon: Activity },
  { id: "security", label: "Security", icon: Shield },
  { id: "database", label: "Database", icon: Database },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "map", label: "Map", icon: Map }
];

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <p className="text-2xl font-bold text-primary">{value ?? "—"}</p>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function HealthDot({ status }) {
  const colors = { healthy: "bg-green-500", warning: "bg-amber-500", critical: "bg-red-500" };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status] || colors.warning}`} />;
}

export default function AdminHostPanel() {
  const { socket } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState("overview");
  const [dash, setDash] = useState(null);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [logs, setLogs] = useState({ activity: [], system: [], adminActions: [] });
  const [health, setHealth] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [security, setSecurity] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [settings, setSettings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [settingDraft, setSettingDraft] = useState({});
  const [liveUsers, setLiveUsers] = useState({ live: [], sessions: [] });
  const [performance, setPerformance] = useState(null);
  const [restoreFile, setRestoreFile] = useState("");

  const loadCore = async () => {
    const [d, h] = await Promise.all([api.get("/admin/dashboard"), api.get("/health")]);
    setDash(d.data);
    setHealth(h.data);
    setLiveFeed(d.data.recentActivity || []);
  };

  useEffect(() => {
    loadCore();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => loadCore();
    const onActivity = (log) => setLiveFeed((prev) => [log, ...prev].slice(0, 50));
    socket.on("donation:created", refresh);
    socket.on("donation:updated", refresh);
    socket.on("request:created", refresh);
    socket.on("booking:created", refresh);
    socket.on("booking:updated", refresh);
    socket.on("activity:new", onActivity);
    socket.on("system:error", onActivity);
    socket.on("presence:update", refresh);
    return () => {
      socket.off("donation:created", refresh);
      socket.off("donation:updated", refresh);
      socket.off("request:created", refresh);
      socket.off("booking:created", refresh);
      socket.off("booking:updated", refresh);
      socket.off("activity:new", onActivity);
      socket.off("system:error", onActivity);
      socket.off("presence:update", refresh);
    };
  }, [socket]);

  useEffect(() => {
    if (tab === "users") {
      api.get("/admin/users", { params: { q: userSearch, role: userRole, status: userStatus } }).then((r) => setUsers(r.data));
    }
    if (tab === "donations") api.get("/admin/donations").then((r) => setDonations(r.data));
    if (tab === "bookings") {
      api.get("/admin/bookings", { params: { status: bookingStatus } }).then((r) => setBookings(r.data));
    }
    if (tab === "activity") api.get("/admin/logs", { params: { q: logSearch } }).then((r) => setLogs(r.data));
    if (tab === "analytics") api.get("/admin/analytics/full").then((r) => setAnalytics(r.data));
    if (tab === "live") api.get("/admin/live/users").then((r) => setLiveUsers(r.data));
    if (tab === "performance") {
      Promise.all([api.get("/health"), api.get("/admin/performance")]).then(([h, p]) => {
        setHealth(h.data);
        setPerformance(p.data);
      });
    }
    if (tab === "security") api.get("/admin/security").then((r) => setSecurity(r.data));
    if (tab === "database") api.get("/admin/database/stats").then((r) => setDbStats(r.data));
    if (tab === "settings") api.get("/admin/settings").then((r) => setSettings(r.data));
    if (tab === "notifications") api.get("/admin/notifications").then((r) => setNotifications(r.data));
  }, [tab, userSearch, userRole, userStatus, bookingStatus, logSearch]);

  const chartTopDonors = useMemo(
    () => (dash?.analytics?.topDonors || []).map((d) => ({ name: d.name, count: d.count })),
    [dash]
  );

  const reload = () => loadCore();

  const blockUser = (id) => api.patch(`/admin/users/${id}/block`).then(reload);
  const restoreUser = (id) => api.patch(`/admin/users/${id}/restore`).then(reload);
  const banUser = (id) => api.patch(`/admin/users/${id}/ban`).then(reload);
  const deleteUser = (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    api.delete(`/admin/users/${id}`).then(reload);
  };
  const resetPassword = (id) =>
    api.patch(`/admin/users/${id}/reset-password`, {}).then((r) => alert(`Temp password: ${r.data.temporaryPassword}`));

  const viewUser = (id) => api.get(`/admin/users/${id}`).then((r) => setSelectedUser(r.data));

  const exportCsv = async (type) => {
    const res = await api.get(`/admin/export/${type}`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const backupDb = () => api.post("/admin/database/backup").then((r) => alert(r.data.message));

  const saveSetting = (key) => {
    const value = settingDraft[key] ?? "";
    api.put(`/admin/settings/${key}`, { value }).then(() => api.get("/admin/settings").then((r) => setSettings(r.data)));
  };

  const changeRole = (id, role) => api.patch(`/admin/users/${id}/role`, { role }).then(load);

  const exportData = async (type, format = "csv") => {
    const res = await api.get(`/admin/export/${type}`, { params: { format }, responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ov = dash?.overview || dash;

  if (!dash) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 dark:bg-slate-950">
        <div className="skeleton mx-auto h-64 max-w-7xl rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto flex max-w-[1600px] gap-0 lg:gap-4 p-2 lg:p-4">
        <aside className="hidden w-56 shrink-0 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow lg:flex dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 px-2">
            <h1 className="text-lg font-bold text-primary">Enterprise Control</h1>
            <p className="text-xs text-slate-500">Admin / Super Admin</p>
          </div>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                tab === id ? "bg-primary text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
          <button type="button" className="btn-secondary mt-4 text-xs" onClick={toggleTheme}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </aside>

        <main className="min-w-0 flex-1 space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-xl font-bold capitalize">{tab.replace("-", " ")}</h2>
              <p className="text-xs text-slate-500">
                Live: {dash.realtime?.onlineUsers ?? 0} online · {dash.realtime?.socketConnections ?? 0} sockets
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:hidden">
              <select className="input-field text-sm" value={tab} onChange={(e) => setTab(e.target.value)}>
                {NAV.map((n) => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => exportCsv("users")}>
                <Download size={14} className="inline" /> CSV
              </button>
              <button type="button" className="btn-primary text-sm" onClick={reload}>Refresh</button>
            </div>
          </header>

          {tab === "overview" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total users" value={ov.totalUsers ?? dash.users?.totalUsers} />
                <StatCard label="Active users" value={ov.activeUsers ?? dash.users?.activeUsers} />
                <StatCard label="Online now" value={ov.onlineUsers ?? dash.users?.onlineUsers} />
                <StatCard label="New users today" value={ov.newUsersToday ?? dash.users?.newUsersToday} />
                <StatCard label="Total donations" value={ov.totalDonations ?? dash.donations?.totalDonations} />
                <StatCard label="Total bookings" value={ov.totalBookings ?? dash.bookings?.totalBookings} />
                <StatCard label="Food distributed" value={ov.foodDistributed ?? dash.analytics?.mealsDistributed} />
                <StatCard label="Total requests" value={ov.totalRequests} />
                <StatCard label="Notifications" value={ov.totalNotifications} />
                <StatCard label="Daily activity" value={ov.dailyActivityCount} />
                <StatCard label="Total revenue" value={`$${ov.totalRevenue ?? 0}`} sub="Future-ready" />
                <StatCard label="Pending bookings" value={ov.pendingBookings ?? dash.bookings?.pendingBookings} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 h-72">
                  <h3 className="mb-2 font-semibold">Top donors</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={chartTopDonors}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2E7D32" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-h-72 overflow-y-auto">
                  <h3 className="mb-2 font-semibold">Live activity</h3>
                  {liveFeed.map((log) => (
                    <div key={log.id} className="border-b py-2 text-sm dark:border-slate-700">
                      <strong>{log.action}</strong> — {log.user?.name || "System"}
                      <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "live" && (
            <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <h3 className="font-semibold">Real-time online ({liveUsers.live?.length ?? 0})</h3>
              {liveUsers.live?.map((u) => (
                <div key={u.userId} className="flex flex-wrap justify-between gap-2 rounded-xl border p-3 text-sm dark:border-slate-700">
                  <div>
                    <p className="font-medium">{u.name} · {u.role}</p>
                    <p className="text-primary">Page: {u.currentPage}</p>
                    <p className="text-xs text-slate-500">{u.browser} · {u.device} · {u.ip || "—"}</p>
                  </div>
                  <p className="text-xs">Session {u.sessionDurationSec}s</p>
                </div>
              ))}
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-3 rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap gap-2">
                <input className="input-field max-w-xs" placeholder="Search…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                <select className="input-field w-auto" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                  <option value="">All roles</option>
                  <option value="DONOR">Donor</option>
                  <option value="RECEIVER">Receiver</option>
                </select>
                <select className="input-field w-auto" value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
                  <option value="">All status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
              {users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700">
                  <div>
                    <p className="font-medium">{u.name} — {u.role}</p>
                    <p className="text-sm text-slate-500">{u.email}</p>
                    <p className="text-xs">Joined {new Date(u.createdAt).toLocaleDateString()} · Last login {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}</p>
                    <p className="text-xs">Donations: {u.donationCount} · Bookings: {u.bookingCount}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="btn-secondary text-xs" onClick={() => viewUser(u.id)}>Profile</button>
                    {u.isBlocked ? (
                      <button type="button" className="btn-secondary text-xs" onClick={() => restoreUser(u.id)}>Restore</button>
                    ) : (
                      <button type="button" className="btn-secondary text-xs" onClick={() => blockUser(u.id)}>Suspend</button>
                    )}
                    <button type="button" className="btn-secondary text-xs" onClick={() => banUser(u.id)}>Ban</button>
                    <button type="button" className="btn-secondary text-xs" onClick={() => resetPassword(u.id)}>Reset pwd</button>
                    <select className="input-field text-xs w-28" defaultValue={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                      <option value="DONOR">Donor</option>
                      <option value="RECEIVER">Receiver</option>
                    </select>
                    <button type="button" className="btn-secondary text-xs text-red-600" onClick={() => deleteUser(u.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {selectedUser && (
                <div className="mt-4 rounded-xl border p-4 dark:border-slate-600">
                  <h3 className="font-semibold">User profile — {selectedUser.user.name}</h3>
                  <p className="text-sm">Activity ({selectedUser.activity?.length}) · Logins ({selectedUser.loginHistory?.length})</p>
                  <button type="button" className="text-sm underline" onClick={() => setSelectedUser(null)}>Close</button>
                </div>
              )}
            </div>
          )}

          {tab === "donations" && (
            <div className="space-y-2 rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              {donations.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700">
                  <div>
                    <p className="font-medium">{d.foodName} — {d.donor?.name}</p>
                    <StatusBadge status={d.status} />
                    <p className="text-xs">{d.servingsRemaining}/{d.servesCount} servings</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="btn-primary text-xs" onClick={() => api.patch(`/admin/donations/${d.id}/approve`).then(reload)}>Approve</button>
                    <button type="button" className="btn-secondary text-xs" onClick={() => api.patch(`/admin/donations/${d.id}/invalidate`).then(reload)}>Reject</button>
                    <button type="button" className="btn-secondary text-xs" onClick={() => api.delete(`/admin/donations/${d.id}`).then(reload)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "bookings" && (
            <div className="space-y-2 rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <select className="input-field w-auto" value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              {bookings.map((b) => (
                <div key={b.id} className="rounded-xl border p-3 text-sm dark:border-slate-700">
                  <p className="font-medium">{b.donation?.foodName} — {b.receiver?.name}</p>
                  <p>Donor: {b.donation?.donor?.name} · <StatusBadge status={b.status} /></p>
                  <p className="text-xs">{new Date(b.bookingDateTime || b.createdAt).toLocaleString()}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn-primary text-xs" onClick={() => api.patch(`/admin/bookings/${b.id}/approve`).then(() => setTab("bookings"))}>Approve</button>
                    <button type="button" className="btn-secondary text-xs" onClick={() => api.patch(`/admin/bookings/${b.id}/cancel`).then(() => setTab("bookings"))}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "analytics" && analytics && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 h-64">
                <h3 className="font-semibold mb-2">Daily — users joined</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={analytics.daily?.usersJoined || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#2E7D32" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 h-64">
                <h3 className="font-semibold mb-2">Daily — bookings</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={analytics.daily?.foodBooked || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#1565C0" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                <h3 className="font-semibold">Today</h3>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(analytics.today || {}).map(([k, v]) => (
                    <StatCard key={k} label={k} value={v} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-h-[32rem] overflow-y-auto">
                <input className="input-field mb-2" placeholder="Search logs…" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
                <h3 className="font-semibold">Activity</h3>
                {logs.activity?.map((log) => (
                  <div key={log.id} className="border-b py-2 text-sm dark:border-slate-700">
                    <strong>{log.action}</strong> — {log.user?.name || "—"}
                    <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-h-[32rem] overflow-y-auto">
                <h3 className="font-semibold">Admin actions</h3>
                {logs.adminActions?.map((log) => (
                  <div key={log.id} className="border-b py-2 text-sm dark:border-slate-700">
                    {log.action} — {log.admin?.name}
                    <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-h-[32rem] overflow-y-auto space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="border-b py-2 text-sm dark:border-slate-700">
                  <p className="font-medium">{n.title}</p>
                  <p>{n.message}</p>
                  <p className="text-xs text-slate-500">{n.user?.name} · {new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "performance" && health && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(health.indicators || {}).map(([key, status]) => (
                  <div key={key} className="flex items-center justify-between rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <span className="capitalize">{key}</span>
                    <HealthDot status={status} />
                  </div>
                ))}
              </div>
              <p className="text-sm rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                Uptime: {health.uptimeSeconds}s · DB: {health.dbLatencyMs}ms · API avg: {performance?.metrics?.avgResponseMs ?? health.apiMetrics?.avgResponseMs}ms ·
                Error rate: {performance?.metrics?.errorRatePercent ?? health.apiMetrics?.errorRatePercent}% · CPU load: {(health.cpuUsage || []).map((n) => n.toFixed(2)).join(", ")}
              </p>
              {performance?.metrics?.traffic?.length > 0 && (
                <div className="rounded-2xl border bg-white p-4 h-64 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="font-semibold mb-2">Daily API traffic</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={performance.metrics.traffic}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="requests" stroke="#2E7D32" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {tab === "security" && security && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-h-96 overflow-y-auto">
                <h3 className="font-semibold">Failed logins</h3>
                {security.failedLogins?.map((l) => (
                  <div key={l.id} className="border-b py-2 text-sm text-red-700 dark:border-slate-700">
                    {l.email} — {l.message}
                    <p className="text-xs">{new Date(l.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-h-96 overflow-y-auto">
                <h3 className="font-semibold">Banned / suspended</h3>
                {security.bannedUsers?.map((u) => (
                  <div key={u.id} className="border-b py-2 text-sm dark:border-slate-700">
                    {u.name} — {u.email}
                    {u.isBanned && <span className="ml-2 text-red-600">BANNED</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "database" && dbStats && (
            <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <p><strong>Engine:</strong> {dbStats.engine}</p>
              <p><strong>Size:</strong> {dbStats.fileSizeMb} MB</p>
              <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-xl overflow-auto">{JSON.stringify(dbStats.tables, null, 2)}</pre>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={backupDb}>Backup database</button>
                <input className="input-field max-w-xs" placeholder="backup filename" value={restoreFile} onChange={(e) => setRestoreFile(e.target.value)} />
                <button type="button" className="btn-secondary" onClick={() => api.post("/admin/database/restore", { file: restoreFile }).then((r) => alert(r.data.message))}>Restore</button>
                <button type="button" className="btn-secondary" onClick={() => exportData("users", "csv")}>Users CSV</button>
                <button type="button" className="btn-secondary" onClick={() => exportData("donations", "json")}>Donations JSON</button>
                <button type="button" className="btn-secondary" onClick={() => exportData("logs", "csv")}>Logs CSV</button>
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
              {["site_name", "contact_email", "contact_phone", "otp_enabled", "notifications_enabled"].map((key) => {
                const existing = settings.find((s) => s.key === key);
                return (
                  <div key={key} className="flex flex-wrap gap-2 items-end">
                    <label className="text-sm font-medium w-full capitalize">{key.replace(/_/g, " ")}</label>
                    <input
                      className="input-field flex-1"
                      defaultValue={existing?.value || ""}
                      onChange={(e) => setSettingDraft((d) => ({ ...d, [key]: e.target.value }))}
                    />
                    <button type="button" className="btn-primary text-sm" onClick={() => saveSetting(key)}>Save</button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "map" && <MapView donations={donations.length ? donations : dash.recentDonations || []} showRanges={false} />}
        </main>
      </div>
    </div>
  );
}
