const required = ["DATABASE_URL", "JWT_SECRET"];

export function assertEnv() {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    console.error(
      `Missing environment variables: ${missing.join(", ")}. Copy backend/.env.example to backend/.env and restart.`
    );
    process.exit(1);
  }
}
