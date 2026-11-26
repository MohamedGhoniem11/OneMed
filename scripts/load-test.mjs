/** Lightweight local load smoke (OQ18): no cloud dependencies, no claimed SLA. */
import "dotenv/config";

const BASE = process.env.DEMO_BASE_URL || "http://localhost:3000/api";
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 20);
const REQUESTS = Number(process.env.LOAD_REQUESTS || 200);

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "mona.patient@example.com", password: "Demo!onemed1" }),
  });
  const body = await res.json();
  if (!body.accessToken) throw new Error("Load test needs a seeded demo patient");
  return body.accessToken;
}

const p = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] * 100) / 100;
};

async function main() {
  const token = await login();
  const latencies = [];
  let failures = 0;
  let next = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (next < REQUESTS) {
      const i = next++;
      const start = performance.now();
      try {
        const res = await fetch(`${BASE}/patients/user_patient_1`, { headers: { authorization: `Bearer ${token}` } });
        if (!res.ok) failures += 1;
        await res.arrayBuffer();
      } catch { failures += 1; }
      latencies.push(performance.now() - start);
      void i;
    }
  });
  await Promise.all(workers);
  const result = { requests: REQUESTS, concurrency: CONCURRENCY, failures, p50: p(latencies, 0.5), p95: p(latencies, 0.95), max: Math.round(Math.max(...latencies) * 100) / 100 };
  console.log(JSON.stringify(result, null, 2));
  if (failures / REQUESTS > 0.1) process.exitCode = 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
