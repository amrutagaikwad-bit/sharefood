import { copyFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backend = path.join(root, "backend");
const frontend = path.join(root, "frontend");

function copyEnv(dir) {
  const example = path.join(dir, ".env.example");
  const env = path.join(dir, ".env");
  if (!existsSync(env) && existsSync(example)) {
    copyFileSync(example, env);
    console.log(`Created ${env}`);
  }
}

copyEnv(backend);
copyEnv(frontend);

console.log("Installing dependencies...");
execSync("npm install --prefix backend", { cwd: root, stdio: "inherit" });
execSync("npm install --prefix frontend", { cwd: root, stdio: "inherit" });

console.log("Applying database schema...");
execSync("npx prisma generate", { cwd: backend, stdio: "inherit" });
execSync("npx prisma migrate deploy", { cwd: backend, stdio: "inherit" });
execSync("npx prisma db push", { cwd: backend, stdio: "inherit" });
execSync("npm run seed", { cwd: backend, stdio: "inherit" });

console.log("\nSetup complete. Run from project root: npm run dev");
console.log("  Frontend: http://localhost:5173");
console.log("  API:      http://localhost:5000");
