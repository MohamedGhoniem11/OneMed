# OneMed — Full Project Audit (Phase 1)

Audited: 2026-11-25 · Source of truth: `Document/OneMed-Document.pdf` (93 pages) · Codebase: `OneMed-main/` at commit `89f55e9`

This supersedes the earlier Phase 2 audit in this file. **No application code was changed during Phase 1.** The only new artifacts are the PDF conversion (`Document/OneMed-Document.md` + `Document/diagrams/*.png`) and this report. The git tree in `OneMed-main` remains clean.

---

## 0. Source document coverage

- The PDF was read end to end: all 93 pages, including title page, abstract, table of contents, lists of figures/tables, abbreviations, Chapters 1–6, references, appendix algorithms 1–4 and the Arabic summary.
- Conversion: `Document/OneMed-Document.md` (5,285 lines). **16 tables** were converted to Markdown tables; **40 figure-heavy pages** were rendered to `Document/diagrams/page-*.png` and linked inline; contact sheets `contact-1..5.png` were reviewed. Every figure in the document's List of Figures (Fig 0–23), all 9 tables and all four appendix algorithms are present. **No part of the PDF was unreadable.**
- The Arabic summary text extracts with character-order corruption from the PDF text layer; the rendered page images preserve it legibly, so nothing was lost.
- Where the document contradicts itself or existing docs, the PDF is treated as authoritative; contradictions requiring a decision are listed in §7.

---

## 1. Verification log — what was actually run

| # | Action | Result |
|---|---|---|
| 1 | Full PDF text + table + diagram read | 93/93 pages, 16/16 tables, 40/40 figure renders reviewed |
| 2 | `npm test` (backend) | **99/99 passed**, 19 files |
| 3 | `npm run lint` (backend) | 0 errors, 16 warnings (unused `React` in dead legacy `.jsx` tree) |
| 4 | `npm audit --omit=dev` (backend/frontend) | 0 vulnerabilities both |
| 5 | `npm test` + `npm run build` (frontend) | 6/6 tests; strict TS + Vite build PASS |
| 6 | Real API boot (`node src/server.js`, Firestore, local auth) + Vite in `VITE_API_MODE=api` | Both boot; all 6 role sessions exercised |
| 7 | Browser walkthrough of all 37 routes (public + 6 roles) | All render with **0 console errors**; data/behavior defects listed in §5 |
| 8 | Live E2E: doctor creates prescription → confirm → 24h link → fulfillment page → pharmacy selection → orders/status → notifications | PASS end to end against Firestore |
| 9 | Live E2E: patient clinical summary, analytics, PDF/FHIR/CSV reports, population report, audit CSV + chain verification (119 entries valid) | PASS |
| 10 | Live E2E: emergency page privacy display + Gemini RAG chat with 3 citations and confidence | PASS |
| 11 | Live E2E: NFC landing → Emergency Info | **BROKEN** — passes NFC token where an emergency token is required (§5 P0-2) |
| 12 | Live E2E: admin staff create / institution verify / pharmacy approve in API mode | **BROKEN** — writes only browser localStorage (§5 P0-6) |
| 13 | Demo mode (`VITE_API_MODE=demo`, port 5174): login, patient dashboard, emergency page | PASS; richer seed data than API mode |
| 14 | Desktop screenshots captured | `landing`, `patient-analytics`, `doctor-viewer`, `emergency` (paths in §6) |
| 15 | Mobile viewport walkthrough | **NOT PERFORMED** — the harness browser exposes no viewport/resize control (`resizeTo()` did not change `innerWidth`). Responsive findings are code-level only; this is an explicit verification gap. |
| 16 | Mutation testing of the test suite | **NOT PERFORMED** — Phase 1 was read-only for app code; authorization test gaps are inferred from reading assertions. |

---

## 2. Traceability table (requirement → document → status → files)

Status: **D** Done · **P** Partial · **B** Broken · **M** Missing. Paths are relative to `OneMed-main/` unless prefixed `docs/`.

