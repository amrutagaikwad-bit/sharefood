import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/env.js";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!SOCKET_URL) return undefined;

    const instance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true
    });
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
