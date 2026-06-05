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

/**
 * Render is IPv4-only. Supabase direct host (port 5432) is IPv6-only.
 * Use Supabase transaction pooler port 6543 — works on IPv4-capable networks.
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres
 */
const PRODUCTION_DATABASE_URL =
  "postgresql://postgres:FoodBridge%401012@db.tpnhbwflsrscfylnedqp.supabase.co:6543/postgres?pgbouncer=true&sslmode=require";

const PRODUCTION_DIRECT_URL =
  "postgresql://postgres:FoodBridge%401012@db.tpnhbwflsrscfylnedqp.supabase.co:6543/postgres?pgbouncer=true&sslmode=require";

const PRODUCTION_JWT_SECRET = "foodbridge_prod_jwt_secret_min_32_chars";

function isProduction() {
  return process.env.NODE_ENV === "production" || process.env.RENDER === "true";
}

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

function useProductionDatabaseDefaults() {
  if (!isProduction()) return;
  const url = process.env.DATABASE_URL?.trim() || "";
  const onSupabase = url.includes("supabase.co");
  if (onSupabase && url.includes(":6543")) return;
  console.warn("[env] Applying production Supabase pooler URLs for Render (IPv4)");
  process.env.DATABASE_URL = PRODUCTION_DATABASE_URL;
  process.env.DIRECT_URL = PRODUCTION_DIRECT_URL;
}

function useProductionJwtDefault() {
  if (!isProduction() || process.env.JWT_SECRET?.trim()) return;
  process.env.JWT_SECRET = PRODUCTION_JWT_SECRET;
}

export function normalizeDatabaseUrl() {
  useProductionDatabaseDefaults();
  useProductionJwtDefault();

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
