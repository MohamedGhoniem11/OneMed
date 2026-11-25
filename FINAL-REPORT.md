# OneMed — Final Verification Report

Date: 2026-11-26 · Branch: `m7-bilingual-pwa` · Verified from a clean clone of current HEAD, without relying on earlier checklists or “Done” labels. Source of truth: `Document/OneMed-Document.md` (converted from `Document/OneMed-Document.pdf`, all 93 pages including tables, diagrams and appendices).

## Verdict: **NOT READY**

Core functionality works and a clean-machine demo is reproducible, but the document is not fully met: several material requirements are missing or partial, serious security/deployment issues remain, and mobile/tablet UI verification could not be performed with the available harness. Per the rules, I am not marking this Ready.

---

## 1. Fresh setup (from clean clone, empty database)

| Check | Result | Evidence |
|---|---|---|
| `git clone` of current HEAD | **Pass** | Clean clone at `%TEMP%\opencode\final-check2\clean-clone`; no `.env`, no `data/`. |
| `npm install` root + frontend | **Pass** | Completed; frontend `npm audit` 0 vulnerabilities. |
| `npm test` root | **Pass** | 22 files, **113 tests passed**. |
| `npm run lint` | **Pass** | 0 problems. |
| `npm audit --omit=dev` | **Pass** | 0 vulnerabilities. |
| `npm test` / `npm run build` frontend | **Pass** | 2 files / 6 tests; strict build passes. |
| `npm run seed` then `npm run dev:all` | **Pass (after fixes)** | Health: `{"status":"ok","persistence":"local","authProvider":"local"}`; seed creates 8 users, 3 patients, 4 MFA credentials, 6 guideline chunks. |
| `npm run demo` | **Pass (after fixes)** | **12/12 flows passed** against the clean-clone local database. |

**Issues found and fixed:** the broad `.gitignore` pattern `data/` had excluded `src/data/guidelines.js` and `frontend/src/data/demo.ts`, so the first clean clone failed 2 test suites and the frontend build. Narrowed to `/data/` and committed both source files. README quick start was stale (“five static prototypes”, no seed step); corrected. `npm run demo` initially created sessions out-of-process (401 after server start) and could not re-authenticate staff on repeat runs; it now logs in through the real API using seeded TOTP secrets. Local persistence `rename` failed intermittently with Windows `EPERM`; added retry + fallback write. Order: seed **before** starting the API.

---

## 2. Document compliance

Full requirement table is in `docs/AUDIT.md` §2 and the independent reviews’ findings below. Summary against the PDF:

| Area | Result | Notes |
|---|---|---|
| Core portals, RBAC, consent, audit chain, ingestion of digital PDF/CSV/JSON, prescription confirm → 24h link → GPS pharmacies → WhatsApp, emergency public page + RAG chatbot, reports, analytics | **Partial / mostly implemented** | Verified live in API mode. |
| Functional requirements FR1–FR20 | **Partial** | F1 institutional self-registration/MoH license check missing; F4 NID/phone auto-link missing; F7 doctor RAG simplified (no ReAct loop); F12 GET reads not audited; F13 backend/PDF not bilingual. |
| NFRs p30 | **Fail / Not tested** | Measured subset only; backups, archival, retention, TLS, pen test, 10k concurrency, 3G page load, Arabic-dialect accuracy not implemented/tested. |
| State diagram p42–43 | **Partial** | `archived` never occurs; scanned PDFs skip OCR; deletion outside the record lifecycle. |
| Architecture p44–47 | **Fail** | No Firebase Cloud Functions, no Firebase Storage (files on local disk), no Firebase phone Auth, server-side `qrcode` absent, vector index not deployed. |
| Security/compliance p48–52 | **Partial** | No allergy/blood-type conflict flag, no treating-facility rule, no Egypt localization, audit GET gap, deletion incomplete. |
| Dashboard p53–56 | **Partial** | Missing visit-frequency stacked bars, grouped comparison, radial gauge, imaging timeline, patient plain-language view, doctor slope/SD/rate-of-change. |
| LLM features p57–61 | **Partial** | Doctor RAG implemented but simplified; scanned-PDF OCR absent; interaction warnings deferred by contradiction. |
| Reports p61–64 | **Partial** | ASCII/55-line PDF writer, no encrypted 24h temp storage, FHIR omits allergies/conditions/medications, audit report omits deletion/security events. |
| Registration p70 | **Fail** | Only Patient/Doctor roles; no NID/phone OTP login; 3 intro sections absent. |
| Lab portal p75 | **Partial** | Batch/manual/drag-drop now wired, but OCR verification rows only populate if extraction returns values; DICOM upload not accepted. |
| Doctor/patient analytics p54/56 | **Partial** | Several required visualizations and patient-vs-doctor presentation rules unmet. |

