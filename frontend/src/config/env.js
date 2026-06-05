const isDev = import.meta.env.DEV;

export const PRODUCTION_API_URL = "https://foodbridge-54z7.onrender.com/api";
export const PRODUCTION_SOCKET_URL = "https://foodbridge-54z7.onrender.com";
export const PRODUCTION_APP_URL = "https://foodbridgeplatform.netlify.app";

/** Always end with /api so calls like api.post("/auth/login") resolve correctly */
function normalizeApiUrl(url) {
  if (!url) return url;
  const trimmed = url.trim().replace(/\/$/, "");
  if (trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

function resolveUrl(name, devFallback, prodFallback) {
  const raw = import.meta.env[name];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value) return name === "VITE_API_URL" ? normalizeApiUrl(value) : value.replace(/\/$/, "");
  if (isDev) return devFallback;
  return prodFallback;
}

export const API_BASE_URL = resolveUrl(
  "VITE_API_URL",
  "http://localhost:5000/api",
  PRODUCTION_API_URL
);

export const SOCKET_URL = resolveUrl(
  "VITE_SOCKET_URL",
  "http://localhost:5000",
  PRODUCTION_SOCKET_URL
);

export function isApiConfigured() {
  return Boolean(API_BASE_URL);
}
