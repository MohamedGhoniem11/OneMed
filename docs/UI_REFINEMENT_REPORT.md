# OneMed — UI Refinement Report (concept-image pass)

Applied 2026-11-24 after reviewing all 12 images in `UI/`; analysis in `docs/UI_VISION.md`. Source of truth remains the PDF + `docs/DECISIONS.md`. No mockup copied pixel-for-pixel — the concepts' information architecture and status semantics were adopted, their inconsistencies resolved against the document.

## What changed (G1–G12)

| ID | Change | Files |
|----|--------|-------|
| G1 | Landing: "How It Works" 3-step workflow + bilingual footer (Privacy/Terms/Support) + feature "Learn more" links | `pages/public.tsx`, `i18n.ts` |
| G2 | Doctor dashboard: red Emergency shortcut (123), "System Online" chip, unread bell dot, clinical status vocabulary (Waiting/In progress), global search placeholder per concept | `pages/doctor.tsx`, `components/AppShell.tsx`, `index.css` |
| G3 | Patient viewer: shared IdentityStrip (avatar, ID pill, demographics, blood, allergy chip), "End of recent history" footer, print-only identity | `components/ui.tsx`, `pages/doctor.tsx`, `index.css` |
| G4 | Analytics: Overview/Analytics/Reports view tabs, KPI micro-bars + trend pills, **Lipid Panel** (Total/LDL/HDL/Triglycerides with threshold-colored bars) | `pages/patient.tsx`, `components/ui.tsx`, `index.css` |
| G5 | Settings: consolidated summary cards linking to consents/notifications/QR-NFC badge config (concept's single-view mental model) | `pages/patient.tsx`, `i18n.ts` |
| G6 | Lab: real Batch Import (paste CSV/JSON) and Manual Entry forms, "Processing Complete" file chip, upload hint updated to agreed format set (no HL7) | `pages/staff.tsx`, `i18n.ts` |
| G7 | Extraction review: zoom in/out/rotate controls over source image | `pages/doctor.tsx` |
| G8 | Admin overview: API Connections card (FHIR connected / Legacy CSV warning / Add connection) | `pages/staff.tsx` |
| G9 | Emergency chatbot: patient context chip row (only approved fields: conditions, blood, allergies) | `pages/public.tsx` |
| G10 | One status vocabulary in `StatusBadge` (waiting, in_progress, discharged, critical, needs_review/unverified, connected, warning, etc.) + `Chip` tones | `components/ui.tsx` |
| G11 | Unified brand "OneMed / Healthcare Platform" in the rail | `components/AppShell.tsx`, `index.css` |
| G12 | Promoted recurring patterns to shared components: IdentityStrip, MetricCard, VerificationRow, SectionTabs; removed several ad-hoc inline styles | `components/ui.tsx`, `index.css`, all pages |
| — | New EN/AR translation keys for every new string; no raw i18n keys in AR screenshot | `i18n.ts` |

Deliberately **not** copied: "122" (→ 123 per OQ8), HL7 upload text (excluded per OQ13), three NFC options (→ two per OQ7), non-Egyptian names/phone formats.

## Verification
- `npm run build` (frontend): PASS — strict TypeScript + Vite.
- `npm test` (frontend): 3/3. `npm test` (backend): 61/61.
- Browser re-check of every changed screen in **EN and AR** (RTL): landing, analytics, settings, doctor dashboard, patient viewer, lab, admin, emergency + chatbot — **zero console errors**.
- Confirmed present: Lipid Panel, view tabs, KPI micro-bars, identity strip, history footer, chatbot patient chips, upload/batch/manual tab forms, API connections, zoom controls, 123 wording, no untranslated keys in AR.

## Known limitations
- PWA service worker/offline caching still a future polish item (manifest exists).
- Concept images use synthetic clinical values; demo data follows the PDF's Egyptian context and OQ decisions.
