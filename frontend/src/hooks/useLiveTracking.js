import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useLiveGeolocation } from "./useLiveGeolocation";

/**
 * Join tracking:<bookingId> room, emit GPS every 5s, receive peer updates.
 */
export function useLiveTracking({ bookingId, userId, role, name, enabled = true }) {
  const { socket, connected } = useSocket();
  const [peers, setPeers] = useState({});
  const joined = useRef(false);
  const { position, error: gpsError, watching } = useLiveGeolocation(enabled && !!bookingId);

  const upsertPeer = useCallback((entry) => {
    if (!entry?.userId || Number(entry.userId) === Number(userId)) return;
    setPeers((prev) => ({
      ...prev,
      [entry.userId]: {
        userId: entry.userId,
        role: entry.role,
        name: entry.name,
        lat: entry.latitude ?? entry.lat,
        lng: entry.longitude ?? entry.lng,
        timestamp: entry.timestamp
      }
    }));
  }, [userId]);

  useEffect(() => {
    if (!socket || !bookingId || !userId || !enabled) return undefined;

    const onSnapshot = ({ locations }) => {
      (locations || []).forEach(upsertPeer);
    };
    const onUpdate = (entry) => upsertPeer(entry);
    const onLeft = ({ userId: leftId }) => {
      setPeers((prev) => {
        const next = { ...prev };
        delete next[leftId];
        return next;
      });
    };

    socket.on("location:snapshot", onSnapshot);
    socket.on("location:update", onUpdate);
    socket.on("location:left", onLeft);

    if (!joined.current) {
      socket.emit("location:join", { bookingId, userId, role, name });
      joined.current = true;
    }

    return () => {
      socket.off("location:snapshot", onSnapshot);
      socket.off("location:update", onUpdate);
      socket.off("location:left", onLeft);
      socket.emit("location:leave", { bookingId, userId });
      joined.current = false;
      setPeers({});
    };
  }, [socket, bookingId, userId, role, name, enabled, upsertPeer]);

  useEffect(() => {
    if (!socket || !position || !bookingId || !userId) return;
    socket.emit("location:update", {
      bookingId,
      userId,
      role,
      name,
      latitude: position.lat,
      longitude: position.lng
    });
  }, [socket, position, bookingId, userId, role, name]);

  return {
    myPosition: position,
    peers: Object.values(peers),
    gpsError,
    watching,
    connected
  };
}