| Req | Doc page/section | Status | Related files / evidence |
|---|---|---|---|
| R1 | p29, p48 | P | `src/routes/institution.routes.js`, `src/services/institution.service.js` — CRUD + `verified` flag only; no MoH license lookup, no generated credentials |
| R2 | p38, p70, UC-01 | P | `src/schemas/user.schema.js` (emergency contact required), `src/services/otp.service.js`, `frontend/src/pages/public.tsx:79-161` — email/password only; FE offers patient/doctor roles only; dev OTP displayed |
| R3 | p30, p49, p66 | P | `src/services/session.service.js`, `src/constants/roles.js`, `src/services/mfa.service.js` — TOTP not phone MFA; doctor excluded from `STAFF_ROLES`; no FE MFA enrollment; no FE refresh |
| R4 | p29, p49 | P | `src/middleware/auth.js`, `src/constants/permissions.js`, `src/middleware/consent.js` — critical read paths bypass consent (§3 C1/C5/C6) |
| R5 | p50, p74 | P | `src/controllers/user.controller.js`, `src/controllers/patient.controller.js`, `frontend/src/pages/patient.tsx:190-202` — emergency-contact Save is toast-only; no notification-preference endpoint |
| R6 | p29, p48 | D | `src/routes/records.routes.js`, `src/services/ingestion.service.js:103-191` |
| R7 | p29, p45, p88 | P | `src/services/ingestion.service.js:122-162`, `src/services/ocr.service.js`, `src/services/pdf.service.js` — scanned PDFs not OCR'd; DICOM metadata only |
| R8 | p43, p45 | P | `src/middleware/upload.js`, `src/services/file-storage.service.js` — checksum/format/size yes, malware scan absent |
| R9 | p42-43 | P | `src/schemas/record.schema.js:12-14`, `src/services/ingestion.service.js:47-56` — `archived`/`deleted` states unused |
| R10 | p67, p75 | P | `src/services/ocr.service.js`, `src/services/normalization.service.js:231-244` — Tesseract only per OQ10 |
| R11 | p68 | P | `src/services/normalization.service.js` — rule-based, no LLM field structuring; FHIR R4 parsing present |
| R12 | p29, p46 | P | `src/services/patient.service.js:14-37` — uid-linked, chronological record sort; no explicit cross-institution merge |
| R13 | p49 | M | No allergy/blood-type conflict flag logic in `src/**` |
| R14 | p13, p37, p77 | P | `src/services/institution.service.js` — CRUD only; connection test/field mapping/monitoring missing; UI buttons toast-only |
| R15 | p29, p46 | P | `src/services/patient.service.js:23-41` — N+1 consent checks, no NFC/QR search, no p95 measurement |
| R16 | p48 | P | `src/middleware/consent.js:22-40` — consent path only; treating-facility rule absent; demographics/prescriptions unguarded |
| R17 | p38, p48 | B | `src/services/patient.service.js:40-62`, `src/middleware/consent.js:37` — `req.emergencyOverride` never set; no TTL grant; roles too broad |
| R18 | p29, p62 | D | `src/services/clinical.service.js`, `src/routes/analytics.routes.js:8` — live-verified |
| R19 | p29, p88 | M | Deferred by approved OQ5 (future work) |
| R20 | p29, p89 | P | `src/services/clinical.service.js:79` record-count heuristic, not Algorithm 3 scoring; `src/services/emergency.service.js:90-99` threshold labels |
| R21 | p29, p60 | D | Disclaimer and knowledge-gap handling in both AI services |
| R22 | p61 | P | AI interactions audited; no `Report Issue` endpoint/button |
| R23 | p38, p52 | P | `src/services/consent.service.js`, `src/controllers/consent.controller.js:46-59` — revoke has no ownership check |
| R24 | p13, p46 | D | `src/services/token.service.js:52-92`, `src/routes/connect.routes.js` — 15-min signed QR; FE shows expiry but no live countdown |
| R25 | p29, p50, p68 | P | `src/services/audit.service.js` — hash chain works (119 entries verified); generic middleware skips GET, omits IP/UA; in-process serialization only |
| R26 | p38, p63 | P | `src/routes/audit.routes.js`, `src/services/report.service.js:183-208` — no filters, no consent history/deletion/security events |
| R27 | p23, p48, p52 | M | No deletion request endpoint, cascade job, or scheduled purge |
| R28 | p23, p48 | P | RBAC + consent filtering with the critical exceptions above |
| R29 | p29, p51 | P | `src/services/token.service.js:137-156` — signed JWT with UUID `jti`, not literal UUID v4; no server-side SVG/PNG generation |
| R30 | p29, p51, p78, p89 | D | `src/controllers/emergency.controller.js`, `src/services/emergency.service.js:37-71` — live-verified; blood type not visually prominent |
| R31 | p29, p90 | B | `src/services/emergency.service.js:57-71` honours field toggles; `chat()` ignores `aiChatbotEnabled` |
| R32 | p29, p57-58 | P | `src/services/emergency.service.js:83-163`, `src/services/llm.service.js` — RAG works live (123-first, citations); seed lacks Arabic chunks |
| R33 | p58 | P | `src/data/guidelines.js` (8 chunks incl. 2 Arabic), `scripts/seed-guidelines.mjs`; `scripts/seed.mjs` seeds only 3 English chunks |
| R34 | p13, p46, p86 | P | `src/services/token.service.js:94-135,201-206` — no chip-side encrypted dataset; `revokeNfc()` has no route; tokens never expire |
| R35 | p50 | P | `frontend/src/pages/public.tsx:210-221` — **BROKEN** in API mode (§3 P0-2) |
| R36 | p58-59, p76 | P | `src/controllers/prescription.controller.js:50-96` — extraction + confirm gate works; upload not persisted at extract; no `instructions` field in FE table |
| R37 | p13, p39, p48 | P | `src/services/fulfillment.service.js` — GPS sort from patient profile or Cairo default; no client Geolocation |
| R38 | p48-50, p83 | P | `src/routes/pharmacy.routes.js`, `src/services/pharmacy.service.js` — 6-step status machine; no subscription/commission logic |
| R39 | p40, p50 | P | `src/services/messaging.service.js` — participant checks; REST polling, no realtime |
| R40 | p50, p72 | P | `frontend/src/pages/patient.tsx:54-65` — type filter only; no institution/date filter; `Invalid Date` in API mode |
| R41 | p71 | P | `frontend/src/pages/doctor.tsx:18-39` — search is local text filter only; no pending-lab panel; hardcoded AI shortcut |
| R42 | p50, p75 | P | `frontend/src/pages/staff.tsx:14-58` — batch/manual/clear are toast-only; drop zone has no drag handlers; verification edits don't call `reviewRecord()` |
| R43 | p50, p63 | P | `frontend/src/pages/staff.tsx:115-155` — verify/approve/create write localStorage only; no institution registration form; no audit filters |
| R44 | p77 | P | `frontend/src/pages/staff.tsx:95-105` — credit balance now real, but staff/premium/connection metrics static; actions toast-only |
| R45 | p54 | P | `src/services/analytics.service.js:49-105`, `frontend/src/pages/patient.tsx:67-114` — missing Gantt, stacked visits, grouped comparison, radial gauge, imaging timeline |
| R46 | p55 | P | `src/utils/clinical-values.js`, `src/services/analytics.service.js` — no eGFR, TSH/T3/T4, BMI, adherence |
| R47 | p56 | M | No separate doctor analytics view with ranges/statistics/cross-lab comparison/drill-down |
| R48 | p29, p64 | P | `src/services/analytics.service.js:109-145` — no age/gender, seasonality, utilization, benchmarks; no MoH role |
| R49 | p29, p88 | P | `src/services/credit.service.js` — 10 credits/verified upload, non-atomic; ledger not scoped per institution |
| R50 | p38, p66, p81 | P | `src/services/notification.service.js` — in-app only; no FCM adapter, device tokens, preferences, or lab-result notification |
| R51 | p61 | P | `src/services/report.service.js:65-107` — PDF/FHIR Bundle/CSV; PDF is ASCII-only, ≤55 lines, no logos/page numbers |
| R52 | p62 | P | `src/services/report.service.js:109-153` — `reports:read` excludes lab staff |
| R53 | p62-63 | P | `src/services/report.service.js:155-181` — interaction warnings deferred per OQ5 |
| R54 | p63 | P | `src/services/report.service.js:183-208` — no filters; EDP checklist hard-coded PASS |
| R55 | p64 | P | `src/services/report.service.js:210-226` — PDF/CSV/JSON, no seasonality/benchmarks |
| R56 | p64 | P | `src/controllers/report.controller.js` — streams directly; no encrypted temp storage/24h auto-delete; no per-type scope gate |
| R57 | p69 | P | `frontend/src/pages/public.tsx:14-76` — nav/footer links all point to `/register`; hero is branded placeholder, no licensed image |
| R58 | p30 | M | No benchmarks, p95 instrumentation, or load tests |
| R59 | p30 | P | Checksums yes; no backup job or 30-day retention enforcement |
| R60 | p30, p49-50 | P | AES-GCM for uploaded originals only; Firestore documents and MFA secrets plaintext; TLS1.3/pen-test are deployment concerns |
| R61 | p30 | M | Not implemented/testable in demo |
| R62 | p30 | P | Partial AR/EN coverage; no WCAG audit pass; >3 clicks for some flows |
| R63 | p30, p52 | P | Consent/audit/encryption partial; no breach alerting, geo-fencing, Egypt-region enforcement |
| R64 | p65-66 | P | Manifest exists; **no service worker**; no offline emergency cache |
| R65 | p49 | P | Backend 15m JWT + hashed rotating refresh correct; FE never refreshes and treats 7d refresh expiry as session expiry |
| R66 | p65-66 | P | React/TS/i18n/Recharts correct; eager imports, ~900 kB single bundle |
| R67 | p65-66, p82 | P | Node/Express REST present; Firebase Admin JWT validation only used when configured; admin/verify endpoints disconnected from FE |
| R68 | p2, p52 | D | `src/store/firestore.store.js` port + local adapter |
| R69 | p67 | P | Vector search with in-memory cosine fallback; no deployed vector index |
| R70 | p67 | D | `src/services/llm.service.js` Gemini + deterministic offline fallback |
| R71 | p67 | P | Tesseract.js only per OQ10 |
| R72 | p67, p82 | P | `qrcode` used client-side; no server QR generation; Geolocation not wired |
| R73 | p65, p85 | D | `.github/workflows/ci.yml` exists (not re-run in this audit) |
| R74 | p34-35 | P | Most collections present; medicines embedded; role enum extended to six |
| R75 | p40-41 | D | `conversations`, `messages`, `orderStatus`, scan counters present |
| R76 | p35 | P | 1:1 uid mapping by convention; limited uniqueness constraints |
| R77 | p45, p82 | P | Core services present; FCM and Geolocation matching absent |
| R78 | p33 | D | Firestore document adaptation |
| R79 | p69-80, R79 | P | Most screens exist; several are partial; doctor analytics view and QR countdown missing |
| R80 | p69-80 | P | Navy/teal palette and type color coding mostly followed; hardcoded chart colors |
| R81 | p50 | P | Shared UI kit exists but duplicated tab/chat/connection components and a dead legacy component tree |
| R82 | p85 (user brief) | P | 8 backend users / 3 patients / 2 pharmacies seeded; FE seed diverges; no fulfilled-order or NFC demo artifacts |
| R83 | p85 | P | 99 backend + 6 FE tests; no deletion/FCM/archive/Arabic-KB coverage; no UAT |
| R84 | user brief | P | README extensive but partly stale; no demo hub or single start command; no demo script |
| R85 | user brief | P | `.env.example` complete; live service-account JSON and real `.env` sit in the workspace (gitignored, but present); dev OTP returned in API response |

