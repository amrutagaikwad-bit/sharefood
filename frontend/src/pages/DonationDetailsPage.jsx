import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Phone, Clock } from "lucide-react";
import api from "../api/client";
import BookingForm from "../components/BookingForm";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

export default function DonationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [data, setData] = useState(null);
<<<<<<< HEAD

  const load = () => api.get(`/donations/${id}`).then((res) => setData(res.data));

  useEffect(() => { load(); }, [id]);

=======

  const load = () => api.get(`/donations/${id}`).then((res) => setData(res.data));

  useEffect(() => {
    load();
  }, [id]);

>>>>>>> ffc4eea (kkr)
  const reportDonation = async () => {
    await api.post(`/donations/${id}/report`, { reason: "User reported" });
    notify("Donation reported to admin");
  };

  if (!data) return <div className="mx-auto max-w-4xl p-4"><div className="skeleton h-96" /></div>;

  const contact = data.contactPhone || data.donor?.phone || data.donor?.email;
  const canBook =
    user?.role === "RECEIVER" &&
    ["ACTIVE", "REQUESTED", "RESERVED"].includes(data.status) &&
    data.servingsRemaining > 0 &&
    !data.isPaused;

  return (
    <div className="mx-auto max-w-4xl p-4">
      <article className="glass fade-in grid gap-6 md:grid-cols-2">
        <img
          src={data.image || "https://images.unsplash.com/photo-1490645935967-10de6ba17061"}
          alt={data.foodName}
          className="h-72 w-full rounded-2xl object-cover md:h-full"
        />
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-3xl font-bold">{data.foodName}</h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="text-slate-600 dark:text-slate-300">{data.description}</p>
          <p><strong>Category:</strong> {data.category}</p>
          <p><strong>Quantity:</strong> {data.quantity}</p>
          <p><strong>Servings:</strong> <span className="font-bold text-primary">{data.servingsRemaining}</span> / {data.servesCount} available</p>
          <p className="flex items-center gap-1"><MapPin size={16} /> {data.address}</p>
          <p className="flex items-center gap-1"><Clock size={16} /> Expires: {new Date(data.expiryTime).toLocaleString()}</p>
          {data.pickupStart && <p>Pickup window: {new Date(data.pickupStart).toLocaleString()} — {new Date(data.pickupEnd).toLocaleString()}</p>}
          <p><strong>Donor:</strong> {data.donor?.name}</p>
          {contact && (
            <a href={`tel:${contact}`} className="btn-secondary inline-flex items-center gap-2">
              <Phone size={16} /> Contact Donor
            </a>
          )}
<<<<<<< HEAD
          {user?.role === "RECEIVER" && data.status === "ACTIVE" && data.servingsRemaining > 0 && (
            <BookingForm
              donation={data}
              onSuccess={() => {
                notify("Booking submitted — awaiting donor confirmation");
                load();
                navigate("/bookings");
              }}
              onError={(msg) => notify(msg)}
            />
          )}
          {!user && data.servingsRemaining > 0 && (
            <button className="btn-primary w-full" onClick={() => navigate("/auth")}>Login to book food</button>
          )}
=======
          {canBook ? (
            <BookingForm
              donationId={id}
              maxServings={data.servingsRemaining}
              onSuccess={() => {
                notify("Booking submitted — waiting for donor confirmation");
                load();
              }}
              onError={(msg) => notify(msg)}
            />
          ) : !user ? (
            <button className="btn-primary w-full" type="button" onClick={() => navigate("/auth")}>
              Sign in to book food
            </button>
          ) : null}
>>>>>>> ffc4eea (kkr)
          <button className="text-sm text-red-600 underline" type="button" onClick={reportDonation}>Report this listing</button>
        </div>
      </article>
    </div>
  );
}
