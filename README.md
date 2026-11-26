# OneMed — Unified Medical Data Platform

Bilingual (Arabic/English) healthcare connectivity platform (academic build): patient timelines, consent-gated clinical access, lab ingestion, prescription extraction and pharmacy fulfillment, emergency QR/NFC pages with grounded first-aid guidance, analytics, reports and role-based portals for six roles. Local runs use a fully synthetic cohort — no real patient data is included.

> Academic graduation project. Production deployment requires Firebase Blaze credentials supplied through environment variables; no secrets are included in this repository.

## Features

- Six roles: patient, doctor, lab staff, pharmacy, hospital admin, system admin.
- Multi-format ingestion: PDF (digital text + scanned OCR), JPG/PNG, CSV/JSON/FHIR/DICOM metadata, manual entry; 50 MB cap; low-confidence manual review.
- Signed QR connection (15 min), emergency QR/NFC capability links with expiry and revocation, public privacy-filtered emergency page.
- Gemini-backed, grounded first-aid chatbot and doctor assistant with confidence, sources, disclaimers and Report Issue.
- Prescription OCR/LLM extraction, mandatory doctor confirmation, 24-hour fulfillment links, GPS-sorted pharmacies and WhatsApp deep links.
- In-app notifications with an FCM adapter, encrypted original uploads (AES-256-GCM), hash-chained audit log, reports (PDF/FHIR/CSV/JSON) and analytics.
- Confirm-backed lifecycle actions: authorized staff archive/restore clinical records (clinicians retain access), users can hide a conversation only for themselves and remove their notifications, admins deactivate/reactivate staff, institutions and pharmacies with session revocation and audit events.
- PWA shell, RTL support, responsive navigation and Lighthouse 100/100/100 desktop baseline.

## Quick start (no credentials)

```bash
npm install
cd frontend && npm install && cd ..
npm run seed          # populate the API with the synthetic cohort BEFORE starting it
npm run dev:all       # API :3000 + UI :5173 in API mode
```

Open <http://localhost:5173>. Health check: <http://localhost:3000/>.

The UI talks to the real API by default. The browser-local dataset remains available only when `VITE_API_MODE=demo` is set explicitly (used by unit tests and offline development); production builds are always API-only.

### Synthetic accounts (from `npm run seed`)

| Role | Email | Password |
|---|---|---|
| patient | mona.patient@example.com | Demo!onemed1 |
| doctor | karim.doctor@example.com | Demo!onemedD1 |
| lab staff | nadia.lab@example.com | Demo!onemedL1 |
| pharmacy | pharmacy.desk@example.com | Demo!onemedP1 |
| hospital admin | hany.admin@example.com | Demo!onemedH1 |
| admin | admin.onemed@example.com | Demo!onemedA1 |

Staff roles require TOTP MFA; seeded secrets are written to `userMfa/{uid}`.

## Environment

Copy `.env.example` to `.env`. Never commit real values.

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT`, `HOST`, `TRUST_PROXY` | Runtime and reverse proxy |
| `PERSISTENCE`, `AUTH_PROVIDER` | `firestore`/`local`, `firebase`/`local` |
| `AUTH_JWT_SECRET`, `UPLOAD_ENCRYPTION_KEY` | Required in production (32/64 hex chars) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` | Firebase Admin credential |
| `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY` | Project and Web API key (phone OTP) |
| `FIREBASE_PHONE_AUTH` | Enables real Firebase phone OTP; required in production |
| `FIREBASE_STORAGE_BUCKET`, `STORAGE_DRIVER=firebase` | Encrypted original uploads in Firebase Storage |
| `LLM_DRIVER=cloud`, `FUNCTIONS_BASE_URL` | Gemini/RAG calls through Cloud Functions |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL` | Used by Cloud Functions (and direct local mode) |
| `CORS_ORIGINS`, `PUBLIC_BASE_URL` | Allowed origins and links in QR messages |
| `AUTH_OTP_DEV_DELIVERY` | Must be false in production |
| `BACKUP_DIR`, `ARCHIVE_AFTER_DAYS` | Backup location and record archival threshold |
| rate-limit/TTL variables | See `.env.example` for all defaults |

Production startup fails closed if any required variable is missing or demo delivery/rate-limit bypass is enabled.

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start API only |
| `npm run dev:all` | Start API + frontend in API mode |
| `npm run seed` / `seed:guidelines` | Idempotent synthetic cohort / first-aid KB |
| `npm run test:ocr`, `test:ocr:accuracy` | OCR smoke/accuracy |
| `npm run demo` | 12-flow end-to-end API walkthrough |
| `npm run perf:smoke` | Measured NFR subset → `docs/PERFORMANCE.md` (local only) |
| `npm run backup`, `restore:backup -- <file> --confirm` | Encrypted backup/restore |
| `npm run archive:records` | Move aged records to `archived` state |
| `npm run purge:deletions` | Process due EDP erasure requests |
| `npm run set:admin -- <email>` | Promote an account to admin |
| `npm test`, `npm run lint` | Backend tests/lint |
| `cd frontend && npm test`, `npm run build`, `npm run test:e2e` | Frontend tests/build/Playwright |

## Testing

- Backend: Vitest + Supertest integration and unit tests (RBAC, authorization matrix, MFA, OTP, audit, ingestion, fulfillment, doctor chat, backup/restore).
- Frontend: Vitest unit tests and Playwright desktop/tablet/mobile flows (slow network, network errors, session expiry).
- CI installs, lints, type-checks, tests, builds, runs Playwright, scans secrets, and lints Cloud Functions.

## Deployment (Firebase Blaze)

1. Create a Firebase project on Blaze; enable Firestore, Authentication (Email/Password + Phone), Storage and Cloud Functions.
2. Create a service account with Firestore/Storage/Admin privileges; supply it via `FIREBASE_SERVICE_ACCOUNT_JSON` (preferred in hosting) or a gitignored file path in `GOOGLE_APPLICATION_CREDENTIALS`.
3. Set the variables in the table above, especially `FIREBASE_API_KEY`, `FIREBASE_PHONE_AUTH=true`, `FIREBASE_STORAGE_BUCKET`, `STORAGE_DRIVER=firebase`, `LLM_DRIVER=cloud`, `FUNCTIONS_BASE_URL`, and production secrets.
4. Deploy functions: `npm --prefix functions ci && npm --prefix functions run deploy`.
5. Deploy rules/indexes: `firebase deploy --only firestore:rules,firestore:indexes`.
6. Build the frontend (`npm --prefix frontend run build`) and deploy `frontend/dist` with Firebase Hosting or another static host; configure rewrites to `index.html`.
7. Run `npm run seed` only for a local or demo environment; never seed synthetic accounts in production.

## Known limitations

- Firebase resources, real phone OTP delivery, FCM push and native vector indexes require your credentials and deployment; they are not verifiable in CI.
- Aspirational NFRs (uptime, large-scale concurrency, Egypt-region hosting, penetration testing) are not claimed as verified.
- Mobile/tablet behavior is covered by Playwright emulation; real device/NFC hardware testing remains manual.
- Drug-interaction validation is intentionally out of scope (requires a licensed drug database and clinical governance).
