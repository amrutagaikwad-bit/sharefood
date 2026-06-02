import { MapPin, Upload } from "lucide-react";

const categories = ["Cooked Meal", "Groceries", "Bakery", "Fruits", "Beverages", "Other"];

export default function DonationForm({ form, setForm, onDetectLocation, loadingAddress, submitLabel = "Save" }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("image", String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input-field" placeholder="Food name *" required value={form.foodName} onChange={(e) => set("foodName", e.target.value)} />
        <select className="input-field" value={form.category} onChange={(e) => set("category", e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="input-field" placeholder="Quantity *" required value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
        <input className="input-field" type="number" min="1" placeholder="Total servings *" required value={form.servesCount} onChange={(e) => set("servesCount", e.target.value)} />
        <input className="input-field" type="number" min="0" placeholder="Servings remaining" value={form.servingsRemaining ?? form.servesCount} onChange={(e) => set("servingsRemaining", e.target.value)} />
      </div>

      <textarea className="input-field" rows={3} placeholder="Description" value={form.description || ""} onChange={(e) => set("description", e.target.value)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input-field" placeholder="Image URL" value={form.image || ""} onChange={(e) => set("image", e.target.value)} />
        <label className="input-field flex cursor-pointer items-center gap-2">
          <Upload size={16} /> Upload image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageFile(e.target.files?.[0])} />
        </label>
      </div>

      <div className="rounded-xl border border-dashed border-primary/30 p-4">
        <button type="button" className="btn-secondary flex items-center gap-2" onClick={onDetectLocation}>
          <MapPin size={16} /> Detect GPS for this listing
        </button>
        {loadingAddress && <p className="mt-2 text-sm">Fetching address...</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input className="input-field sm:col-span-2" placeholder="Address *" required value={form.address} onChange={(e) => set("address", e.target.value)} />
          <input className="input-field" placeholder="City" value={form.city || ""} onChange={(e) => set("city", e.target.value)} />
          <input className="input-field" placeholder="State" value={form.state || ""} onChange={(e) => set("state", e.target.value)} />
          <input className="input-field" placeholder="Postal code" value={form.postalCode || ""} onChange={(e) => set("postalCode", e.target.value)} />
          <input className="input-field" placeholder="Contact number *" required value={form.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Preparation<input className="input-field mt-1" type="datetime-local" value={form.preparationAt || ""} onChange={(e) => set("preparationAt", e.target.value)} /></label>
        <label className="text-sm">Expiry *<input className="input-field mt-1" type="datetime-local" required value={form.expiryTime || ""} onChange={(e) => set("expiryTime", e.target.value)} /></label>
        <label className="text-sm">Pickup start<input className="input-field mt-1" type="datetime-local" value={form.pickupStart || ""} onChange={(e) => set("pickupStart", e.target.value)} /></label>
        <label className="text-sm">Pickup end<input className="input-field mt-1" type="datetime-local" value={form.pickupEnd || ""} onChange={(e) => set("pickupEnd", e.target.value)} /></label>
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
