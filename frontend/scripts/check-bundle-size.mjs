/** Performance budget guard: fail if the initial bundle exceeds the agreed limits. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const dist = path.resolve("dist");
const assets = path.join(dist, "assets");
if (!fs.existsSync(assets)) {
  console.error("dist/assets not found — run npm run build first");
  process.exit(1);
}

const gzip = (file) => zlib.gzipSync(fs.readFileSync(file)).length;
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const initial = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const budgets = { js: 200 * 1024, css: 50 * 1024 };
const totals = { js: 0, css: 0 };
const rows = [];

for (const file of initial) {
  const full = path.join(assets, file);
  if (!fs.existsSync(full)) continue;
  const kind = file.endsWith(".js") ? "js" : "css";
  const bytes = gzip(full);
  totals[kind] += bytes;
  rows.push(`${kind.padEnd(3)} ${file} ${(bytes / 1024).toFixed(1)} kB gzip`);
}

console.log(rows.join("\n"));
console.log(`Initial JS: ${(totals.js / 1024).toFixed(1)} kB / ${(budgets.js / 1024).toFixed(0)} kB budget`);
console.log(`Initial CSS: ${(totals.css / 1024).toFixed(1)} kB / ${(budgets.css / 1024).toFixed(0)} kB budget`);

if (totals.js > budgets.js || totals.css > budgets.css) {
  console.error("Performance budget exceeded");
  process.exit(1);
}
console.log("Performance budget OK");
