const required = ["DATABASE_URL", "JWT_SECRET"];

const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
];

const PRODUCTION_ORIGINS = [
  "https://foodbridgeplatform.netlify.app",
  "https://www.foodbridgeplatform.netlify.app"
];

function ensureSslMode(url) {
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) return url;
  if (/[?&]sslmode=/i.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

function ensurePgbouncer(url) {
  if (!url.includes(":6543")) return url;
  if (/[?&]pgbouncer=/i.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
}

/** Mask password in connection string for safe logging */
export function maskDatabaseUrl(url) {
  if (!url) return "(not set)";
  try {
    const parsed = new URL(url.replace(/^postgres(ql)?:\/\//, "http://"));
    if (parsed.password) parsed.password = "****";
    return parsed.href.replace(/^http:\/\//, "postgresql://");
  } catch {
    return url.replace(/:([^:@/]+)@/, ":****@");
  }
}

export function normalizeDatabaseUrl() {
  let url = process.env.DATABASE_URL?.trim();
  if (!url) return;

  if (url.startsWith("file:") && (url === "file:./prisma/dev.db" || url.includes("prisma/prisma"))) {
    console.warn("[env] DATABASE_URL corrected to file:./dev.db");
    url = "file:./dev.db";
  }

  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    url = ensureSslMode(ensurePgbouncer(url));
  }

  process.env.DATABASE_URL = url;

  let direct = process.env.DIRECT_URL?.trim() || url;
  if (direct.startsWith("postgresql://") || direct.startsWith("postgres://")) {
    direct = ensureSslMode(ensurePgbouncer(direct));
  }
  process.env.DIRECT_URL = direct;
}

normalizeDatabaseUrl();

export function logDatabaseConfig() {
  console.log("DATABASE_URL:", maskDatabaseUrl(process.env.DATABASE_URL));
  console.log("DIRECT_URL:", maskDatabaseUrl(process.env.DIRECT_URL));
}

export function getAllowedOrigins() {
  const fromEnv = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...LOCAL_ORIGINS, ...PRODUCTION_ORIGINS, ...fromEnv])];
}

export function assertEnv() {
  normalizeDatabaseUrl();
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

export function getJwtSecret() {
  return process.env.JWT_SECRET;
}

export function getDatabaseHost() {
  const url = process.env.DATABASE_URL || "";
  if (!url.includes("@")) return url || "(not set)";
  return url.split("@")[1]?.split("/")[0]?.split("?")[0] || "(unknown)";
}
