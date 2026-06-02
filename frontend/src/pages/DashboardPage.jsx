import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [stats, setStats] = useState(null);
  const [myDonations, setMyDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const dashboard = await api.get("/dashboard");
    setStats(dashboard.data);
    if (user.role === "DONOR") {
      const donations = await api.get("/donations/mine");
      const reqs = await api.get("/requests/mine");
      setMyDonations(donations.data);
      setRequests(reqs.data);
    } else {
      const reqs = await api.get("/requests/mine");
      setRequests(reqs.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markComplete = async (id) => {
    await api.patch(`/donations/${id}/complete`);
    notify("Donation marked as completed");
    load();
  };

  if (loading) return <div className="mx-auto max-w-6xl p-4"><div className="card animate-pulse h-40" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <section className="grid gap-3 sm:grid-cols-3">
        {Object.entries(stats).filter(([k]) => !["role", "recent"].includes(k)).map(([k, v]) => (
          <div key={k} className="card"><p className="text-sm capitalize">{k}</p><p className="text-2xl font-bold text-primary">{v}</p></div>
        ))}
      </section>

      {user.role === "DONOR" && (
        <section className="card">
          <h2 className="text-lg font-semibold">Recent Donations</h2>
          <div className="mt-3 space-y-3">
            {myDonations.length === 0 && <p className="text-sm">No donations yet.</p>}
            {myDonations.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                <div>
                  <p className="font-medium">{d.foodName}</p>
                  <p className="text-sm">{d.quantity} - {d.status}</p>
                </div>
                {d.status === "ACTIVE" && <button className="btn-primary text-sm" onClick={() => markComplete(d.id)}>Mark Completed</button>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="text-lg font-semibold">{user.role === "DONOR" ? "Pickup Requests" : "My Pickup Requests"}</h2>
        <div className="mt-3 space-y-2">
          {requests.length === 0 && <p className="text-sm">No requests yet.</p>}
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border p-3 text-sm">
              Request #{r.id} - {r.status}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

