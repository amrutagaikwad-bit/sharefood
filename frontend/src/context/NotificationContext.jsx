import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [items, setItems] = useState([]);
  const [toasts, setToasts] = useState([]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const res = await api.get("/notifications");
    setItems(res.data);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket || !user) return;
    const refresh = () => fetchNotifications();
    socket.on("donation:created", refresh);
    socket.on("request:created", refresh);
    socket.on("request:updated", refresh);
    return () => {
      socket.off("donation:created", refresh);
      socket.off("request:created", refresh);
      socket.off("request:updated", refresh);
    };
  }, [socket, user, fetchNotifications]);

  const notify = (message) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [{ id, message }, ...prev].slice(0, 5));
    setTimeout(() => setToasts((prev) => prev.filter((n) => n.id !== id)), 4000);
  };

  const value = useMemo(
    () => ({ items, toasts, notify, fetchNotifications, unreadCount: items.filter((i) => !i.read).length }),
    [items, toasts, fetchNotifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
