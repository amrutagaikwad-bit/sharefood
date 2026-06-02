import { Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationStack() {
  const { toasts } = useNotifications();
  return (
    <div className="fixed right-3 top-20 z-50 space-y-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          className="fade-in flex max-w-xs items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm text-white shadow-xl"
        >
          <Bell size={16} />
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}
