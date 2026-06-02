import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import DonationForm, { fillLocationFromGps } from "../components/DonationForm";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNotifications } from "../context/NotificationContext";

const initial = {
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
  preparationAt: "",
  expiryTime: "",
  pickupStart: "",
  pickupEnd: ""
};

export default function CreateDonationPage() {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { location } = useGeolocation();
  const [form, setForm] = useState(initial);
  const [loadingAddress, setLoadingAddress] = useState(false);

  const detectLocation = async () => {
    if (!location) return notify("Enable location permission");
    setLoadingAddress(true);
    await fillLocationFromGps(location, setForm);
    setLoadingAddress(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      servingsRemaining: form.servingsRemaining ?? form.servesCount
    };
    await api.post("/donations", payload);
    notify("Listing published — live on map instantly");
    navigate("/dashboard");
  };

  return (
    <div className="mx-auto max-w-3xl p-4 pb-12">
      <form onSubmit={submit} className="glass p-6">
        <h1 className="mb-2 text-3xl font-bold text-primary">New food listing</h1>
        <p className="mb-4 text-sm text-slate-600">Each listing can have its own address and GPS coordinates.</p>
        <DonationForm form={form} setForm={setForm} onDetectLocation={detectLocation} loadingAddress={loadingAddress} />
        <button type="submit" className="btn-primary mt-4 w-full">Publish listing</button>
      </form>
    </div>
  );
}