**Document contradictions left to your decision:** EDP 2020 vs 2022 (implemented as 2020 with note); 4/5/6 roles (implemented 6); doctor chatbot required vs “future work” (implemented); 80% vs 90% OCR threshold (implemented 80%); Cloud Functions/Firebase Storage/PostgreSQL vs Express/Firestore/local disk; FastAPI reports vs Node; SMS vs FCM-only; Gemma vs Gemini; “no patient ID in QR URL” vs JWT payload containing patient ID.

---

## 3. Code health

| Check | Result | Evidence |
|---|---|---|
| Build / lint / types | **Pass** | `npm run build`, `npx tsc --noEmit`, `npm run lint` all clean in a fresh clone. |
| Tests | **Pass** | 113 backend + 6 frontend tests. Mutation check: removing `canReadPatient` from report service is detected; a new test now covers unreviewed-record direct fetch. |
| `npm audit` | **Pass (prod)** | 0 production vulnerabilities; 2 dev-only moderate advisories via `nodemon`→`minimatch`. |
| TODO/FIXME/placeholders | **Pass / Partial** | Zero TODO/FIXME/HACK hits; but demo mode still contains deterministic fake PDF blobs and some toast-only connection panels. |
| Unused code | **Partial** | ~10 unused exports (`aiLimiter`, `isValidNationalId`, `patientEmergency`, `verifyDoctorAccount`, `createInstitution`, etc.), 98 unreferenced assets, no unused dependencies. |
| Console errors | **Partial** | Fixed unhandled API rejections in page effects; final browser runs showed 0 console errors on fresh loads. HMR-only `useAuth`/`createRoot` warnings appear during development edits. |

Issues fixed: token leakage into audit logs (redacted), hospital-admin/pharmacy tenant fallback (fail closed), token redaction in 404/5xx logs, incomplete deletion purge (encrypted files + user/patient/session/MFA/messages), WhatsApp `wa.me` country code, extraction “Edit” wiping rows, lab verification rows, demo hub invalid tokens, invalid-login error, demo credentials hidden in API mode.

---

## 4. User flows

| Role / flow | Result | Evidence |
|---|---|---|
| Patient: dashboard, records, analytics, prescriptions, consents, emergency config, messages, notifications, settings | **Pass (render + key actions)** | Browser walkthrough of all routes; real Firestore/local API data; 0 console errors after fixes. Deletion request now uses real API + confirmation. |
| Doctor: dashboard, patients, viewer, prescriptions, QR/NFC, messages, reports, analytics, settings | **Pass / Partial** | All routes render; RAG assistant returns real patient context with confidence/sources/disclaimer. Extraction PDF upload and drug-interaction warnings remain unmet. |
| Lab staff: upload, batch, manual, verification, history | **Partial** | All tabs wired; OCR verification rows depend on extraction output; no DICOM. |
| Pharmacy: inbox, status transitions, chat, profile | **Pass** | Verified with seeded orders. |
| Hospital admin / admin: all portals | **Pass / Partial** | Pages and API actions work; connection configuration panels are still toast-only; some status badges are hardcoded “DEMO”. |
| Public: emergency page, chatbot, NFC landing, fulfillment | **Pass** | Opened every demo link from the hub; all render with real signed tokens. |
| Invalid input / double submit / refresh / browser back | **Partial** | Invalid login now shows inline error; refresh and back work; double-submit guards exist on key async buttons but were not exhaustively exercised. |
| Expired login / network errors | **Not tested systematically** | 401/refresh logic code-reviewed; browser showed unhandled rejections before the catch fixes, then clean after; no controlled expiry simulation. |

---

## 5. Security and privacy

| Check | Result | Evidence |
|---|---|---|
| Direct API cross-role access | **Pass** | `no token → 401`, patient `/users → 403`, patient other patient → 403, pharmacy population report → 403, patient deletion for other patient → 403, admin audit → 200. |
| Consent gating | **Pass** | Stranger doctor records → 403; consented doctor → 200. |
| Emergency privacy | **Pass** | Toggling `showAllergies:false` removed allergies from the public profile; blood group remained when approved. |
| Audit token redaction | **Pass** | Regression test asserts no raw fulfillment JWT in audit log. |
| Tenancy fail-closed | **Pass** | Unaffiliated hospital admin `/users → 403`; unaffiliated pharmacy profile → 404. |
| Secrets | **Fail** | `OneMed-main/.env` and the Firebase service-account JSON are present in the workspace and hold live credentials (gitignored, but must be rotated/removed). |
| Token privacy | **Fail** | Emergency/NFC JWT payloads contain `patientId`; base64-decodable by anyone holding a URL, contradicting p51. |
| Production OTP | **Fail** | `AUTH_OTP_DEV_DELIVERY=true` returns/logs the code; no email/SMS adapter. |
| Audit coverage / chain | **Partial** | GET reads skipped; in-process hash chain not multi-instance safe. |
| Dependencies | **Pass** | 0 production vulnerabilities. |

---

## 6. UI

