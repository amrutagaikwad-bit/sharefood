import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Phone, Clock } from "lucide-react";
import api from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

export default function DonationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [data, setData] = useState(null);
  const [pickupSlot, setPickupSlot] = useState("");
  const [servings, setServings] = useState(1);

  useEffect(() => {
    api.get(`/donations/${id}`).then((res) => setData(res.data));
  }, [id]);

  const requestPickup = async () => {
    if (!user) return navigate("/auth");
    try {
      await api.post("/requests", {
        donationId: Number(id),
        pickupSlot: pickupSlot || undefined,
        servingsReserved: Number(servings)
      });
      notify("Pickup requested successfully");
    } catch (err) {
      notify(err?.response?.data?.message || "Request failed");
    }
  };

  const reportDonation = async () => {
    await api.post(`/donations/${id}/report`, { reason: "User reported" });
    notify("Donation reported to admin");
  };

  if (!data) return <div className="mx-auto max-w-4xl p-4"><div className="skeleton h-96" /></div>;

  const contact = data.contactPhone || data.donor?.phone || data.donor?.email;

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
          <p><strong>City:</strong> {data.city} {data.state} {data.postalCode}</p>
          <p className="flex items-center gap-1"><Clock size={16} /> Expires: {new Date(data.expiryTime).toLocaleString()}</p>
          {data.pickupStart && <p>Pickup window: {new Date(data.pickupStart).toLocaleString()} — {new Date(data.pickupEnd).toLocaleString()}</p>}
          <p><strong>Instructions:</strong> {data.specialInstructions || "Contact donor"}</p>
          <p><strong>Donor:</strong> {data.donor?.name}</p>
          {contact && (
            <a href={`tel:${contact}`} className="btn-secondary inline-flex items-center gap-2">
              <Phone size={16} /> Contact Donor
            </a>
          )}
          {user?.role === "RECEIVER" && data.status === "ACTIVE" && data.servingsRemaining > 0 && (
            <div className="space-y-2 pt-2">
              <input className="input-field" type="number" min={1} max={data.servingsRemaining} value={servings} onChange={(e) => setServings(e.target.value)} placeholder="Servings to reserve" />
              <input className="input-field" type="datetime-local" value={pickupSlot} onChange={(e) => setPickupSlot(e.target.value)} />
              <button className="btn-primary w-full" onClick={requestPickup}>Reserve servings</button>
            </div>
          )}
          <button className="text-sm text-red-600 underline" onClick={reportDonation}>Report this listing</button>
        </div>
      </article>
    </div>
  );
}
