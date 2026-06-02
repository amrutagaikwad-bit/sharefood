import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import { useSocket } from "../context/SocketContext";

export function useDonationFeed({
  lat,
  lng,
  maxDistance = 10,
  category = "",
  q = "",
  minServings = 1,
  sort = "distance",
  donorName = ""
}) {
  const { socket } = useSocket();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
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
      setDonations(res.data);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, maxDistance, category, q, minServings, sort, donorName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;

    const onCreated = (d) => setDonations((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
    const onUpdated = (d) =>
      setDonations((prev) => {
        const filtered = d.isPaused || d.isHidden || d.status === "DELETED" || d.status === "EXPIRED"
          ? prev.filter((x) => x.id !== d.id)
          : prev;
        const exists = filtered.some((x) => x.id === d.id);
        if (!exists && !d.isPaused && !d.isHidden) return [d, ...filtered];
        return filtered.map((x) => (x.id === d.id ? { ...x, ...d } : x));
      });
    const onServings = ({ donationId, servingsRemaining, servesCount }) =>
      setDonations((prev) =>
        prev.map((x) =>
          x.id === donationId ? { ...x, servingsRemaining, servesCount } : x
        ).filter((x) => x.servingsRemaining > 0 && !x.isPaused)
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
  }, [socket]);

  return { donations, loading, reload: load };
}
