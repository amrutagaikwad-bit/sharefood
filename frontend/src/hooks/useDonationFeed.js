import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import { useSocket } from "../context/SocketContext";

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function enrichWithDistance(donations, lat, lng) {
  const userLat = Number(lat);
  const userLng = Number(lng);
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) return donations;
  return donations.map((d) => {
    const distanceKm = haversineKm(userLat, userLng, Number(d.latitude), Number(d.longitude));
    return { ...d, distanceKm, walkingTimeMinutes: Math.round((distanceKm / 5) * 60) };
  });
}

export function useDonationFeed({
  lat,
  lng,
  maxDistance = 25,
  category = "",
  q = "",
  minServings = 0,
  sort = "distance",
  donorName = ""
}) {
  const { socket } = useSocket();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/donations", {
        params: {
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          maxDistance,
          category: category || undefined,
          q: q || undefined,
          minServings,
          sort,
          donorName: donorName || undefined
        }
      });
      let list = res.data;
      if (lat != null && lng != null) {
        list = enrichWithDistance(list, lat, lng);
        if (sort === "distance") list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      }
      setDonations(list);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load donations. Is the backend running?");
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, maxDistance, category, q, minServings, sort, donorName]);

  useEffect(() => {
    load();
  }, [load]);

  const shouldHide = (d) =>
    d.isPaused || d.isHidden || d.status === "DELETED" || d.status === "EXPIRED" || (d.servingsRemaining ?? 0) < minServings;

  const mergeIncoming = useCallback(
    (incoming) => {
      if (shouldHide(incoming)) {
        return (prev) => prev.filter((x) => x.id !== incoming.id);
      }
      let item = incoming;
      if (lat != null && lng != null) {
        [item] = enrichWithDistance([incoming], lat, lng);
        if (item.distanceKm > maxDistance) {
          return (prev) => prev.filter((x) => x.id !== incoming.id);
        }
      }
      return (prev) => {
        const exists = prev.some((x) => x.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((x) => (x.id === item.id ? { ...x, ...item } : x));
      };
    },
    [lat, lng, maxDistance, minServings]
  );

  useEffect(() => {
    if (!socket) return;

    const onCreated = (d) => setDonations(mergeIncoming(d));
    const onUpdated = (d) => setDonations(mergeIncoming(d));
    const onServings = ({ donationId, servingsRemaining, servesCount }) =>
      setDonations((prev) =>
        prev
          .map((x) =>
            x.id === donationId ? { ...x, servingsRemaining, servesCount } : x
          )
          .filter((x) => !shouldHide(x))
      );
    const onDeleted = ({ id }) => setDonations((prev) => prev.filter((x) => x.id !== id));
    const onExpired = ({ ids }) => setDonations((prev) => prev.filter((x) => !ids.includes(x.id)));

    socket.on("donation:created", onCreated);
    socket.on("donation:updated", onUpdated);
    socket.on("donation:servings", onServings);
    socket.on("donation:deleted", onDeleted);
    socket.on("donation:expired", onExpired);

    return () => {
      socket.off("donation:created", onCreated);
      socket.off("donation:updated", onUpdated);
      socket.off("donation:servings", onServings);
      socket.off("donation:deleted", onDeleted);
      socket.off("donation:expired", onExpired);
    };
  }, [socket, mergeIncoming, minServings]);

  return { donations, loading, error, reload: load };
}
