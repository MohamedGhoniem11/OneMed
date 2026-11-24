# OneMed Frontend

Complete React 18 + TypeScript PWA for the OneMed platform: every screen described in the project document, across all six roles and the public emergency/QR/NFC pages.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit + vite build
npm test         # vitest (jsdom)
npm run preview  # serve the production build on 4173
```

The dev server proxies `/api` to the backend at `http://localhost:3000`.

## Demo mode (default)

By default the app runs in **demo mode** (`VITE_API_MODE=demo`) with realistic sample data stored in `localStorage` under `onemed.demo.v1`. A "DEMO DATA MODE" label appears in the top bar. All actions (login, consent toggles, prescription upload/confirm, pharmacy selection, chat, lab upload, etc.) really mutate this local store and persist across reloads.

Demo accounts (password field on `/login` is prefilled for the patient):

| Role | Email | Password |
|------|-------|----------|
| Patient | mona.patient@example.com | Demo!onemed1 |
| Doctor | karim.doctor@example.com | Demo!onemedD1 |
| Lab staff | nadia.lab@example.com | Demo!onemedL1 |
| Pharmacy | pharmacy.desk@example.com | Demo!onemedP1 |
| Hospital admin | admin.hospital@example.com | Demo!onemedH1 |
| Admin | admin@onemed.example | Demo!onemedA1 |

To reset demo data: clear browser localStorage keys beginning with `onemed.` (or use DevTools → Application → Local Storage).

## Connecting the real backend

Create `frontend/.env.local`:

```ini
VITE_API_MODE=api
VITE_API_URL=/api
```

Then start the backend with Firebase credentials (see root README). `src/api/client.ts` implements both modes behind one interface; endpoints that are not yet implemented on the backend fall back to the demo store so the UI remains usable during incremental rollout.

## Routes

| Path | Screen |
|------|--------|
| `/` | Landing page (bilingual, features, CTA) |
| `/login`, `/register` | Login (+ MFA challenge) and 4-step registration with required emergency contact + OTP |
| `/emergency/:token` | Public no-login emergency page with privacy-filtered fields and first-aid chatbot |
| `/nfc/:token` | NFC/QR landing page (two options: patient dashboard / emergency info) |
| `/f/:token` | 24-hour prescription fulfillment (GPS-sorted pharmacies → WhatsApp deep link) |
| `/qr/:token` | Patient consent prompt for a doctor's 15-minute connection QR |
| `/app/patient/*` | Patient dashboard, timeline, analytics, prescriptions, consents, emergency QR config, messages, notifications, settings |
| `/app/doctor/*` | Doctor dashboard, patient search, record viewer (timeline/allergy banner/summary), extraction review, NFC/QR tools, messages, reports, settings |
| `/app/lab/*` | Lab upload + verification (confidence highlighting), upload history |
| `/app/pharmacy/*` | Prescription inbox, 6-step order status, patient chat, GPS/hours |
| `/app/hospital/*` | Institution overview, staff, API connections, de-identified analytics |
| `/app/admin/*` | Overview, staff, institutions, pharmacies, hash-chained audit, compliance reports, population health |

## Keyboard and quality-of-life controls

| Control | What it does |
|---------|--------------|
| Back button (top bar, public pages) | Goes back through in-app history; falls back to the current role's home when there is no prior route |
| `Ctrl`/`Cmd` + `K` | Opens the quick-navigation palette for the current role; type to filter, arrows + Enter to open |
| `/` | Focuses the global search field |
| `Esc` | Closes any dialog or the quick-navigation palette |
| Copy buttons | Copy the emergency QR URL or prescription fulfillment link to the clipboard |
| DEMO DATA MODE flag | Opens a confirmed reset of all local sample data |

Async screens show static layout-shaped skeletons while data loads. Navigation for the rail, palette and search comes from one shared role map (`src/components/nav.tsx`).

## Landing imagery

The hero and NFC feature tile use a branded CSS visual. Image generation was unavailable in this environment (`Invalid credential`), so no unrelated stock photography is shipped. To use your own licensed photos, add `public/images/landing-hero.png` and `public/images/nfc-wristband.png` and replace the two commented image slots in `src/pages/public.tsx` (`hero-visual` and `accent-cell`).

## Architecture

```
src/
  main.tsx            Router + providers + role guards
  i18n.ts             react-i18next AR/EN resources; setLang() flips RTL
  types.ts            Domain model (patients, records, prescriptions, etc.)
  data/demo.ts        Realistic seed data + localStorage persistence
  api/client.ts       API client: demo/local mode ↔ REST mode (env switch)
  auth/AuthContext.tsx Session state + login/register/OTP/MFA/logout
  components/         AppShell (role nav), shared UI (Card/Badge/Modal/Tabs/Toasts)
  pages/              public.tsx, patient.tsx, doctor.tsx, staff.tsx
  index.css           Design system (responsive, RTL-aware, print styles, WCAG focus)
```

## Quality notes

- TypeScript strict mode; `npm run build` type-checks before bundling.
- Role-based route guards; unauthorized roles redirect to `/app`.
- All user-facing strings are translated (AR/EN) with RTL layout switching; emergency chatbot uses Arabic/Egyptian-friendly phrasing and cites sources.
- Medical disclaimers shown with AI output; emergency chatbot always leads with "call 123", never diagnoses, and has a knowledge-gap fallback.
- PWA manifest included; offline caching of previously loaded records is planned for the next polish milestone.
- Frontend tests cover demo data integrity, emergency privacy flags, and bilingual dictionary.
