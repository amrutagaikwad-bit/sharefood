const isDev = import.meta.env.DEV;

/** Production deployment URLs — https://foodbridgeplatform.netlify.app */
export const PRODUCTION_API_URL = "https://foodbridge-54z7.onrender.com/api";
export const PRODUCTION_SOCKET_URL = "https://foodbridge-54z7.onrender.com";
export const PRODUCTION_APP_URL = "https://foodbridgeplatform.netlify.app";

function resolveUrl(name, devFallback, prodFallback) {
  const raw = import.meta.env[name];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value) return value.replace(/\/$/, "");
  if (isDev) return devFallback;
  return prodFallback;
}

/** REST API base — includes /api suffix */
export const API_BASE_URL = resolveUrl(
  "VITE_API_URL",
  "http://localhost:5000/api",
  PRODUCTION_API_URL
);

/** Socket.io origin — no /api suffix */
export const SOCKET_URL = resolveUrl(
  "VITE_SOCKET_URL",
  "http://localhost:5000",
  PRODUCTION_SOCKET_URL
);

export function isApiConfigured() {
  return Boolean(API_BASE_URL);
}
