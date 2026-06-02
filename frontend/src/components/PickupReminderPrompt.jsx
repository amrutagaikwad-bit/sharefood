import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { requestNotificationPermission, usePickupReminders } from "../hooks/usePickupReminders";

const STORAGE_KEY = "foodbridge_pickup_reminders";

export default function PickupReminderPrompt() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  usePickupReminders(user, enabled);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, [enabled]);

  if (!user || user.role === "ADMIN") return null;

  const toggle = async () => {
    if (!enabled) {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== "granted") return;
      localStorage.setItem(STORAGE_KEY, "true");
      setEnabled(true);
      return;
    }
    localStorage.setItem(STORAGE_KEY, "false");
    setEnabled(false);
  };

  if (permission === "denied") {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-2">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Browser notifications are blocked. Enable them in browser settings for pickup reminders.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-2">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 sm:w-auto"
      >
        {enabled ? <Bell size={16} /> : <BellOff size={16} />}
        {enabled ? "Pickup reminders on" : "Enable pickup reminders (browser)"}
      </button>
    </div>
  );
}