### Requirements explicitly not checked / not verifiable in this phase
R58, R59 (uptime/backups), R61 (scale), R63 (region/breach), R64 (offline), R68 (cloud deployment), R69 (native vector index), R73 (CI actually green on a clean machine), R82 (UAT with real clinical users), R83 (LLM accuracy validation), R84 (demo script), R85 (key rotation). These are either aspirational NFRs (OQ18), deployment concerns, or need decisions/assets from the user.

---

## 3. Cross-cutting findings (new this audit)

### Critical — must be fixed before any API-mode demo or deployment

| ID | Finding | Evidence | Fix |
|---|---|---|---|
| C1 | Live Firebase service-account private key and real secrets in the workspace | `onemed-8fdcc-firebase-adminsdk-...json`, `OneMed-main/.env` (both gitignored but present) | Rotate/disable the service account, JWT key and upload key; inject credentials at runtime; add secret scanning to CI |
| C2 | Any authenticated user can revoke any patient's consent | `src/controllers/consent.controller.js:46-59`, `src/routes/consent.routes.js:12` — no ownership check | Pass actor context to `revoke()`; require `consent.patientId === user.uid || admin`; negative test |
| C3 | Pharmacy profile update IDOR | `src/controllers/pharmacy.controller.js:25` uses client-supplied `body.id`; `src/services/pharmacy.service.js:60-64` | Resolve pharmacy from `req.user` only; remove `id` from request |
| C4 | API errors silently replaced with demo localStorage data | `frontend/src/api/client.ts:110-127,133-140,278-299,331-336,469` | Remove demo fallbacks from API mode; propagate `ApiError` including 401/403 |
| C5 | Admin/staff/profile mutations persist only in localStorage in API mode | `frontend/src/api/client.ts:141-143` (`mutate`); `frontend/src/pages/staff.tsx:129,134,137`, `frontend/src/pages/patient.tsx:194` | Replace with real typed API calls (`/auth/staff`, `/institutions/:id/verify`, `/pharmacy/:id/approve`, `/patients/me`) |
| C6 | Patient demographics and prescriptions readable without consent | `src/routes/patient.routes.js:18,26`, `src/services/patient.service.js:10`, `src/controllers/prescription.controller.js:98-136` | Apply `canReadPatient`/consent on every read and create path |
| C7 | Emergency override has no time-limited grant; `req.emergencyOverride` is never set | `src/services/patient.service.js:40-62`, `src/middleware/consent.js:37` | Persist a signed, expiring grant with justification; consult it in `canReadPatient`; restrict to ER doctors |
| C8 | `aiChatbotEnabled` privacy toggle ignored by chat | `src/services/emergency.service.js:111-163` | Reject chat when disabled |
| C9 | Unverified doctors can write clinical data | `src/services/doctor.service.js:21`, `src/constants/permissions.js:15-17` — no `verified` check | Gate write capabilities on verified doctor + verified institution |
| C10 | NFC landing → Emergency Info is broken in API mode | Live test: `/nfc/{valid jwt}` → button navigates to `/emergency/{nfc jwt}` → "Invalid or unknown QR token." | Return a separate emergency token from `resolveNfc()` and route with it; add integration test |