| Check | Result | Evidence |
|---|---|---|
| Desktop navbar / back / search / emergency button / spacing / components | **Pass** | Compact icon rail, single topbar with unified search, contextual Back, dynamic emergency action, 8px spacing scale, shared components. |
| Accessibility (desktop) | **Pass** | Lighthouse **100 / 100 / 100** (accessibility, best practices, SEO) on patient dashboard after fixes. |
| Light/dark/i18n | **Partial** | 638 EN/638 AR keys, RTL verified `dir=rtl lang=ar`; ~42 hardcoded error/technical strings remain; no dark theme required by document. |
| Loading / empty / error states | **Partial** | Skeletons, Empty, error alerts added; several pages still silently ignore failures or show toasts only. |
| Mobile / tablet | **Not tested** | Harness browser exposes no viewport emulation (`resizeTo` ineffective); code-level responsive review found logical properties and breakpoints, but no device simulation was possible. |

---

## 7. Demos

| Check | Result | Evidence |
|---|---|---|
| Demo hub in main navigation | **Pass** | `/app/demos`; links to landing, registration, emergency, NFC, fulfillment and every role portal. |
| Every hub link opens | **Pass** | API-mode links resolve to real signed tokens; demo-mode links use seeded tokens (`em-demo-mona`, `NTAG424-0A1B`, `rx-demo-8f3a`). |
| Sample data | **Pass** | `npm run seed` creates 8 accounts, 3 patients, records, consents, QR/NFC artifacts, fulfilled order, 6 KB chunks. |
| Reset | **Pass (demo mode)** | Demo-mode reset clears localStorage and reseeds; API-mode reset requires re-running `npm run seed` on a fresh DB. |
| `npm run demo` | **Pass** | 12/12 flows. |

---

## Issues found and fixed (small commits)

`9870772` track gitignored source data · `dcc1d68` correct README setup · `16435cc` demo links / extraction clear / lab verification rows · `02a16e0` token redaction, tenancy fail-closed, erasure coverage, regression tests · `25b010f` fresh-clone seed/MFA/local-store reliability · `3bb302d` page error handling · `dc8e0a3` patient NFC issuance · `a682ee8` invalid-login error + hide demo credentials.

## Remaining issues, ranked

**Critical**
1. Live credentials in workspace (`.env` + Firebase service-account JSON) — rotate/remove.
2. Emergency/NFC JWT exposes `patientId` in URL — use opaque tokens with hash lookup.
3. Production OTP delivery is a dev code path — no real email/SMS adapter.
4. EDP erasure retains `accessLog` and deletion-request rows containing patient IDs; no scheduler.

**High**
5. Scanned-PDF OCR absent (state diagram requirement).
6. Audit reads (GET) not logged; hash chain single-process only.
7. Report pipeline: ASCII/55-line PDF, no 24h encrypted temp store, incomplete FHIR/audit content.
8. Many dashboard visualizations and patient/doctor view rules unmet.
9. Registration roles/OTP and institutional MoH verification incomplete.
10. No backups/archival/retention; NFR scalability/uptime untested.
11. Architecture substitutions (no Cloud Functions/Storage/phone Auth/server QR).
12. Allergy/blood-group conflict detection absent.

**Medium / Low**
13. Unused exports/assets; duplicate helpers/components; 975 kB bundle.
14. Toast-only hospital connection panels; hardcoded demo status badges.
15. ~42 hardcoded English strings; HMR warnings; dev-only npm advisories.

## Not tested, and why

- **Mobile/tablet viewport** — harness browser has no viewport emulation.
- **Real NFC hardware, geolocation permission flow, WebAuthn/phone OTP** — hardware/external services unavailable.
- **3G page load, load/concurrency, uptime, pen test** — no load/benchmark tooling or deployment environment.
- **Firestore emulator / Firebase Auth / FCM delivery** — no Java/Docker, no Web API key, no device tokens.
- **Full UAT with real clinical users** — no stakeholders available.

## Run instructions

```bash
cd OneMed-main
npm install
cd frontend && npm install && cd ..
npm run seed          # BEFORE starting the API
npm run dev:all       # API :3000 + UI :5173 in API mode
npm run demo          # 12/12 flows
npm run perf:smoke    # writes docs/PERFORMANCE.md
```

Demo hub: `http://localhost:5173/app/demos` (reachable from main navigation).

### Test accounts (from `npm run seed`)

| Role | Email | Password |
|---|---|---|
| patient | mona.patient@example.com | Demo!onemed1 |
| patient | youssef.patient@example.com | Demo!onemed2 |
| patient | salma.patient@example.com | Demo!onemed3 |
| doctor | karim.doctor@example.com | Demo!onemedD1 |
| lab_staff | nadia.lab@example.com | Demo!onemedL1 |
| pharmacy | pharmacy.desk@example.com | Demo!onemedP1 |
| hospital_admin | hany.admin@example.com | Demo!onemedH1 |
| admin | admin.onemed@example.com | Demo!onemedA1 |

Staff roles require TOTP MFA; seeded TOTP secrets are written to `userMfa/{uid}` by `npm run seed` and used by `npm run demo`.
