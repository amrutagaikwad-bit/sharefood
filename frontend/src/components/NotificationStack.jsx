import { Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationStack() {
  const { items } = useNotifications();
  return (
    <div className="fixed right-3 top-20 z-50 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm text-white shadow-lg">
          <Bell size={16} />
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}

