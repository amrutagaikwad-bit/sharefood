import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import DonationForm, { fillLocationFromGps } from "../components/DonationForm";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNotifications } from "../context/NotificationContext";

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function EditDonationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { location } = useGeolocation();
  const [form, setForm] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  useEffect(() => {
    api.get(`/donations/${id}`).then((res) => {
      const d = res.data;
      setForm({
        foodName: d.foodName,
        category: d.category,
        quantity: d.quantity,
        servesCount: d.servesCount,
        servingsRemaining: d.servingsRemaining,
        description: d.description || "",
        image: d.image || "",
        latitude: d.latitude,
        longitude: d.longitude,
        address: d.address,
        city: d.city || "",
        state: d.state || "",
        postalCode: d.postalCode || "",
        specialInstructions: d.specialInstructions || "",
        contactPhone: d.contactPhone || "",
        preparationAt: toLocalInput(d.preparationAt),
        expiryTime: toLocalInput(d.expiryTime),
        pickupStart: toLocalInput(d.pickupStart),
        pickupEnd: toLocalInput(d.pickupEnd)
      });
    });
  }, [id]);

  const detectLocation = async () => {
    if (!location) return notify("Enable GPS first");
    setLoadingAddress(true);
    await fillLocationFromGps(location, setForm);
    setLoadingAddress(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    await api.put(`/donations/${id}`, form);
    notify("Listing updated — synced everywhere in real time");
    navigate("/dashboard");
  };

  if (!form) return <div className="p-4"><div className="skeleton mx-auto h-96 max-w-3xl" /></div>;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <form onSubmit={submit} className="glass p-6">
        <h1 className="mb-4 text-2xl font-bold">Edit donation listing</h1>
        <DonationForm form={form} setForm={setForm} onDetectLocation={detectLocation} loadingAddress={loadingAddress} submitLabel="Update" />
        <button type="submit" className="btn-primary mt-4 w-full">Save changes</button>
      </form>
    </div>
  );
}
