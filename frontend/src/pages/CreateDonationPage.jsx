import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useGeolocation } from "../hooks/useGeolocation";
import { reverseGeocode } from "../utils/location";
import { useNotifications } from "../context/NotificationContext";

const categories = ["Cooked Meal", "Groceries", "Bakery", "Fruits", "Beverages", "Other"];

export default function CreateDonationPage() {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { location } = useGeolocation();
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [form, setForm] = useState({
    foodName: "",
    category: "Cooked Meal",
    quantity: "",
    description: "",
    image: "",
    latitude: "",
    longitude: "",
    address: "",
    pickupInstructions: "",
    expiryTime: ""
  });

  const detectLocation = async () => {
    if (!location) return;
    setLoadingAddress(true);
    const address = await reverseGeocode(location.lat, location.lng);
    setForm((prev) => ({ ...prev, latitude: location.lat, longitude: location.lng, address }));
    setLoadingAddress(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/donations", form);
    notify("Donation created successfully");
    navigate("/dashboard");
  };

  const onImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <form onSubmit={submit} className="card space-y-3">
        <h1 className="text-2xl font-bold">Create Donation</h1>
        <input
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          placeholder="Food Name"
          onChange={(e) => setForm({ ...form, foodName: e.target.value })}
        />
        <select
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          placeholder="Quantity"
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <textarea
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          placeholder="Description"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          placeholder="Image URL (optional)"
          onChange={(e) => setForm({ ...form, image: e.target.value })}
        />
        <input
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 file:rounded-xl file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:file:bg-primary/20 dark:file:text-primary"
          type="file"
          accept="image/*"
          onChange={(e) => onImageFile(e.target.files?.[0])}
        />
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={detectLocation}>Use Current Location</button>
          {loadingAddress && <span className="text-sm">Fetching address...</span>}
        </div>
        <input
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <input
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          placeholder="Pickup Instructions"
          onChange={(e) => setForm({ ...form, pickupInstructions: e.target.value })}
        />
        <input
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          type="datetime-local"
          onChange={(e) => setForm({ ...form, expiryTime: e.target.value })}
        />
        <button className="btn-primary">Publish Donation</button>
      </form>
    </div>
  );
}