### Major (P1)
R1–R22 of the code review are reproduced in condensed form here: non-expiring NFC/emergency tokens; no deletion pipeline/archive; no lab-result notifications; no FCM; PDF OCR missing and scanned PDFs skip the 80% gate; GPS sort ignores client Geolocation; report scope/expiry gaps; incomplete audit trail; pharmacy provisioning fallback to first pharmacy; population analytics truncated at hard-coded limits; N+1 search; consent revocation gap above; CSV formula injection (`src/services/report.service.js:13-21`); rate limiting disabled in tests; concurrency race in refresh rotation; TOTP secrets plaintext; `middleware/audit.js` skips GETs.

### Document problems needing a decision (do not guess)
1. **OQ1 EDP year**: abstract/features say Law 151 of **2022** (p2, p20, p22, p25, p83); NFRs/Table 8/references/Arabic summary say **2020** (p30, p52, p87, p91-92). Real law is 151/2020. Still pending.
2. **OQ18 aspirational NFRs**: p95 targets, uptime, 10k users, annual pen test, Egypt data centers — cannot be "done" in a demo.
3. Role-set conflict: 4 roles (FR11 p29) / 5 roles (feature matrix p21) / 6 roles (§3.4.2 p49). Code uses 6; confirm acceptable.
4. FastAPI/ReportLab (p64) vs Node/Express (p66); PostgreSQL audit chain (p68) vs Firestore-only (p2/p52); 80% (p43) vs 90% (p45) OCR threshold; EasyOCR (p65/p67) vs Tesseract-only; SMS (p39/p48) vs "no SMS" (p47); doctor AI chatbot required (p29/p38/p88) vs future work (p82); emergency number 123 (p57-60) vs 122 in mockup (Fig 22 p79); NFC landing "three options" (p13/p20) vs two (p50); QR token "UUID v4" (p51) vs signed JWT; "blockchain verification" (p63) vs hash chain (p50/p68); "Medical Data Lake" terminology vs Firestore.
5. Geolocation API is browser-native (p67/p82) but the backend needs coordinates to sort — decide whether the server accepts client `lat/lng`.

---

## 4. Screen-by-screen UI findings (from live walkthrough + code audit)

