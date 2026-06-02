import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useLocationStore = create(
  persist(
    (set) => ({
      mode: "current",
      label: "Current location",
      lat: null,
      lng: null,
      city: "",
      setCurrentLocation: (lat, lng, label = "Current location") =>
        set({ mode: "current", lat, lng, label, city: "" }),
      setSearchLocation: ({ lat, lng, label, city }) =>
        set({ mode: "search", lat, lng, label, city: city || "" }),
      clear: () => set({ mode: "current", lat: null, lng: null, label: "Current location", city: "" })
    }),
    { name: "foodbridge_location" }
  )
);
