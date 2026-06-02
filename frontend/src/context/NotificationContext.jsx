import { createContext, useContext, useMemo, useState } from "react";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);

  const notify = (message) => {
    const id = crypto.randomUUID();
    setItems((prev) => [{ id, message }, ...prev].slice(0, 5));
    setTimeout(() => {
      setItems((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  };

  const value = useMemo(() => ({ items, notify }), [items]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}

