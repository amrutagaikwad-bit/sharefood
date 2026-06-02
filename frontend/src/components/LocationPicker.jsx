import { useState } from "react";
import { MapPin, Navigation, Search } from "lucide-react";
import api from "../api/client";
import { useGeolocation } from "../hooks/useGeolocation";
import { useLocationStore } from "../store/locationStore";

export default function LocationPicker() {
  const { location } = useGeolocation();
  const { mode, label, setCurrentLocation, setSearchLocation } = useLocationStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const useCurrent = () => {
    if (!location) return;
    setCurrentLocation(location.lat, location.lng);
  };

  const search = async () => {
    if (query.length < 2) return;
    setSearching(true);
    try {
      const res = await api.get("/geocode/search", { params: { q: query } });
      setResults(res.data);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (r) => {
    setSearchLocation({
      lat: r.lat,
      lng: r.lng,
      label: r.displayName,
      city: r.city
    });
    setResults([]);
    setQuery(r.city || r.displayName.split(",")[0]);
  };

  return (
    <div className="glass space-y-3 p-4">
      <h3 className="font-semibold text-primary">Your search location</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        <MapPin className="mr-1 inline" size={14} />
        {label || "Set location to find nearby food"}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary flex items-center gap-2 text-sm" onClick={useCurrent}>
          <Navigation size={16} /> Use current location
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Search city, area, pincode (Pune, Mumbai, 411001...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button type="button" className="btn-secondary flex items-center gap-1" onClick={search}>
          <Search size={16} /> {searching ? "..." : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-xl border dark:border-slate-700">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10"
                onClick={() => pickResult(r)}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode === "search" && <p className="text-xs text-secondary">Searching near selected location</p>}
    </div>
  );
}
