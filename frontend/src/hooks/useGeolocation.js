import { useEffect, useState } from "react";

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
      () => setError("Unable to detect location.")
    );
  }, []);

  return { location, error };
}

