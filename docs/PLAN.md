# OneMed — Implementation Plan (Phase 3)

Baseline: `docs/REQUIREMENTS.md` (R1–R85, OQ1–OQ18) · `docs/AUDIT.md` (B1–B9, verification log).
**This plan is a proposal. No application code changes until approved.**

## 1. Current state & overall approach

The repo is a **partial prototype** (status at Phase 3, before M0; see `docs/PROGRESS.md` for current state): a verified-working OCR extraction slice (Tesseract.js, bilingual, tests pass 95/91/93), a small Express API (auth register, users/doctors admin CRUD, prescription persist) that **could not boot without a Firebase service-account key**, and five **static** React pages that reproduce the document's mockups but call no API. ~44 of 85 requirements are absent; the patient domain, emergency backend, pharmacy backend, consent/audit, AI, i18n, PWA, reports and analytics do not exist. No git history, no CI, no seed data, 12 npm advisories (2 high).

Approach: **keep and improve, don't rewrite.** The existing stack (Node/Express + React/Vite + Firebase) already matches the document's mandated stack, the backend layering (routes/controllers/services/schemas/middleware) is sound, and the frontend design system matches the mockups. We will (a) fix the broken foundations, (b) complete the data model + auth + audit, then (c) build the missing domains as vertical slices (API + UI + tests per milestone), and (d) finish with bilingual/PWA polish, hardening, and submission docs. Every milestone ends runnable, tested, and committed.

## 2. Architecture decisions (keep / refactor / replace / add)

