import { useEffect, useRef, useState } from "react";

const GPS_ERRORS = {
  1: "GPS permission denied. Enable location access in your browser settings.",
  2: "GPS unavailable. Your device could not determine location.",
  3: "Location request timed out. Try again outdoors or check GPS signal."
};

/**
 * Continuous GPS via watchPosition — updates every ~5 seconds.
 */
export function useLiveGeolocation(enabled = true, intervalMs = 5000) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState("");
  const [watching, setWatching] = useState(false);
  const watchId = useRef(null);
  const lastEmit = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      setWatching(false);
      return undefined;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return undefined;
    }

    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const now = Date.now();
        if (now - lastEmit.current < intervalMs) return;
        lastEmit.current = now;
        setPosition({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
        setError("");
        setWatching(true);
      },
      (err) => {
        setError(GPS_ERRORS[err.code] || "Unable to get GPS location.");
        setWatching(false);
      },
      { enableHighAccuracy: true, maximumAge: intervalMs, timeout: 15000 }
    );

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      setWatching(false);
    };
  }, [enabled, intervalMs]);

  return { position, error, watching };
}
