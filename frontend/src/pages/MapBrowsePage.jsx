import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import DonationCard from "../components/DonationCard";
import MapView from "../components/MapView";
import { useGeolocation } from "../hooks/useGeolocation";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

export default function MapBrowsePage() {
  const { location } = useGeolocation();
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [maxDistance, setMaxDistance] = useState(10);
  const [donations, setDonations] = useState([]);

  const load = async () => {
    const params = {
      q: query,
      category: category || undefined,
      lat: location?.lat,
      lng: location?.lng,
      maxDistance
    };
    const res = await api.get("/donations", { params });
    setDonations(res.data);
  };

  useEffect(() => {
    load();
  }, [location, maxDistance]);

  const filtered = useMemo(
    () => donations.filter((d) => d.foodName.toLowerCase().includes(query.toLowerCase())),
    [donations, query]
  );

  const requestPickup = async (donationId) => {
    await api.post("/requests", { donationId });
    notify("Pickup requested");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="card space-y-3">
        <h1 className="text-2xl font-bold">Nearby Donations</h1>
        <div className="grid gap-2 sm:grid-cols-4">
          <input
            className="rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            placeholder="Search food"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-xl border border-green-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option>Cooked Meal</option>
            <option>Groceries</option>
            <option>Bakery</option>
            <option>Fruits</option>
            <option>Beverages</option>
            <option>Other</option>
          </select>
          <select
            className="rounded-xl border border-green-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
          >
            <option value={1}>Within 1 km</option>
            <option value={5}>Within 5 km</option>
            <option value={10}>Within 10 km</option>
          </select>
          <button className="btn-primary" onClick={load}>Apply</button>
        </div>
      </div>

      <MapView userLocation={location ? [location.lat, location.lng] : null} donations={filtered} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && <div className="card">No nearby donations found.</div>}
        {filtered.map((d) => (
          <DonationCard
            key={d.id}
            donation={d}
            canRequest={user?.role === "RECEIVER"}
            onRequest={() => requestPickup(d.id)}
          />
        ))}
      </div>
    </div>
  );
}

