/**
 * One command for the full OneMed demo: API on :3000 and frontend on :5173.
 * Requires dependencies installed in both packages. Credentials are optional;
 * without them the backend starts in local persistence/auth mode.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const frontend = path.join(root, "frontend");
const children = [];

function start(name, command, args, cwd, env = {}) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: "inherit" });
  child.on("error", (error) => { console.error(`[${name}] failed to start: ${error.message}`); stop(); process.exitCode = 1; });
  child.on("exit", (code) => {
    if (!stopping) {
      console.log(`[${name}] exited (${code}); stopping other processes`);
      stop();
      process.exitCode = code ?? 0;
    }
  });
  children.push(child);
}

let stopping = false;
function stop() {
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", () => { stop(); process.exit(0); });
process.on("SIGTERM", () => { stop(); process.exit(0); });

console.log("Starting OneMed API on http://localhost:3000 and frontend on http://localhost:5173");
start("api", process.execPath, ["src/server.js"], root);
// Spawn Vite directly so the command works in restricted shells and CI.
const viteEntry = path.join(frontend, "node_modules", "vite", "bin", "vite.js");
start("web", process.execPath, [viteEntry, "--host", "127.0.0.1"], frontend, {
  VITE_API_MODE: "api", VITE_API_URL: "/api",
});
