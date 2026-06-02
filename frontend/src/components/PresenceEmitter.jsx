import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function PresenceEmitter() {
  const { user } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("presence", { userId: user.id, name: user.name, role: user.role });
  }, [socket, user]);

  return null;
}