| Part | Decision | Justification |
|------|----------|---------------|
| Express layering (`src/routes|controllers|services|schemas|middleware`) | **Keep**, extend | Matches doc stack; conventions already consistent; new domains follow same pattern. |
| `src/config/firebase.js` boot | **Refactor** | B1: unconditional key read. New `src/config/env.js` + lazy init + explicit modes (see below). Graceful, documented failure instead of ENOENT crash. |
| Persistence | **Keep Firestore as production store; add a persistence port** | Doc mandates Firestore-only. But no credentials/Java/Docker exist here (audit §6), so a clean machine cannot run anything. Add `src/store/` port with two real implementations: `firestore` (firebase-admin, incl. emulator when `FIRESTORE_EMULATOR_HOST` set) and `local` (embedded file/SQLite-backed store implementing the same query contract) for offline demo + CI. Same services, same API; mode chosen by env. **Deviation needing approval (OQ16).** Not a mock: real persistence, real queries. |
| AuthN | **Keep Firebase Auth as production IdP; add session layer + local-mode IdP** | Doc: Firebase Auth + JWT role claims. Firebase ID tokens live 1h and can't do 15-min expiry/rotation (R3/R65). Add backend-issued 15-min access JWT + rotating refresh tokens (Firestore/local store) after IdP verification. Local mode implements the same contract (scrypt password hashing, OTP challenge, TOTP MFA) so auth is fully testable offline. MFA = server-enforced TOTP for staff (otplib); upgrade path to Firebase phone MFA when a real project exists (OQ14). |
| OCR | **Keep Tesseract.js; add PDF rasterization; EasyOCR dropped (approved OQ10)** | Verified working. EasyOCR is Python (stack conflict). Add `pdfjs-dist` + `@napi-rs/canvas` for scanned-PDF page rasterization and embedded-text extraction; CSV/JSON/FHIR/DICOM-metadata parsers added. Manual-review UI (<80% confidence, OQ4) satisfies the doc's human-verification requirement. |
| Prescription parsing | **Keep heuristic parser as offline extractor; add Gemini JSON extraction behind an LLM port** | Parser is tested and useful as fallback/validator. `src/services/llm/` port: `gemini` provider (REST, JSON mode) + `offline` provider (deterministic, clearly labeled). Doctor confirmation gate enforced server-side (fixes B5). |
| Emergency chatbot RAG | **Add** guideline KB + embeddings + vector search | Firestore `findNearest` (cosine, top-5) in production; local adapter does cosine over stored embeddings. Embeddings: Gemini embedding API when key present, deterministic local n-gram embedder in offline mode (labeled). Offline generation = extractive, cited steps from retrieved chunks (real retrieval, no hallucination surface), labeled "offline guidance mode"; Gemini generative mode when key present (OQ15/OQ16). |
| Frontend framework | **Keep React 18 + Vite + CSS Modules; migrate to TypeScript progressively** | Doc requires TS. Vite supports TS natively; convert each component as it is wired (no big-bang rewrite), `strict: true`, shared types in `frontend/src/types/`. Keep existing visual design (matches Figs 12–22). |
| Frontend data layer | **Replace hardcoded mocks with API client + auth/session context + role-based routing** | B7: dead buttons, mock data presented as real. Add `src/api/` client (fetch + token refresh), `AuthProvider`, route guards per role; prototypes become live screens. `PageSwitcher` removed (demo nav). |
| i18n / charts / PWA / QR | **Add** react-i18next (AR-RTL/EN), Recharts, vite-plugin-pwa, `qrcode` (server), Web NFC + Geolocation (browser) | All mandated by doc (R13, R45, R64, R72); none exist. |
| Reports | **Add** Node-side generation: `pdfkit` (PDF), hand-built FHIR R4 JSON, CSV writer | Resolves OQ2 (doc's FastAPI/ReportLab paragraph contradicts its own stack chapter). Encrypted temp storage + 24h auto-delete + audit event per R56. |
| Audit trail | **Add** Firestore/local append-only `access_log` + SHA-256 hash chain + verify endpoint | Resolves OQ3 (doc's PostgreSQL mention contradicts Firestore-only). |
| Notifications | **Add** in-app notification center always; FCM adapter when Firebase creds present | OQ9: FCM-only per §4.2.3; SMS out of scope (no provider). |
| Security middleware | **Add** helmet, env-allowlist CORS, express-rate-limit (global + emergency + AI), sanitized 500s, request IDs | Fixes B9/Debt #3; R60. |
| Dependencies | **Refactor** versions: `npm audit fix` + bump express/firebase-admin within compatible majors; re-run OCR tests | 12 advisories incl. 2 high (audit run #13). |
| Docker | **Keep files, fix config; remains UNVERIFIED** (no Docker here) | Documented limitation, not a claim. |
| Tests/CI | **Add** vitest + supertest (integration against local adapter; same contract suite optionally vs emulator/real), GitHub Actions (install→test→build), ESLint flat config | R73/R83/R84; none exist today. |
| Git | **Add** `git init` inside `OneMed-main` at M0 with a baseline commit of existing work | No repo today; milestone commits required. Working phase docs stay at workspace `docs/`; final submission docs mirrored into `OneMed-main/docs/` at M8. |

Resulting shape:

```
React TS PWA (role-routed portals + public emergency/NFC/landing pages, i18n AR/EN)
        │ REST (15-min JWT + refresh rotation)
Express API ── RBAC + consent middleware ── audit hash-chain writer
        │ services: ingestion/OCR · normalization · prescriptions · pharmacy GPS ·
        │           QR/NFC tokens · emergency · RAG chatbot · reports · notifications
        ├── persistence port → Firestore (prod/emulator) | local store (offline demo/CI)
        ├── LLM port → Gemini Flash | offline deterministic provider (labeled)
        └── IdP port → Firebase Auth | local IdP (offline demo/CI)
```

## 3. Milestones (dependency-ordered)

### M0 — Foundations & repo hygiene (fix BROKEN first)
Tasks: git init + baseline commit; `.env.example` + `src/config/env.js`; persistence port + local store for existing collections; lazy Firebase init w/ emulator support; sanitize error handler + request IDs; helmet/CORS allowlist/rate limits; fix B3 (`EG_PHONE` export) & B4 (duplicate key); dependency upgrades + re-audit; vitest/supertest + first unit tests (validators, schema, parser); ESLint; CI workflow; README setup fixes; default ports backend 3000 / frontend 5173.
Covers: R85, R60(part), R73, R83(part), R84(part); fixes B1–B4, B9; Debt #1–5, #11, #14.
Files: `src/config/*`, `src/store/*`, `src/middleware/*`, `src/schemas/*`, `src/utils/validators.js`, `package.json`, `.env.example`, `.github/workflows/ci.yml`, `README.md`, `frontend/vite.config.js`.
Acceptance: clean clone → `npm i` → `npm start` boots with **zero credentials**; health 200; register+login work in local mode; `npm test` green; `npm audit` 0 high; CI green; existing OCR tests still pass.
Test: unit + supertest boot/auth smoke; browser smoke of health.

### M1 — Data model, auth, RBAC, audit, seed
Tasks: full ERD collections/schemas (patients w/ national_id+blood group+emergency contacts, institutions, pharmacies, consents, emergency_qr, prescriptions+medicines, records[labs/vitals/imaging/notes], access_log, guideline_chunks, conversations/messages); composite indexes file + local-query parity; register wizard API (roles, required emergency contact, OTP challenge w/ dev delivery), login, 15-min JWT + refresh rotation + inactivity logout, TOTP MFA for staff; 6-role RBAC + consent/affiliation middleware; audit service + chain + verify; **auth UI** (login, 4-step register wizard, MFA screen); idempotent seed (institutions, all-role users, 3+ patients with longitudinal labs/vitals/meds/imaging, consents, prescriptions, KB chunks+embeddings).
Covers: R1–R5, R23(model), R25, R28(part), R65, R74–R78, R2(UI).
Files: `src/schemas/*`, `src/store/*`, `src/services/{auth,session,audit,consent,seed}*`, `src/middleware/{auth,rbac,consent}.js`, `src/routes/*`, `frontend/src/{pages/auth,api,auth}/*`, `scripts/seed.mjs`, `firestore.indexes.json`.
Acceptance: register→OTP→login→MFA→refresh→logout flow passes integration tests; RBAC matrix (6 roles × protected endpoints) passes; audit chain verifies and tamper attempt detected; seed produces demo-ready data; contract suite passes on local store (and emulator/real when available).
Test: supertest integration + vitest unit (TOTP, JWT rotation, hash chain); browser run of auth UI.

### M2 — Ingestion pipeline & Lab portal
Tasks: multi-format upload (image/PDF/CSV/JSON/FHIR JSON/DICOM metadata/manual) w/ checksum+format+size validation; record lifecycle states incl. manual-review queue (<80% confidence, approved OQ4); OCR integration (Tesseract + PDF raster); normalization (LLM port or heuristic) to FHIR-shaped internal records; patient auto-link by NID/phone; conflict flags for critical fields; lab portal UI (drag-drop, batch/manual tabs, verification table w/ per-field confidence, upload history); patient notification on result.
Covers: R6–R14, R42, R50(part), R9.
Files: `src/services/{ingestion,ocr,normalization,records}*`, `src/middleware/upload.js`, `src/routes/records.routes.js`, `frontend/src/pages/lab/*`, `src/schemas/record.schema.js`.
Acceptance: each format ingests end-to-end in tests (fixtures incl. scanned PDF); low-confidence → manual review → approve → stored; invalid/corrupt rejected w/ clear message; conflict flag surfaces; lab UI completes upload→verify→link flow in browser.
Test: vitest (parsers, checksum, lifecycle), supertest ingestion matrix, OCR fixtures, browser lab flow.

### M3 — Clinical access, Doctor portal, consent QR, NFC
Tasks: patient search (name/NID/phone) + consent-gated cross-institutional history; record timeline UI (type colors, filters, allergy banner, vitals/meds panels, drill-down); emergency override w/ justification+TTL+log; doctor dashboard (recent patients, pending, quick stats); connection-QR service (15-min TTL, countdown UI) + patient scan→consent→grant flow; NFC token service (sign/validate) + NFC landing page + Web NFC read w/ QR fallback.
Covers: R15–R17, R24, R34–R35, R40(timeline), R41.
Files: `src/services/{search,consent,qr,nfc}*`, `src/routes/{patients,consents,qr,nfc}.routes.js`, `frontend/src/pages/{doctor,patient/timeline,nfc}/*`.
Acceptance: doctor sees only consented/own-facility/override patients (tests); history merges institutions chronologically; QR expires at 15 min (test w/ fake clock); consent grant audited; NFC landing resolves token and offers dashboard/emergency options; override logged+time-limited.
Test: supertest access matrix + TTL tests; browser doctor flow + QR countdown; NFC via URL fallback (hardware unavailable — stated).

### M4 — Patient portal & Emergency public system
Tasks: patient portal (timeline, consent toggles, privacy controls, notification center, profile/settings, data download + 30-day deletion pipeline); emergency QR generation (UUIDv4, SVG/PNG download) + public token-resolved page API (approved fields only, rate-limited, scan log + patient notify) + live emergency UI (one-tap call); guideline KB curation + embeddings + vector search; emergency chatbot (Gemini/offline modes, 123-first, citations, disclaimer, refusal, rate limit, AR/EN); Report Issue + AI logging.
Covers: R20–R23, R27, R29–R33, R40, R47(part patient view), R5(settings).
Files: `src/services/{emergency,guidelines,chatbot,privacy,deletion}*`, `src/routes/emergency.routes.js`, `frontend/src/pages/{patient,emergency}/*`, `scripts/seed-guidelines.mjs`, `data/guidelines/*.json`.
Acceptance: public page shows only toggled fields (tests per toggle); rate limit trips; scans logged; chatbot answers seizure/CPR/anaphylaxis scenarios grounded in KB w/ citations + 123-first + disclaimer, refuses diagnosis/off-topic (scenario tests both providers); deletion cascades within pipeline test; download exports all own data.
Test: vitest (privacy filter, rate limit, refusal rules), supertest public API, chatbot scenario suite, browser emergency flow.

### M5 — Pharmacy middleman & messaging & notifications
Tasks: LLM prescription extraction (Gemini JSON; offline fallback) wired to review UI (image left/editable table right/confidence/add rows); server-enforced doctor confirm → 24h fulfillment link; link page w/ GPS-sorted pharmacies (Geolocation + haversine); pharmacy select → real `wa.me` deep link pre-filled; pharmacy portal (inbox, order statuses received→verifying→preparing→ready→handed over→completed (+cancelled) per approved OQ12, chat, GPS/hours management); in-app conversations/messages (patient↔doctor/pharmacy); notification center + FCM adapter.
Covers: R36–R39, R50.
Files: `src/services/{prescription,pharmacy,fulfillment,messaging,notifications}*`, `src/routes/{prescriptions,pharmacies,messages}.routes.js`, `frontend/src/pages/{pharmacy,doctor/prescriptions,messages}/*`.
Acceptance: unconfirmed extraction cannot generate link (test); link expires at 24h; pharmacies sorted by distance (unit test w/ known coords); WhatsApp URL contains structured medicines (assert); order status transitions enforced; messages deliver + notify; end-to-end demo: upload→extract→confirm→link→select→WhatsApp.
Test: vitest (TTL, haversine, deep-link encoding, status machine), supertest flow, browser E2E.

### M6 — Clinical AI, analytics, reports, population & credits
Tasks: clinical summary w/ confidence labels/disclaimer/knowledge-gap (doctor RAG chatbot + drug-interaction checks **deferred to future work** per OQ5=a); analytics dashboards (Recharts: lab trends w/ range bands, BP dual-line, medication Gantt, visit stacked bars, condition cards, comparison bars, health gauge, imaging timeline) w/ patient vs doctor views; population analytics (de-identified) + credits; five reports (PDF/FHIR/CSV/clipboard) + generation pipeline (authz, encrypted temp store, 24h purge, audit).
Covers: R18, R20–R22, R45–R49, R51–R56, R47. (R19 deferred.)
Files: `src/services/{summary,assistant,analytics,reports,credits,population}*`, `src/routes/{analytics,reports}.routes.js`, `frontend/src/pages/{analytics,reports,admin/compliance}/*`.
Acceptance: charts render from seeded longitudinal data (browser); doctor view shows ranges/stats/drill-down, patient view plain-language (tests on view-model); reports export valid PDF/FHIR/CSV (parse-back tests); temp reports purged after 24h (fake clock); population output contains no identifiers (test).
Test: vitest (aggregations, de-identification, FHIR shape), supertest exports, browser dashboards.

### M7 — Bilingual PWA, landing & UX polish
Tasks: react-i18next AR(RTL)/EN across all portals + public pages + backend message catalog; landing page (Fig 12); responsive pass (desktop/tablet/mobile) + WCAG 2.1 audit fixes (focus, contrast, aria, keyboard); PWA manifest + SW (offline record cache, cached emergency page); design consistency pass; remove remaining mock labels/dead UI.
Covers: R13, R57, R62, R64, R66, R79–R81, R2(polish).
Files: `frontend/src/i18n/*`, `frontend/src/pages/landing/*`, `frontend/public/manifest*`, `frontend/src/sw*`, all page components, `src/i18n/*`.
Acceptance: language toggle flips every screen incl. RTL layout (browser AR screenshots); Lighthouse a11y ≥90; PWA installable + offline reload shows cached records/emergency page; ≤3 clicks to core features verified in demo script.
Test: browser AR/EN runs, Lighthouse, offline simulation.

### M8 — Hardening, performance, full testing & submission docs
Tasks: perf smoke (profile retrieval p95, emergency page weight/3G simulation, upload processing time); rate-limit & security tests (MFA enforcement audit, headers, chain verify, deletion); autocannon load smoke (documented subset per OQ18); full integration/UAT script across roles; traceability table R1–R85 → files → tests; demo script; known-limitations list; final README (clean-machine setup/run/test, architecture, API docs); mirror submission docs into `OneMed-main/docs/`; final commit + tag.
Covers: R58–R63, R82–R84.
Files: `tests/*`, `scripts/{perf,uat}*`, `docs/*` (both locations), `README.md`, `OneMed-main/docs/*`.
Acceptance: measured numbers recorded (not claimed targets); UAT script passes end-to-end on seeded demo; traceability complete; clean-machine instructions verified by fresh clone run.
Test: perf/load scripts, UAT, CI green.

## 4. Risks & assumptions

Risks: (1) external credentials absent → offline modes must be honest & labeled (mitigation: ports + labels + OQ16 decision); (2) no Java/Docker → emulator path untestable here (mitigation: local adapter contract suite; emulator optional); (3) Firestore vector index/`findNearest` emulator support uncertain (mitigation: cosine fallback in local adapter, index file for prod); (4) Arabic handwriting OCR accuracy (mitigation: manual review UI, documented limits); (5) scope ambiguity OQ5 could add/remove a whole AI workstream (mitigation: decision before M6); (6) Firebase billing gates phone OTP/FCM (mitigation: dev OTP delivery + in-app center, adapters for prod); (7) copyrighted guideline text (mitigation: original paraphrased KB w/ citations, OQ15); (8) NFC hardware absent (mitigation: QR/URL fallback tested, hardware stated as limitation); (9) time/scope size (mitigation: vertical slices, MoSCoW per doc — safety features first).
Assumptions: synthetic demo data only (no real patient data); academic-demo interpretation of aspirational NFRs (OQ18); workspace `docs/` holds working phase docs, repo `docs/` holds submission docs; existing prototype visuals are kept as the design baseline.

## 5. Decisions (user-resolved 2026-11-23)

All former blocking questions are resolved (full log in `docs/REQUIREMENTS.md` → "Decisions & Amendments"):
OQ2 Node-side reports (FastAPI rejected) · OQ3 Firestore hash-chain · OQ4 threshold <80% · OQ5 **clinical summary only** (doctor chatbot + drug-interaction checks = future work) · OQ6 six roles · OQ7 two NFC-landing options · OQ8 123 · OQ9 no SMS · OQ10 Tesseract.js only · OQ11 localization = documented limitation · OQ12 six fulfillment statuses approved · OQ13 format set + 50MB confirmed · OQ14 dev OTP + TOTP staff MFA · OQ15 paraphrased cited KB · OQ16 keys later via env plug-in ports · OQ17 heuristics approved.
**Still pending (non-blocking, proposed defaults):** OQ1 cite Law 151/2020 with note; OQ18 measured NFR subset + limitations list. Both are covered by the approval question put to the user.

## 6. Recommended next step

**M0 — Foundations.** Concretely: `git init` + baseline commit in `OneMed-main`, then the config/persistence-port refactor so `npm start` boots on a clean machine with no credentials, plus error-handler/security middleware fixes and the test/CI skeleton. This unblocks every later milestone and removes B1–B4/B9 immediately.