Priority: **P0** blocks a task/data integrity · **P1** major/WCAG AA · **P2** minor · **P3** polish.

| # | P | Screen(s) | Problem | Proposed fix |
|---|---|---|---|---|
| U1 | P0 | All authenticated pages | "Emergency Info" in sidebar points to hardcoded `em-demo-mona` for every role (`AppShell.tsx:46`) | Resolve per-user token from `myNfc()`/patient profile, hide when none, move to topbar |
| U2 | P0 | NFC landing | Emergency Info reuses NFC token → invalid emergency page (C10) | Separate token, integration test |
| U3 | P0 | Doctor patient viewer | Hardcoded age 45 / 82 kg / Lisinopril / vitals shown as real patient data (`doctor.tsx:63,77-78`); patient name rendered as `user_patient_1`; record dates show **"Invalid Date"** (API returns `observedAt`, FE reads `date`); emergency contact "Not recorded" although seed has one | Map `name`/`observedAt`/`data`→`values` in API adapter; derive meds/vitals from records; `Empty` when absent |
| U4 | P0 | Patient dashboard | API mode shows Blood Group "-" and allergies "-" although the seed has O+ / Penicillin (same field-shape mismatch) | Same normalization as U3; add adapter tests |
| U5 | P0 | Shared data layer | Demo conversations returned unfiltered (`client.ts:255`); pharmacy profile returns first pharmacy (`:247`) | Filter by session uid/consent in demo and mirror RBAC |
| U6 | P0 | Global search | Topbar search navigates `?q=` but only the doctor page reads it; patient records, lab, pharmacy, admin ignore it; the input itself is visually clipped ("Sear" + stray `/` in screenshots) | One shared `useSearchParams` hook on every target page, active-query chip with clear, proper flex/min-width |
| U7 | P0 | Admin/Hospital lab | Verify/approve/create/delete actions silently write browser localStorage in API mode (C5) | Real endpoints + loading/empty/error states |
| U8 | P1 | Navbar | Fixed 250px dark sidebar, crowded topbar (Back + hamburger + clipped search + search icon + language + bell + avatar); Emergency button at sidebar bottom; duplicate Emergency button on doctor dashboard | Redesign described below |
| U9 | P1 | Back button | `navigate(-1)` can leave the app; hidden label on mobile; arrow not mirrored in RTL (`ui.tsx:35-45`) | Explicit parent route per page, `aria-label`, RTL flip, ≥44px target |
| U10 | P1 | All forms | `Field` renders `<label>` without `htmlFor`/`id` (`ui.tsx:19`) — WCAG 3.3.2 | Use `useId()`, clone child with id/aria-describedby |
| U11 | P1 | Modals/chat | No focus trap, initial focus or restore in `Modal` (`ui.tsx:21-32`), `AppShell` menu (`AppShell.tsx:65-68`), emergency chat (`public.tsx:188`); no `overscroll-behavior: contain` | Focus trap + Escape + restore; reuse one dialog primitive |
| U12 | P1 | Toasts/chats | Toasts lack `aria-live="polite"` (`ui.tsx:11`); chat logs unannounced | Add live regions |
| U13 | P1 | Tabs | `role=tablist/tab` without `aria-controls`/tabpanel/arrow keys (`ui.tsx:71,124`); two duplicate tab components + inline tabs (`patient.tsx:59`, `doctor.tsx:69`) | One `Tabs` component with roving tabindex |
| U14 | P1 | RTL/i18n | Duplicate language toggles set `dir` but not `lang` (`public.tsx:23,178`); physical `marginLeft:6` (`patient.tsx:41`), `.bell-dot{right:6px}`, `.msg.me{align-self:flex-end}`; many hardcoded English strings across all pages | Route all toggles through `setLang()`; logical properties; move strings to `i18n.ts` (keys already exist) |
| U15 | P1 | Emergency page | Loading state renders "Invalid or unknown QR token." before data resolves; unhandled promise rejection; blood group shown as small chip instead of large/prominent; no primary-physician call action; no Report Issue on AI answers | Tri-state loading/error/data; enlarge critical fields; add call link and Report Issue endpoint |
| U16 | P1 | PWA | Manifest only; no service worker, so the document's cached emergency profile/offline records requirement is unmet | Add SW with precached emergency shell + runtime cache; label chat online-only |
| U17 | P1 | Responsive | Fixed inline grids `280px 1fr` / `340px 1fr` (`patient.tsx:176`, `doctor.tsx:192`, `staff.tsx:45`); `.btn.sm` ~26px and `.tab` ~36px; no `prefers-reduced-motion`; no skip link | `minmax(0,1fr)` + fallbacks; 44px targets; reduced-motion block; skip link |
| U18 | P1 | Lab portal | "Batch Import", "Manual Entry", "Clear Data" are toast-only; drop zone has no drag handlers; verification edits set confidence=100 locally instead of calling `reviewRecord()`; `.dcm` not accepted | Implement real handlers/API; clearly label any sample rows |
| U19 | P1 | Extraction review | "Edit" clears all extracted rows; generated link hidden by immediate tab switch; PDF upload unsupported; `instructions` field missing | Rename to Clear with confirm; keep review tab and show link banner; accept PDF; add column |
| U20 | P1 | Consents/settings | "Request deletion" and profile save write local DB in API mode; deletion has no confirmation; emergency-contact Save is a toast | Real endpoints + confirmation + pending state |
| U21 | P2 | Landing | Features/Solutions/How It Works and Privacy/Terms/Clinical Support all link to `/register` or a hardcoded emergency token | Real section anchors/legal pages or remove links |
| U22 | P2 | Doctor dashboard/patients | Search placeholder promises NFC/QR but only filters text; AI shortcut hardcodes `user_patient_1`; no pending-lab panel; "Good Morning, Hassan" hardcoded | Wire NFC/QR actions, derive patient from pending data, localized greeting |
| U23 | P2 | Notifications | Bell dot always on; notification items not clickable; no filters | Unread count from API; deep links per notification |
| U24 | P2 | Reports | Demo downloads are text/PDF stubs; audit report checklists hard-coded; no 24h expiry UX | Real exports in demo or explicit "demo preview" labels |
| U25 | P2 | Component organization | Two `Tabs` components + inline duplicates; three chat panes; two connections panels; ~16 dead legacy `.jsx` components + CSS modules + ~90 orphan assets | Consolidate and delete legacy tree (see §6) |
| U26 | P3 | Copy | `"..."` instead of `…` in several places; stale unused i18n key "Trusted by 5,000+ providers"; no `tabular-nums`/`text-wrap: balance` | Typeset pass |

