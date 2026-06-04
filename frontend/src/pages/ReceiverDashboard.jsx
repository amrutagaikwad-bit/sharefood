import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import DonationCard from "../components/DonationCard";
import LocationPicker from "../components/LocationPicker";
import MapView from "../components/MapView";
import StatusBadge from "../components/StatusBadge";
import { useGeolocation } from "../hooks/useGeolocation";
import { useDonationFeed } from "../hooks/useDonationFeed";
import { useNotifications } from "../context/NotificationContext";
import { useSocket } from "../context/SocketContext";
import { useLocationStore } from "../store/locationStore";

export default function ReceiverDashboard() {
  const navigate = useNavigate();
  const { location: gps } = useGeolocation();
  const { lat, lng, setCurrentLocation } = useLocationStore();
  const { notify } = useNotifications();
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);

  const searchLat = lat ?? gps?.lat;
  const searchLng = lng ?? gps?.lng;

  useEffect(() => {
    if (gps && lat == null) setCurrentLocation(gps.lat, gps.lng);
  }, [gps, lat, setCurrentLocation]);

  const { donations, loading } = useDonationFeed({
    lat: searchLat,
    lng: searchLng,
    maxDistance: 25
  });

  const loadRequests = async () => {
    const [dash, reqs] = await Promise.all([
      api.get("/dashboard", { params: { lat: searchLat, lng: searchLng } }),
      api.get("/bookings/mine")
    ]);
    setStats(dash.data);
    setRequests(reqs.data);
  };

  useEffect(() => { loadRequests(); }, [searchLat, searchLng]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => loadRequests();
    socket.on("donation:created", refresh);
    socket.on("donation:updated", refresh);
    socket.on("donation:servings", refresh);
    socket.on("booking:created", refresh);
    socket.on("request:created", refresh);
    socket.on("request:updated", refresh);
    socket.on("booking:updated", refresh);
    return () => {
      socket.off("donation:created", refresh);
      socket.off("donation:updated", refresh);
      socket.off("donation:servings", refresh);
      socket.off("booking:created", refresh);
      socket.off("request:created", refresh);
      socket.off("request:updated", refresh);
      socket.off("booking:updated", refresh);
    };
  }, [socket]);

  const cancelRequest = async (id) => {
    await api.patch(`/bookings/${id}/cancel`);
    notify("Booking cancelled — servings restored");
    loadRequests();
  };

  const requestPickup = async (donationId, amount = 1) => {
    try {
      await api.post("/bookings", { donationId, peopleToServe: amount });
      notify(`Booked ${amount} servings — pending donor confirmation`);
      loadRequests();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed");
    }
  };

  const activeStatuses = ["PENDING", "CONFIRMED", "ACCEPTED", "RESERVED", "Pending", "Confirmed"];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Receiver Hub</h1>
          <p className="text-sm text-slate-600">Find food near your chosen location</p>
        </div>
        <div className="flex gap-2">
          <Link to="/bookings" className="btn-secondary">My bookings</Link>
          <Link to="/map" className="btn-primary">Full map view</Link>
        </div>
      </div>

      <LocationPicker />

      {searchLat && searchLng && (
        <section className="glass overflow-hidden p-2">
          <h2 className="mb-2 px-2 text-lg font-semibold">Nearby on map</h2>
          <MapView
            userLocation={[searchLat, searchLng]}
            donations={donations}
            onSelect={(d) => navigate(`/donations/${d.id}`)}
          />
        </section>
      )}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="glass text-center"><p className="text-2xl font-bold text-primary">{stats.requestedPickups}</p><p className="text-sm">Active</p></div>
          <div className="glass text-center"><p className="text-2xl font-bold text-primary">{stats.pickupHistory}</p><p className="text-sm">Completed</p></div>
          <div className="glass text-center"><p className="text-2xl font-bold text-primary">{donations.length}</p><p className="text-sm">Nearby now</p></div>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Nearby donations (live)</h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-72" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {donations.map((d) => (
              <div key={d.id}>
                <DonationCard donation={d} canRequest={false} />
                <button type="button" className="btn-primary mt-2 w-full text-sm" onClick={() => requestPickup(d.id, 1)}>Reserve 1 serving</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass">
        <h2 className="text-lg font-semibold">My reservations</h2>
        <div className="mt-3 space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-slate-700">
              <div>
                <p className="font-medium">{r.donation?.foodName} — {r.peopleToServe ?? r.servingsReserved} people</p>
                <StatusBadge status={r.internalStatus || r.status} />
                <p className="text-xs text-slate-500">
                  {r.bookingDateTime ? new Date(r.bookingDateTime).toLocaleString() : ""}
                </p>
              </div>
              {activeStatuses.includes(r.status) || activeStatuses.includes(r.internalStatus) ? (
                <button type="button" className="btn-secondary text-sm" onClick={() => cancelRequest(r.id)}>Cancel</button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
