# OneMed — Progress Log

Resume point for any new session. Working docs live here (`C:\Users\Seif\Desktop\OneMed\docs\`); codebase is `OneMed-main/`.

## Phase status
- [x] Phase 1 — Requirements: `docs/REQUIREMENTS.md` (R1–R85, OQ1–OQ18). Full PDF read (93 pages text + all key diagrams/mockups as images).
- [x] Phase 2 — Audit: `docs/AUDIT.md` (verification log, B1–B9 broken items, R-status map, debt list).
- [x] Phase 3 — Plan: `docs/PLAN.md` (M0–M8). User approved with decisions in `docs/DECISIONS.md`; requested **front-end first**.
- [x] Phase 4 / FE milestone — **Complete front-end build**: all documented screens across 6 roles, bilingual AR/EN RTL, demo data layer + API client, PWA manifest, FE tests. Verified in browser (all routes, 0 console errors) and via interaction tests.
- [x] M0 foundations (pre-existing from parallel work; captured in git history): credential-free boot, local store, JWT/session, MFA/OTP, security middleware, tests/CI.
- [x] Fixed pre-existing backend test failures: `requirePatientAccess` async factory bug (Express Route.get Promise error), TOTP test used base64 secret, National ID fixtures were 13 digits. **61/61 backend tests pass.**
- [ ] M1–M8 backend completion (patient/lab/pharmacy/emergency/AI/report endpoints) — pending.

## FE verification detail (2026-11-24)
- `npm run build` in `frontend/`: PASS (TypeScript strict + Vite build, 2319 modules, 1.5s).
- `npm test` in `frontend/`: 3/3 pass (demo data, emergency privacy, bilingual dictionary).
- `npm test` in root: 61/61 pass.
- Browser (Chromium via OpenCode browser tools) — **every route rendered with zero console errors**:
  - Public: `/`, `/login`, `/register`, `/emergency/em-demo-mona`, `/nfc/em-demo-mona`, `/f/rx-demo-8f3a`, `/qr/conn-demo`
  - Patient (9): dashboard, records, analytics, prescriptions, consents, emergency config, messages, notifications, settings
  - Doctor (8): dashboard, patients list, patient viewer, prescriptions/review, QR tools, messages, reports, settings
  - Lab (2), Pharmacy (2), Hospital admin (4), Admin (7)
  - Role guards verified: wrong-role requests redirect to `/app`.
- Interaction tests (verified against localStorage): patient login → role home; language toggle → `dir=rtl` + Arabic text; consent revoke flips `active` true→false; prescription upload→extract→confirm created a 3rd prescription with 24h link token; fulfillment pharmacy selection set `orderStatus=received` and generated `https://wa.me/...` deep link; emergency chatbot produced grounded 123-first guidance with AHA citation.

## Key decisions & environment
- Decisions: `docs/DECISIONS.md`. All OQs answered except OQ1 (assumed 2022 majority) and OQ18 (assumed measured subset + limitations).
- FE default mode is **demo** (localStorage, realistic seed data, clearly labeled). Real keys later: set `VITE_API_MODE=api` and `VITE_API_URL`; client switches to REST.
- Demo credentials: `mona.patient@example.com / Demo!onemed1`, `karim.doctor@example.com / Demo!onemedD1`, `nadia.lab@example.com / Demo!onemedL1`, `pharmacy.desk@example.com / Demo!onemedP1`, `admin.hospital@example.com / Demo!onemedH1`, `admin@onemed.example / Demo!onemedA1`.
- No Java/Docker on this machine → Firebase emulator & Docker unverified.
- Dev servers used during audit (ports 3000/4173) were stopped. FE dev server currently running on 5173 (background shell `sh_20dbd24b3001B8ZchpXFpU9jpo`, PID 10420) — stop when done.
- Git history in `OneMed-main`: baseline → M0 foundations → baseline-snapshot commit → FE milestone (+ test fixes).

## Concept-image UI refinement (2026-11-24)
User added `UI/` with 12 concept images. Read all 12; analysis in `docs/UI_VISION.md`, applied changes in `docs/UI_REFINEMENT_REPORT.md`. User chose "Apply refinements now". Implemented G1–G12: landing How-It-Works/footer, doctor Emergency shortcut + status vocabulary, shared IdentityStrip/MetricCard/VerificationRow/Chip components, analytics tabs + Lipid Panel + KPI bars, settings summary, lab batch/manual forms, zoom/rotate, admin API Connections, chatbot patient chips, unified brand, full AR/EN keys. Verified: `npm run build` PASS, FE tests 3/3, BE tests 61/61, all changed routes render in EN and RTL with 0 console errors, no untranslated keys. Commit `9b45de0`.

## Correctness + anti-slop + code-review pass (2026-11-24)
User reported illogical UI, asked to verify every portal, apply `design-taste-frontend` and `code-review-and-quality`. Results in `docs/CODE_REVIEW.md` (14 correctness fixes, 6 design fixes, 0 remaining required findings).
Key fixes: public pages no longer inherit the authenticated shell; registration persists all patient fields (regression test added); new users can log in; OTP validates the code; 15-min session expiry enforced; lab history route shows history; QR consent resolves real tokens/grantee/patient; pharmacy sorting uses patient GPS; emergency meds come from data; DoctorMessages is a real thread; report types generate correct content; lab upload uses correct institution and confidence rules.
Design: 54 em-dashes removed from visible strings (browser-verified 0); fake hero dashboard and fake social proof removed; asymmetric bento + stepped How-It-Works; hero CTA label unified; nav 64px single line. Image generation attempted but failed (`Invalid credential`), so unrelated stock photos were removed and labelled image slots left in code comments.
Dependencies: Vitest 5.1.1 + i18next 26.3.4 → `npm audit` 0 vulnerabilities (was 4, incl. 2 critical).
Verification: FE build PASS, FE tests 4/4, BE tests 61/61, 6 roles x all routes with 0 console errors, interaction checks (register/OTP/login, QR consent, lab history, notifications, em-dash scan). Commit `e7020c3`.

## Quality-of-life pass (2026-11-24)
User asked for a back button and genuinely useful QoL features. Added: global Back button (history-aware with role-home fallback) in the app shell and on all public utility pages; Ctrl/Cmd+K quick-navigation palette filtered by role; `/` focuses global search; Esc closes dialogs/palette; static loading skeletons replacing half-empty async views; copy-to-clipboard for emergency QR URL and prescription fulfillment link; demo-data reset with confirmation from the DEMO flag. Extracted one shared role-nav module (`components/nav.tsx`) used by the rail, palette and search. Added a nav-map regression test.
Verification: FE build PASS, FE tests 6/6, BE tests 61/61, audit 0. Browser: back button recorded navigation records→dashboard; palette opened, filtered "analytics" and Enter navigated to analytics; `/` focused search; Esc closed palette and reset modal; skeleton count 4 on first load; reset modal opens/cancels; copy fallback toast works (clipboard blocked in automation); doctor/admin/lab/public routes have the new controls and 0 console errors.

## M2 backend milestone (2026-11-24)
User approved starting the next step. Implemented the medical ingestion API:
- `POST /api/records/ingest` multipart `file` + `patientId`; `POST /api/records/manual`; `GET /api/records`, `GET /api/records/:id`, `GET /api/records/pending`, `PATCH /api/records/:id/review`, `GET /api/records/:id/original`.
- New services: `normalization.service.js` (CSV/JSON/FHIR/OCR/DICOM), `pdf.service.js` (PDF.js text layer), `file-storage.service.js` (AES-256-GCM encrypted originals + SHA-256 checksum), `ingestion.service.js` (lifecycle, review gate, consent-aware visibility, audit events).
- Extended `record.schema.js` (prescription/visit types, lifecycle, checksum, provenance), `upload.js` middleware (PDF/image/CSV/JSON/FHIR/DICOM, 50MB), env config (UPLOAD_ENCRYPTION_KEY, UPLOAD_MAX_MB, OCR_CONFIDENCE_THRESHOLD), `.env.example`.
- Added `pdfjs-dist@6.5.438` after the initially installed v5 carried a high-severity advisory; `npm audit --omit=dev` is clean.
Verification: backend `npm test` 72/72 (was 61/61), `npm run lint` 0 errors (16 legacy FE warnings), live boot health 200 and `/api/records` 401 without token, raw `.enc` file asserted not to contain plaintext. Self-review follow-up added `lifecycleHistory` and 400 handling for malformed JSON. Commits `672735a` + `e37b8f7`.

## M3 backend + API wiring (2026-11-24)
Implemented signed capability tokens (`src/services/token.service.js`) with SHA-256 hashes at rest, domain-separated from login JWTs:
- `POST /api/connect/qr` (doctor), public `GET /api/connect/:token`, `POST /api/connect/:token/accept` (patient) with 15-minute TTL, scoped consent and audit entries.
- `POST /api/nfc`, public `GET /api/nfc/:token` (scan counting), `GET /api/nfc/mine`, plus revocation support.
- `GET /api/patients/search?q=` with consent-filtered results and `POST /api/patients/:id/emergency-override` with justification/TTL/audit.
Front-end wired in API mode: doctor search/dashboard, patient lists/records/analytics, lab portal ingestion/manual entry/review, QR tools with patient selection, public consent and NFC pages, emergency override confirmation. Added `PUBLIC_BASE_URL` and `CONNECTION_TTL_SECONDS` config.
Fixed a seeded-data bug: IdP users are now created with the fixed UIDs used by patient/doctor records so names resolve in both local and Firebase modes.
Verification: backend 81/81 (was 72/72), FE 6/6, both builds/lints clean, audit 0. Real API-mode browser run against a seeded backend confirmed doctor names, QR generation, public resolution with real clinician name, patient consent grant, and 0 console errors.

## M4 emergency API + real credentials (2026-11-25)
User supplied a temporary Gemini key and Firebase service-account JSON. Credentials configured in gitignored `.env` only: project `onemed-8fdcc`, `PERSISTENCE=firestore`, `AUTH_PROVIDER=local` (pending Firebase Web API key), `GEMINI_MODEL=gemini-2.5-flash` (3.8-flash returned 503), `GEMINI_EMBEDDING_MODEL=gemini-embedding-001`. Firestore reachable; Gemini generate + embed verified.
Implemented: LLM port (`llm.service.js`), signed emergency QR tokens, public privacy-filtered emergency profile, patient privacy endpoint, scan/chat audit logging, emergency rate limiter, guideline library seed with Gemini embeddings, Firestore vector search with cosine fallback, and FE wiring for public emergency page/chat and patient QR/privacy.
Fixed: Firebase Admin v14 modular imports, Firestore undefined-value sanitization, missing-composite-index fallback in the store adapter, login `accessToken` contract in the FE client, optional patient fields in API mode, and seeded-user UID consistency.
Verification: backend 87/87, FE 6/6, build/lint clean, audit 0. Live browser run against real Firebase/Gemini produced a grounded seizure answer with 3 citations and Moderate confidence, zero console errors. Commit pending.

## M5 pharmacy fulfillment + messaging (2026-11-25)
Implemented Gemini prescription extraction with parser fallback, mandatory doctor confirmation before a 24h signed fulfillment link, public GPS-sorted pharmacy selection with WhatsApp deep links, pharmacy order inbox/status transitions, conversations/messages, and in-app notifications. Added pharmacy seed data to `scripts/seed.mjs` and recommended Firestore indexes.
Fixed: prescription list filter for patients, pharmacy affiliation from user docs, LLM extraction shape (`items` vs `medicines`), and FE API helpers for all M5 flows.
Verification: backend 92/92 (was 87/87), FE 6/6, build/lint clean, audit 0. Live API-mode browser run against real Firestore confirmed doctor list, patient fulfillment page with two pharmacies, pharmacy order inbox with status, 0 console errors. Commit `5e7298f`.

## M6 clinical AI, analytics, reports and credits (2026-11-25)
Implemented grounded clinical summaries (Gemini with deterministic fallback, confidence, sources and disclaimer), patient analytics (lab trends, BP, lipids, medications, health score), de-identified population analytics, five report types with PDF/FHIR/CSV/JSON/text export (`history`, `labs`, `clinical-summary`, `audit`, `population`), and a contribution credit ledger (10 credits per verified upload). Added a shared clinical-value normalizer for all record shapes, AES-256-GCM encrypt/decrypt helpers, and an environment-independent text PDF writer. Wired patient analytics/report downloads, doctor report previews/exports, hospital/admin population views, real audit verification and credit balance into the FE. Fixed a latent `StatusBadge` crash on undefined status.
Verification: backend 99/99 (19 files, +7 M6 integration tests), FE 6/6, strict build/lint clean, audit 0 vulnerabilities. Live API-mode browser run against real Firestore: patient analytics showed real HbA1c 7.2 / BP 128/82 / health score 20%; doctor report preview rendered a real generated report; hospital population view showed 3 patients / 2 cities; zero console errors. All M6 REST endpoints verified live (PDF magic bytes, FHIR Bundle with 8 entries, audit CSV, chain 119 entries valid). Commit `89f55e9`.

## Next action
Next milestone: M7 final PWA/accessibility/RTL polish. Provide a Firebase Web API key to switch `AUTH_PROVIDER=firebase`; provide licensed hero/wristband photos to replace the branded landing visual.


## Phase 2 — audit-driven fixes (branch phase2-audit-fixes)
Commits: 68ece60, 0227b65, 44842b7, ca6862d, 9d21a93, 9f9b4be.
- Removed 35 unreachable legacy prototype files; lint warnings 16 -> 0.
- Closed authorization gaps: consent revoke ownership, pharmacy IDOR, patient demographics/prescription consent, emergency grant, aiChatbotEnabled, verified-doctor write gate, NFC issuance ownership, population report role gate, CSV formula injection, token TTLs. Added 8 negative authorization tests.
- Fixed API mode: strict errors (no silent demo fallback), data-shape normalization (observedAt/data -> date/values), 401 refresh, real admin/staff/profile/deletion actions, geolocation sorting, lab batch/manual/drag-drop/review, Report Issue, service worker, FCM device tokens + lab notifications.
- Redesigned shell: compact rail/bottom tabs, one topbar with unified search, dynamic emergency action, explicit Back, spacing tokens, focus/live-region/dialog a11y, logical properties.
- Added doctor analytics view, demo hub in navigation, one-command startup (npm run dev:all), demo walkthrough (npm run demo), realistic seed artifacts (Arabic KB, emergency QR, NFC, fulfilled order, notification).
Verification: backend 108/108 tests (20 files), FE 6/6, strict build, lint 0 errors, npm audit 0; npm run demo 11/11 flows PASS against Firestore; browser re-check of patient dashboard (real name/data), doctor viewer (no fake vitals), demo hub, NFC -> emergency (fixed), admin institution verification (fixed), 0 console errors. Mobile viewport walkthrough still NOT possible with the harness browser; recorded as a limitation.
Final review corrections committed as 643792d (verified-doctor fail-open, override scope, hospital-admin user listing, NFC token growth, EDP purge coverage).


## M7 / M8 start (branch m7-bilingual-pwa)
Decisions recorded: OQ1 = Law 151 of 2020 with note about 2022; OQ18 = measured subset + limitations; OQ5 revised = doctor RAG assistant in scope, drug-interaction checks remain future work.
Built: real patient-scoped doctor RAG assistant (consent-gated, grounded, confidence/sources/disclaimer, audited, Report Issue), bilingual privacy/terms pages, measured perf smoke (
pm run perf:smoke -> docs/PERFORMANCE.md), rate-limit regression test, full page i18n pass (in progress).
Measured locally: profile p95 2291 ms, clinical summary p95 5311 ms, emergency profile p95 1870 ms (483 B payload), chat p95 7772 ms, CSV upload p95 4972 ms. No 3G/concurrency/uptime claims.
