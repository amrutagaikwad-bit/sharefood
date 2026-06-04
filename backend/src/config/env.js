const required = ["DATABASE_URL", "JWT_SECRET"];

/** Prisma SQLite paths are relative to the prisma/ folder — not prisma/prisma/ */
export function normalizeDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;
  if (url === "file:./prisma/dev.db" || url.includes("prisma/prisma")) {
    console.warn("[env] DATABASE_URL corrected to file:./dev.db (use backend/.env.example as template)");
    process.env.DATABASE_URL = "file:./dev.db";
  }
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
