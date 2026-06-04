import api from "../api/client";

export async function reverseGeocode(lat, lng) {
  const res = await api.get("/geocode/reverse", { params: { lat, lng } });
  return res.data;
}

export async function searchAddress(query) {
  const res = await api.get("/geocode/search", { params: { q: query } });
  return res.data;
}

export async function geocodeAddressLine(address, city, state, postalCode) {
  const parts = [address, city, state, postalCode].filter(Boolean).join(", ");
  if (!parts.trim()) return null;
  const results = await searchAddress(parts);
  return results[0] || null;
}
