import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import DonationCard from "../components/DonationCard";
import LocationPicker from "../components/LocationPicker";
import MapView from "../components/MapView";
import { useGeolocation } from "../hooks/useGeolocation";
import { useDonationFeed } from "../hooks/useDonationFeed";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { useLocationStore } from "../store/locationStore";

const distances = [1, 3, 5, 10, 25];

export default function MapBrowsePage() {
  const { location: gps } = useGeolocation();
  const { lat, lng, setCurrentLocation } = useLocationStore();
  const { user } = useAuth();
  const { notify } = useNotifications();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [maxDistance, setgiMaxDistance] = useState(10);
  const [minServings, setMinServings] = useState(0);
  const [sort, setSort] = useState("distance");
  const [donorName, setDonorName] = useState("");
  const [servingsToReserve, setServingsToReserve] = useState({});

  useEffect(() => {
    if (gps && (lat == null || lng == null)) {
      setCurrentLocation(gps.lat, gps.lng);
    }
  }, [gps, lat, lng, setCurrentLocation]);

  const searchLat = lat ?? gps?.lat;
  const searchLng = lng ?? gps?.lng;

  const { donations, loading, error, reload } = useDonationFeed({
    lat: searchLat,
    lng: searchLng,
    maxDistance,
    category,
    q: query,
    minServings,
    sort,
    donorName
  });

  const requestPickup = async (donationId) => {
    if (!user) return navigate("/auth");
    if (user.role !== "RECEIVER") return notify("Only receivers can reserve food");
    const amount = Number(servingsToReserve[donationId] || 1);
    try {
      await api.post("/bookings", { donationId, peopleToServe: amount });
      notify(`Booked ${amount} servings — pending donor confirmation`);
    } catch (err) {
      notify(err?.response?.data?.message || "Reservation failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <LocationPicker />

      <div className="glass space-y-3 p-5">
        <h1 className="text-2xl font-bold">Discover food near you</h1>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <input className="input-field" placeholder="Food, area, city..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <input className="input-field" placeholder="Donor name" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All types</option>
            <option>Cooked Meal</option><option>Groceries</option><option>Bakery</option>
            <option>Fruits</option><option>Beverages</option><option>Other</option>
          </select>
          <select className="input-field" value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))}>
            {distances.map((d) => <option key={d} value={d}>Within {d} km</option>)}
          </select>
          <select className="input-field" value={minServings} onChange={(e) => setMinServings(Number(e.target.value))}>
            <option value={1}>1+ servings</option>
            <option value={5}>5+ servings</option>
            <option value={10}>10+ servings</option>
            <option value={20}>20+ servings</option>
          </select>
          <select className="input-field" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="distance">Nearest</option>
            <option value="recent">Recently added</option>
            <option value="expiry">Expiring soon</option>
          </select>
        </div>
      </div>

      <MapView userLocation={searchLat && searchLng ? [searchLat, searchLng] : null} donations={donations} onSelect={(d) => navigate(`/donations/${d.id}`)} />

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p>{error}</p>
          <button type="button" className="btn-secondary mt-2 text-sm" onClick={reload}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-80" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {donations.length === 0 && <div className="card col-span-full text-center">No food found. Try another city or distance.</div>}
          {donations.map((d) => (
            <div key={d.id} className="space-y-2">
              <DonationCard donation={d} canRequest={false} />
              {user?.role === "RECEIVER" && d.status === "ACTIVE" && d.servingsRemaining > 0 && (
                <div className="flex gap-2 px-1">
                  <input
                    type="number"
                    min={1}
                    max={d.servingsRemaining}
                    className="input-field w-24"
                    value={servingsToReserve[d.id] || 1}
                    onChange={(e) => setServingsToReserve((s) => ({ ...s, [d.id]: e.target.value }))}
                  />
                  <button className="btn-primary flex-1 text-sm" onClick={() => requestPickup(d.id)}>
                    Reserve servings
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
