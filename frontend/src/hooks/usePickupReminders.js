import { useCallback, useEffect, useRef } from "react";
import api from "../api/client";
import { useSocket } from "../context/SocketContext";

const REMINDER_WINDOW_MS = 60 * 60 * 1000; // 1 hour before pickup
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function alreadyNotified(key) {
  return sessionStorage.getItem(key) === "1";
}

function markNotified(key) {
  sessionStorage.setItem(key, "1");
}

function fireReminder({ title, body }) {
  if (!canUseBrowserNotifications() || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      tag: title,
      requireInteraction: false
    });
  } catch {
    // Some browsers block without user gesture
  }
}

function checkRequests(requests, role) {
  const now = Date.now();

  requests.forEach((r) => {
    const slot = r.pickupSlot || r.donation?.pickupStart || r.donation?.pickupEnd;
    if (!slot) return;
    if (!["PENDING", "ACCEPTED", "RESERVED"].includes(r.status)) return;

    const pickupTime = new Date(slot).getTime();
    const diff = pickupTime - now;

    if (diff <= 0 || diff > REMINDER_WINDOW_MS) return;

    const key = `fb-reminder-${r.id}-${slot}`;
    if (alreadyNotified(key)) return;

    const food = r.donation?.foodName || "your donation";
    const when = new Date(slot).toLocaleString();

    if (role === "RECEIVER") {
      fireReminder({
        title: "FoodBridge — Pickup reminder",
        body: `Pickup for "${food}" is coming up at ${when}.`
      });
    } else if (role === "DONOR" && r.status === "PENDING") {
      fireReminder({
        title: "FoodBridge — Pending request",
        body: `Someone requested "${food}". Respond before pickup at ${when}.`
      });
    } else if (role === "DONOR") {
      fireReminder({
        title: "FoodBridge — Scheduled pickup",
        body: `Pickup for "${food}" is scheduled around ${when}.`
      });
    }

    markNotified(key);
  });
}

export function usePickupReminders(user, enabled) {
  const { socket } = useSocket();
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const runCheck = useCallback(async () => {
    if (!user || !enabledRef.current) return;
    if (!canUseBrowserNotifications() || Notification.permission !== "granted") return;

    try {
      const res = await api.get("/requests/mine");
      checkRequests(res.data, user.role);
    } catch {
      // ignore when offline
    }
  }, [user]);

  useEffect(() => {
    if (!user || !enabled) return;
    runCheck();
    const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, enabled, runCheck]);

  useEffect(() => {
    if (!socket || !user || !enabled) return;
    const refresh = () => runCheck();
    socket.on("request:updated", refresh);
    socket.on("request:created", refresh);
    return () => {
      socket.off("request:updated", refresh);
      socket.off("request:created", refresh);
    };
  }, [socket, user, enabled, runCheck]);
}

export async function requestNotificationPermission() {
  if (!canUseBrowserNotifications()) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}