### Proposed new navbar / layout (clear description, not yet implemented)
- **Shell**: replace the 250px permanent dark sidebar with a **compact 64px icon rail** on desktop (logo mark, role-colored section icons, active state = 3px teal left bar + tinted background + label tooltip). On mobile it becomes a **bottom tab bar** of the 5 primary destinations for the role, with "More" opening a full-screen menu sheet.
- **Topbar** (single row, 56px): left = contextual Back (only on detail pages, explicit parent) + current section title; centre = one unified search field with results dropdown (patients, records, orders) and a clear button; right = emergency action (red outline, icon + "Emergency", dynamic token), language segmented control with `lang`+`dir`, notification bell with real unread badge, avatar menu. Search icon duplication and clipped input removed.
- **Emergency action**: appears only where the document/user needs it — patient (their own QR config + public preview), doctor (their consult context), bystander pages (persistent bottom CTA). Not a permanent sidebar footer for lab/pharmacy/admin.
- **Spacing**: one 8px scale (`--space-1…8: 4,8,16,24,32,48,64,96`), applied to all cards, grids and gaps; tables get a separate dense 4px rhythm. Fixed-width grids become `repeat(auto-fit,minmax(260px,1fr))`.
- **Component consolidation**: one `Tabs`, one `ConversationPane`, one `ConnectionsPanel`, one `Modal` with focus trap; `StatusBadge` labels localised.

---

## 5. Demos inventory

| Demo | Entry point | Status | Evidence |
|---|---|---|---|
| Frontend demo mode (default) | `cd OneMed-main/frontend && npm run dev` | **Working** (live login + dashboard + emergency page verified) | `api/client.ts:4`, `data/demo.ts`, port 5174 run |
| Demo reset / prefilled credentials | AppShell demo flag, `/login` | Working; credentials visible in UI (acceptable only for demo) | `AppShell.tsx:57,70-73`, `public.tsx:145,157` |
| Backend credential-free boot + REST | `npm start` / `node src/server.js` | **Working** (booted against Firestore) | `src/server.js`, README |
| Backend seeds | `npm run seed`, `npm run seed:guidelines` | Working but divergent: FE 2 patients vs BE 3; seeded patient "Mona Ali Hassan" has `gender: male`; 3 English-only guideline chunks; no NFC/QR/notification/fulfilled-order artifacts | `scripts/seed.mjs:56-77,295-326` |
| OCR smoke / accuracy | `npm run test:ocr`, `npm run test:ocr:accuracy` | Ready; docs disagree on Arabic score (87 vs 91) and accuracy harness still uses a 90% gate | `scripts/ocr-*`, `docs/AUDIT.md` old §0 |
| Admin bootstrap | `node scripts/setAdmin.js <email>` | Ready but undocumented in `package.json` | `scripts/setAdmin.js` |
| Live API mode (`VITE_API_MODE=api`) | Vite :5173 + API :3000 | **Partial**: 37/37 routes render; E2E prescription/emergency/reports pass; admin mutations and NFC→emergency broken (§3 C5/C10) | live browser walkthrough |
| Demo hub reachable from main navigation | — | **Missing/Broken**: `PageSwitcher.jsx` exists only in dead legacy tree; active router has no hub | `main.jsx`, `PageSwitcher.jsx` |
| Single command to start everything | — | **Missing** | no orchestration script in either `package.json` |
| Demo script covering every user-facing feature (R84) | — | **Missing** | scheduled for M8 in `docs/PLAN.md` |
| Mobile demos | — | **Unverified** (no viewport control in harness) | §1 #15 |

---

## 6. Extra / disconnected inventory

