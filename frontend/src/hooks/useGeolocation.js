import { useEffect, useState } from "react";

const GPS_ERRORS = {
  1: "GPS permission denied. Enable location in browser settings.",
  2: "GPS unavailable on this device.",
  3: "Location request timed out."
};

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocation({ lat: coords.latitude, lng: coords.longitude }),
      (err) => setError(GPS_ERRORS[err.code] || "Unable to detect location."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  return { location, error };
}
