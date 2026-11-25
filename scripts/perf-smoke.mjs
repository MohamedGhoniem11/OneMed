/**
 * Measured NFR subset (OQ18). Requires the API running (npm start / dev:all).
 * Records actual local numbers; aspirational targets remain documented limits.
 * Usage: npm run perf:smoke
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSession } from "../src/services/session.service.js";

const root = path.dirname(fileURLToPath(new URL("..", import.meta.url)));
const BASE = process.env.DEMO_BASE_URL || "http://localhost:3000/api";
const H = (t) => ({ "content-type": "application/json", authorization: `Bearer ${t}` });

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] * 100) / 100;
};
async function timed(fn, runs = 10) {
  const samples = [];
  let last;
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    last = await fn();
    samples.push(performance.now() - start);
  }
  return {
    runs, p50: percentile(samples, 0.5), p95: percentile(samples, 0.95),
    max: Math.round(Math.max(...samples) * 100) / 100,
    sample: last,
  };
}

async function main() {
  const patientLogin = await fetch(`${BASE}/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "mona.patient@example.com", password: "Demo!onemed1" }),
  }).then((r) => r.json());
  const doctor = (await createSession({ id: "user_doctor_1", role: "doctor", email: "karim.doctor@example.com" }, { mfa: true })).accessToken;
  const patient = patientLogin.accessToken;

  const profile = await timed(() => fetch(`${BASE}/patients/user_patient_1`, { headers: H(doctor) }), 20);
  const summary = await timed(() => fetch(`${BASE}/analytics/clinical/user_patient_1/summary`, { headers: H(doctor) }), 8);
  const qr = await fetch(`${BASE}/emergency/qr`, { method: "POST", headers: H(patient) }).then((r) => r.json());
  const emergency = await timed(() => fetch(`${BASE}/emergency/${qr.token}`), 15);
  const chat = await timed(() => fetch(`${BASE}/emergency/${qr.token}/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "collapse and not breathing", language: "en" }),
  }), 3);

  const csv = "test,value,unit\nhba1c,7.1,%";
  const upload = await timed(() => {
    const form = new FormData();
    form.append("patientId", "user_patient_1");
    form.append("file", new Blob([csv], { type: "text/csv" }), "smoke.csv");
    return fetch(`${BASE}/records/ingest`, { method: "POST", headers: { authorization: `Bearer ${doctor}` }, body: form });
  }, 3);

  const emergencyPayload = emergency.sample.headers.get("content-length") || "unknown";
  const results = {
    "Patient profile retrieval (ms)": { p50: profile.p50, p95: profile.p95, max: profile.max, runs: profile.runs },
    "Clinical summary (ms)": { p50: summary.p50, p95: summary.p95, max: summary.max, runs: summary.runs },
    "Emergency profile (ms)": { p50: emergency.p50, p95: emergency.p95, max: emergency.max, runs: emergency.runs, payloadBytes: emergencyPayload },
    "First-aid chat (ms)": { p50: chat.p50, p95: chat.p95, max: chat.max, runs: chat.runs },
    "CSV upload + normalize (ms)": { p50: upload.p50, p95: upload.p95, max: upload.max, runs: upload.runs },
  };
  console.log(JSON.stringify(results, null, 2));

  const lines = [
    "# Measured performance subset (OQ18)",
    "",
    `Measured ${new Date().toISOString()} against \`${BASE}\` with ${process.env.PERSISTENCE || "firestore"} persistence.`,
    "Local smoke measurements, not a production benchmark. Aspirational targets (p95 < 5 s profile, < 8 s chat, < 30 s upload, 3G page load, 99.5% uptime, 10k users, annual pen test, Egypt data-centre hosting) are **not claimed as verified**.",
    "",
    "| Measurement | p50 (ms) | p95 (ms) | Max (ms) | Runs |",
    "|---|---:|---:|---:|---:|",
    ...Object.entries(results).map(([name, r]) => `| ${name} | ${r.p50} | ${r.p95} | ${r.max} | ${r.runs} |`),
    "",
    `Emergency profile response payload: ${emergencyPayload} bytes.`,
    "",
    "Limitations: single-process local run; no 3G emulation, no sustained concurrency load, no Egypt-region deployment, no third-party penetration test. See `docs/AUDIT.md` for the full limitations list.",
    "",
  ];
  const out = path.join(root, "docs", "PERFORMANCE.md");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join("\n"));
  console.log(`Wrote ${out}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
