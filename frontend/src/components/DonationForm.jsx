import { useState } from "react";
import { MapPin, Search, Upload } from "lucide-react";
import { reverseGeocode, searchAddress } from "../utils/location";

const categories = ["Cooked Meal", "Groceries", "Bakery", "Fruits", "Beverages", "Other"];

export default function DonationForm({ form, setForm, onDetectLocation, loadingAddress }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const onImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("image", String(reader.result));
    reader.readAsDataURL(file);
  };

  const searchManualAddress = async () => {
    const q = addressQuery.trim() || form.address?.trim();
    if (!q || q.length < 2) return;
    setSearchingAddress(true);
    try {
      const results = await searchAddress(q);
      setAddressResults(results);
    } finally {
      setSearchingAddress(false);
    }
  };

  const pickAddress = (r) => {
    setForm((prev) => ({
      ...prev,
      latitude: r.lat,
      longitude: r.lng,
      address: r.displayName,
      city: r.city || prev.city,
      state: r.state || prev.state,
      postalCode: r.postalCode || prev.postalCode
    }));
    setAddressResults([]);
    setAddressQuery(r.city || r.displayName.split(",")[0]);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input-field" placeholder="Food name *" required value={form.foodName} onChange={(e) => set("foodName", e.target.value)} />
        <select className="input-field" value={form.category} onChange={(e) => set("category", e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="input-field" placeholder="Quantity available *" required value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
        <input className="input-field" type="number" min="1" placeholder="People that can be served *" required value={form.servesCount} onChange={(e) => set("servesCount", e.target.value)} />
        <input className="input-field" type="number" min="0" placeholder="Servings remaining" value={form.servingsRemaining ?? form.servesCount} onChange={(e) => set("servingsRemaining", e.target.value)} />
      </div>

      <textarea className="input-field" rows={3} placeholder="Food description" value={form.description || ""} onChange={(e) => set("description", e.target.value)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input-field" placeholder="Image URL" value={form.image || ""} onChange={(e) => set("image", e.target.value)} />
        <label className="input-field flex cursor-pointer items-center gap-2">
          <Upload size={16} /> Upload image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageFile(e.target.files?.[0])} />
        </label>
      </div>

      <div className="rounded-xl border border-dashed border-primary/30 p-4 space-y-3">
        <p className="text-sm font-medium text-primary">Location *</p>
        <button type="button" className="btn-secondary flex items-center gap-2" onClick={onDetectLocation}>
          <MapPin size={16} /> Use current GPS location
        </button>
        {loadingAddress && <p className="text-sm">Fetching address from GPS...</p>}

        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Search address (city, area, pincode...)"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchManualAddress())}
          />
          <button type="button" className="btn-secondary flex items-center gap-1" onClick={searchManualAddress}>
            <Search size={16} /> {searchingAddress ? "..." : "Find"}
          </button>
        </div>

        {addressResults.length > 0 && (
          <ul className="max-h-40 overflow-y-auto rounded-xl border dark:border-slate-700">
            {addressResults.map((r, i) => (
              <li key={i}>
                <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10" onClick={() => pickAddress(r)}>
                  {r.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input-field sm:col-span-2" placeholder="Full address *" required value={form.address} onChange={(e) => set("address", e.target.value)} />
          <input className="input-field" placeholder="City" value={form.city || ""} onChange={(e) => set("city", e.target.value)} />
          <input className="input-field" placeholder="State" value={form.state || ""} onChange={(e) => set("state", e.target.value)} />
          <input className="input-field" placeholder="Postal code" value={form.postalCode || ""} onChange={(e) => set("postalCode", e.target.value)} />
          <input className="input-field" placeholder="Contact information *" required value={form.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} />
        </div>
        {form.latitude && form.longitude && (
          <p className="text-xs text-green-700 dark:text-green-400">
            Coordinates set: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
          </p>
        )}
        {!form.latitude && form.address && (
          <p className="text-xs text-amber-700 dark:text-amber-300">Search and pick an address, or use GPS, so the listing appears on the map.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Distribution date *
          <input className="input-field mt-1" type="date" required value={form.distributionDate || ""} onChange={(e) => set("distributionDate", e.target.value)} />
        </label>
        <label className="text-sm">Available until (expiry) *
          <input className="input-field mt-1" type="datetime-local" required value={form.expiryTime || ""} onChange={(e) => set("expiryTime", e.target.value)} />
        </label>
        <label className="text-sm">Start time *
          <input className="input-field mt-1" type="time" required value={form.pickupStartTime || ""} onChange={(e) => set("pickupStartTime", e.target.value)} />
        </label>
        <label className="text-sm">End time *
          <input className="input-field mt-1" type="time" required value={form.pickupEndTime || ""} onChange={(e) => set("pickupEndTime", e.target.value)} />
        </label>
      </div>

      <textarea className="input-field" rows={2} placeholder="Special instructions" value={form.specialInstructions || ""} onChange={(e) => set("specialInstructions", e.target.value)} />
    </div>
  );
}

export async function fillLocationFromGps(location, setForm) {
  const geo = await reverseGeocode(location.lat, location.lng);
  setForm((prev) => ({
    ...prev,
    latitude: location.lat,
    longitude: location.lng,
    address: geo.address,
    city: geo.city,
    state: geo.state,
    postalCode: geo.postalCode
  }));
}

export function buildDonationPayload(form) {
  const serves = Number(form.servesCount) || 1;
  let pickupStart = form.pickupStart;
  let pickupEnd = form.pickupEnd;
  let expiryTime = form.expiryTime;

  if (form.distributionDate && form.pickupStartTime) {
    pickupStart = `${form.distributionDate}T${form.pickupStartTime}`;
  }
  if (form.distributionDate && form.pickupEndTime) {
    pickupEnd = `${form.distributionDate}T${form.pickupEndTime}`;
  }
  if (form.distributionDate && !expiryTime) {
    const end = form.pickupEndTime || "23:59";
    expiryTime = `${form.distributionDate}T${end}`;
  }

  const toIso = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  return {
    foodName: form.foodName?.trim(),
    category: form.category,
    quantity: String(form.quantity).trim(),
    servesCount: serves,
    servingsRemaining: form.servingsRemaining != null ? Number(form.servingsRemaining) : serves,
    description: form.description,
    image: form.image,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    address: form.address?.trim(),
    city: form.city,
    state: form.state,
    postalCode: form.postalCode,
    specialInstructions: form.specialInstructions,
    contactPhone: form.contactPhone,
    preparationAt: toIso(form.preparationAt || (form.distributionDate ? `${form.distributionDate}T00:00` : null)),
    expiryTime: toIso(expiryTime),
    pickupStart: toIso(pickupStart),
    pickupEnd: toIso(pickupEnd)
  };
}
