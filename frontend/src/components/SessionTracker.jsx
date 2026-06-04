import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

/** Sends live page + presence data to admin monitoring */
export default function SessionTracker() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("presence", {
      userId: user.id,
      name: user.name,
      role: user.role,
      page: location.pathname,
      userAgent: navigator.userAgent
    });
  }, [socket, user, location.pathname]);

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("pageview", { userId: user.id, page: location.pathname });
  }, [socket, user, location.pathname]);

  return null;
}