**Remove (unused and not in the document):**
- `frontend/src/main.jsx`, `App.jsx`, `AppAdmin.jsx`, and the legacy `.jsx` tree: `Header`, `ImageViewer`, `MedicineTable`, `SideNav`, `TopAppBar`, `AdminHeader`, `MetricsRow`, `StaffTable`, `ApiConnections`, `PageSwitcher`, `PharmacyOrderPage`, `SystemOverviewPage`, `EmergencyPage` plus their ~15 CSS modules (~2,400 lines JSX + ~3,000 lines CSS). Search evidence: referenced only by each other and the unreferenced `main.jsx` (`index.html` loads `src/main.tsx`). This also removes the 16 lint warnings.
- Orphan assets: `icons/icon1.svg` (0 references) and duplicate images (`elena-patient.png` = `elena-rodriguez.png`; `wa-double-check.svg` = `wa-double-check-b.svg`; `adm-user-avatar.png` = `background-map.png`) — keep one copy.
- Backend declaration-only helpers with no callers: `aiLimiter` (or wire it), `keyFor`/`consentInternals`, `resetMfa`/`mfaInternals`, `rotateSessionForUser`/`sessionInternals`, `resetIdpForTests`, `isValidNationalId`, `updateMePatch`, `listUploads` (keep for deletion pipeline), `revokeNfc` (keep + expose route), `env.appUrl` reference in `report.service.js:94`.
- Delete duplicate `/app/notifications` vs `/app/patient/notifications` route; keep one.

**Keep but wire (in the document / needed):**
- Backend endpoints disconnected from UI: `/auth/staff`, `/auth/mfa/setup|enable`, `/auth/refresh`, `/doctors/:id/verify`, `/institutions` + `/:id/verify`, `/consents/grantee`, `/pharmacy/nearby`, `/pharmacy/orders/:id/cancel`, `/records/:id/original`, `/analytics/credits/ledger`, `DELETE /nfc/:token`.
- `reviewRecord()` and `pendingRecords()` — wire into lab verification and doctor dashboard.
- Unused i18n keys `reportIssue`, `learnMore`, `setupMfa` — use for the missing features.
- Extra collections (`institutions`, `uploads`, `authSessions`, `otpChallenges`, `userMfa`, `credits`, `creditsLedger`, `fulfillmentLinks`, `connectionTokens`, `nfcTokens`, `notifications`, `conversations`, `messages`) — all implementation infrastructure, justified as necessary; document in DESIGN.md.

**Behavior in code but not named in the document:** capability permission matrix, rotating refresh with reuse-revocation, offline LLM fallback, local/Firestore store port, credit ledger, in-app notification center, AES-GCM `.enc` originals, scoped JWT capability tokens, six-step order machine, de-identified population endpoint. Keep and document; only the QR token format needs a decision (§7).

