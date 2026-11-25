# Measured performance subset (OQ18)

Measured 2026-11-25T20:01:19.780Z against `http://localhost:3000/api` with firestore persistence.
Local smoke measurements, not a production benchmark. Aspirational targets (p95 < 5 s profile, < 8 s chat, < 30 s upload, 3G page load, 99.5% uptime, 10k users, annual pen test, Egypt data-centre hosting) are **not claimed as verified**.

| Measurement | p50 (ms) | p95 (ms) | Max (ms) | Runs |
|---|---:|---:|---:|---:|
| Patient profile retrieval (ms) | 1185.02 | 2291.1 | 2302.59 | 20 |
| Clinical summary (ms) | 4341.74 | 5311.22 | 5311.22 | 8 |
| Emergency profile (ms) | 1597.65 | 1869.86 | 1869.86 | 15 |
| First-aid chat (ms) | 7134.83 | 7771.84 | 7771.84 | 3 |
| CSV upload + normalize (ms) | 4718.88 | 4972.22 | 4972.22 | 3 |

Emergency profile response payload: 483 bytes.

Limitations: single-process local run; no 3G emulation, no sustained concurrency load, no Egypt-region deployment, no third-party penetration test. See `docs/AUDIT.md` for the full limitations list.
