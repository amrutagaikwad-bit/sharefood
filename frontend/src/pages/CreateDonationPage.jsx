import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import DonationForm, { buildDonationPayload, fillLocationFromGps } from "../components/DonationForm";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNotifications } from "../context/NotificationContext";
import { geocodeAddressLine } from "../utils/location";

function defaultForm() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  return {
    foodName: "",
    category: "Cooked Meal",
    quantity: "",
    servesCount: 50,
    servingsRemaining: 50,
    description: "",
    image: "",
    latitude: "",
    longitude: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    specialInstructions: "",
    contactPhone: "",
    distributionDate: dateStr,
    pickupStartTime: "10:00",
    pickupEndTime: "18:00",
    expiryTime: `${dateStr}T18:00`
  };
}

export default function CreateDonationPage() {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { location } = useGeolocation();
  const [form, setForm] = useState(defaultForm);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const detectLocation = async () => {
    if (!location) return notify("Enable location permission in your browser");
    setLoadingAddress(true);
    try {
      await fillLocationFromGps(location, setForm);
      notify("GPS location applied");
    } catch {
      notify("Could not resolve address from GPS");
    } finally {
      setLoadingAddress(false);
    }
  };

  const resolveCoordinates = async () => {
    if (form.latitude && form.longitude) {
      return { lat: Number(form.latitude), lng: Number(form.longitude) };
    }
    const hit = await geocodeAddressLine(form.address, form.city, form.state, form.postalCode);
    if (!hit) return null;
    setForm((prev) => ({
      ...prev,
      latitude: hit.lat,
      longitude: hit.lng,
      address: hit.displayName || prev.address,
      city: hit.city || prev.city,
      state: hit.state || prev.state,
      postalCode: hit.postalCode || prev.postalCode
    }));
    return { lat: hit.lat, lng: hit.lng };
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const coords = await resolveCoordinates();
      if (!coords) {
        notify("Set location via GPS or search and select an address");
        return;
      }
      const payload = buildDonationPayload({ ...form, latitude: coords.lat, longitude: coords.lng });
      if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
        notify("Valid map coordinates are required");
        return;
      }
      if (!payload.expiryTime) {
        notify("Set distribution date and expiry time");
        return;
      }
      await api.post("/donations", payload);
      notify("Food donation published — visible on the map now");
      navigate("/dashboard");
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to create donation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 pb-12">
      <form onSubmit={submit} className="glass p-6">
        <h1 className="mb-2 text-3xl font-bold text-primary">Create Food Donation</h1>
        <p className="mb-4 text-sm text-slate-600">Your listing appears on the public map and receiver dashboard immediately.</p>
        <DonationForm form={form} setForm={setForm} onDetectLocation={detectLocation} loadingAddress={loadingAddress} />
        <button type="submit" className="btn-primary mt-4 w-full" disabled={submitting}>
          {submitting ? "Publishing..." : "Create Food Donation"}
        </button>
      </form>
    </div>
  );
}