**Screenshots (before state, desktop):** `C:\Users\Seif\.cache\opencode\browser-exports\bbfbef32d93b3416881f1468b38d42ea9161acb12c5f2b99949467dfd13dc8e8\` — `e4697cf7.../screenshot.jpeg` (landing), `5a0bf873.../screenshot.jpeg` (doctor viewer), `799da6c2.../screenshot.jpeg` (emergency), plus an analytics capture at `b374f4d6.../screenshot.jpeg`.

---

## 7. Impeccable UI audit (code-level, no fixes yet)

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2/4 | Unassociated labels (`ui.tsx:19`), no `aria-live`, no skip link, no modal focus trap |
| 2 | Performance | 2/4 | ~900 kB single bundle, eager routes, render-blocking font `@import` |
| 3 | Theming | 2/4 | Tokens exist but charts/inline colors hardcoded; `theme-color` mismatch |
| 4 | Responsive | 2/4 | Breakpoints exist but fixed inline grids overflow narrow viewports; RTL physical properties |
| 5 | Implementation integrity | 1/4 | Dead legacy UI tree; fake clinical data and toast-only stubs in active screens |
| **Total** | | **9/20 — Poor** | Coherent product identity, incoherent implementation |

No P0 code-level UI blocker; P1 items are U1–U20 above. Positive findings: global `:focus-visible`, logical CSS properties widely used, semantic tables, role-based guards, realistic seed data in `data/demo.ts`, live RAG emergency chat with citations.

Recommended impeccable commands after approval (in order): `harden` → `distill` → `adapt` → `clarify` → `optimize` → `colorize` → `typeset` → `polish`.

---

## 8. Prioritized plan for Phase 2 (awaiting approval)

1. **Security first (P0, separate small commits):** rotate workspace credentials; fix consent revoke ownership, pharmacy IDOR, patient/prescription consent checks, emergency override grant, `aiChatbotEnabled`; block demo fallback and `mutate()` in API mode; wire real staff/institution/pharmacy/profile APIs. Add negative authorization tests for each.
2. **Data-shape and E2E correctness (P0):** normalize `name`/`observedAt`/`data`→`values` in the FE REST adapter; remove hardcoded fake demographics/vitals; fix NFC→emergency token flow; fix lab/date displays. Add adapter tests and replay the 37-route walkthrough.
3. **Remove dead code (P1):** delete legacy JSX tree, CSS modules, orphan assets, declaration-only helpers; de-duplicate routes and components; re-run lint (expect 0 warnings).
4. **Implement missing document features (P1):** deletion pipeline, lab-result notifications + FCM adapter, PDF OCR/80% gate, client Geolocation in fulfillment, lab batch/manual/drag-drop, extraction `instructions` + PDF + link UX, doctor analytics view, audit filters, population filters, Report Issue, service worker/offline emergency shell, `revokeNfc` route.
5. **UI consistency pass (P1):** the new navbar/layout described in §4; spacing tokens; focus trap/live regions/labels/tabs; 44px targets; reduced motion; full i18n; RTL logical properties. Mobile walkthrough must be performed with a real viewport-capable browser or reported as unverified.
6. **Demos/docs (P1):** one demo hub page in main navigation, one start command, scripted walkthrough covering every user-facing feature, realistic seed artifacts (fulfilled order, NFC/QR, notifications, Arabic KB chunks), update README/REQUIREMENTS/PROGRESS traceability.
7. **Phase 3 verification:** full tests, lint, type check, audit, desktop + mobile browser walkthrough, before/after screenshots, re-run code review and impeccable audit, update this traceability table.

**Nothing in Phase 2 will start until you approve this audit.**


---

## 9. Phase 2 resolution (branch phase2-audit-fixes)

The table in §2 records the Phase-1 baseline. The following items were re-verified after the Phase-2 commits:

| Phase-1 finding | Phase-2 status | Evidence |
|---|---|---|
| C1 live credentials in workspace | **WARN** — still present, must be removed/rotated by the user; never committed | C:\Users\Seif\Desktop\OneMed\onemed-8fdcc-...json and .env remain gitignored |
| C2 consent revoke IDOR | Fixed | ownership check + 8 negative auth tests |
| C3 pharmacy update IDOR | Fixed | server resolves pharmacy from session; test asserts cross-pharmacy edit ignored |
| C4 silent demo fallback in API mode | Fixed | strict http(); 401 refresh with single-flight |
| C5 localStorage-only admin mutations | Fixed | real /auth/staff, /institutions/:id/verify, /admin/pharmacies/:id/approve, /patients/me, /patients/:id/deletion calls; live verify changed a real Firestore institution |
| C6 demographics/prescription consent | Fixed | controller-level canReadPatient; self route guard corrected after live 403 |
| C7 emergency override not enforced | Fixed | persisted expiring grant consulted by canReadPatient; doctors only |
| C8 aiChatbotEnabled ignored | Fixed | chat refuses when disabled; live 403 test |
| C9 unverified doctor writes | Fixed | 
equireVerifiedDoctor on prescription and record write routes |
| C10 NFC -> emergency broken | Fixed | NFC resolver returns a signed emergency token; live browser flow now opens a real emergency page |
| U1-U4 hardcoded emergency button / fake clinical data / API date-name mismatch | Fixed | dynamic myEmergencyLink(), normalized API adapter, dashboard/viewer show real values; screenshot verified |
| U5-U7 search, admin actions, stub buttons | Fixed (partial) | shared search hook + topbar; admin actions wired; lab batch/manual/drag-drop/review implemented; some admin connection panels remain toast-only |
| U8-U26 shell/a11y/spacing/i18n | Fixed in shared components; page-level hardcoded English and some tab semantics remain | new rail/topbar/tokens, Field labels, dialogs, live regions; impeccable detector returned [] |
| R27 deletion pipeline | Request endpoint + 
pm run purge:deletions job implemented; scheduled execution is deployment work | scripts/purge-deletions.mjs |
| R50 FCM | Adapter + device-token endpoint implemented; actual delivery requires Firebase credentials | src/services/fcm.service.js |
| R64 PWA | Service worker added and registered in production build | rontend/public/sw.js |
| R47 doctor analytics | Implemented | /app/doctor/analytics |
| Demos | Demo hub in main nav, 
pm run dev:all, 
pm run demo (11/11 PASS), realistic seeded artifacts | rontend/src/pages/demos.tsx, scripts/* |

Remaining known gaps (not silently marked done): mobile viewport walkthrough (browser tool has no viewport control); multi-instance-safe audit chain; native Firestore vector index deployment; TLS 1.3/data localization/pen test (deployment); PDF raster OCR for scanned documents; doctor-facing RAG chatbot and drug interaction checks (explicitly deferred by OQ5); Toast-only hospital connection configuration panels; some page-level hardcoded English strings.


### Post-review corrections (commit 643792d)
An independent code review of the Phase-2 diff found and we fixed: fail-open verified-doctor guard (now requires a verified profile; negative test added), emergency override silently granting full record access (now critical-scope only; verified 403 before and after override), hospital_admin /api/users 403 (institution-scoped listing), unbounded emergency tokens per NFC scan (stable jti + rate limit; verified 2 scans create 1 record), and incomplete EDP purge (messages by conversation, device tokens by userId, fulfillment/override collections added). Also removed a dead override branch and a hot-path dynamic import.


### M7/M8 verification notes
- Full AR/EN coverage: 336 new i18n keys per locale, RTL verified in browser (dir=rtl, lang=ar); Lighthouse accessibility/best-practices/SEO all 100/100/100 after ARIA/contrast/heading fixes.
- PWA: service worker registers in production preview, 4 shell assets cached, manifest standalone.
- Doctor RAG assistant implemented; real Firestore browser run returned grounded patient context with confidence/sources/disclaimer.
- Gemini free-tier quota was exhausted during verification (20 generate requests/day). Emergency and doctor chat now degrade to deterministic, cited local answers instead of returning 500; this is a documented external limitation, not a code failure. 
pm run demo passes 12/12 with the fallback active.
- Mobile viewport walkthrough remains impossible with the available browser harness; code-level responsive fixes were applied and verified at desktop widths.
