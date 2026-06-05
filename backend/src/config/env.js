const required = ["DATABASE_URL", "JWT_SECRET"];

const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
];

/** Production Netlify frontend — https://foodbridgeplatform.netlify.app */
const PRODUCTION_ORIGINS = [
  "https://foodbridgeplatform.netlify.app",
  "https://www.foodbridgeplatform.netlify.app"
];

/** Prisma SQLite paths are relative to the prisma/ folder — not prisma/prisma/ */
export function normalizeDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;
  if (url.startsWith("file:") && (url === "file:./prisma/dev.db" || url.includes("prisma/prisma"))) {
    console.warn("[env] DATABASE_URL corrected to file:./dev.db (use backend/.env.example as template)");
    process.env.DATABASE_URL = "file:./dev.db";
  }
  if (!process.env.DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = url;
  }
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
    console.error(
      `Missing environment variables: ${missing.join(", ")}. Copy backend/.env.example to backend/.env and restart.`
    );
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 16) {
    console.warn("[env] JWT_SECRET should be at least 16 characters in production.");
  }
}

export function getJwtSecret() {
  return process.env.JWT_SECRET;
}
