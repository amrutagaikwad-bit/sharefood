export async function reverseGeocode(lat, lng) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await response.json();
  const addr = data.address || {};

  return {
    address: data.display_name || "Unknown location",
    city: addr.city || addr.town || addr.village || addr.suburb || "",
    state: addr.state || "",
    postalCode: addr.postcode || ""
  };
}
