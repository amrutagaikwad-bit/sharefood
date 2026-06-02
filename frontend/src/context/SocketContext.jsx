import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const instance = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    instance.on("connect", () => setConnected(true));
    instance.on("disconnect", () => setConnected(false));
    setSocket(instance);
    return () => instance.disconnect();
  }, []);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
