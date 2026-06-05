import { copyFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backend = path.join(root, "backend");
const frontend = path.join(root, "frontend");

function run(cmd, cwd, optional = false) {
  try {
    execSync(cmd, { cwd, stdio: "inherit" });
  } catch (err) {
    if (optional) {
      console.warn(`[setup] Skipped (optional): ${cmd}`);
      console.warn("  If prisma EPERM: close all node processes, then run setup again.");
      return;
    }
    throw err;
  }
}

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
run("npm install --prefix backend", root);
run("npm install --prefix frontend", root);

console.log("Applying database schema...");
run("npx prisma generate", backend, true);
run("npx prisma db push --accept-data-loss", backend);
run("npm run seed", backend);

console.log("\nSetup complete. Run from project root: npm run dev");
console.log("  Frontend: http://localhost:5173");
console.log("  API:      http://localhost:5000");
