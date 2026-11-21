# OneMed – Frontend

React + Vite prototypes for the OneMed patient/doctor/admin surfaces. The pages
use mock/demo data and are not yet wired to the live backend API.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:3000. The backend also defaults to port 3000; if you
run both, change one of them (see the root [README](../README.md#getting-started)).

## Routes

| Path | Page | Source |
|------|------|--------|
| `/` | Redirects to `/prescription` | `src/main.jsx` |
| `/prescription` | Prescription extraction review | `src/App.jsx` |
| `/admin` | Administration dashboard | `src/AppAdmin.jsx` |
| `/pharmacy-order` | Partner pharmacy / WhatsApp order | `src/components/PharmacyOrderPage.jsx` |
| `/emergency` | No-login emergency medical info | `src/components/EmergencyPage.jsx` |

The bottom `PageSwitcher` nav links all four pages.

## Stack

- React 18
- Vite 5
- react-router-dom 7
- CSS Modules (no Tailwind)
- Inter + Courier Prime (Google Fonts)

## Scripts

```bash
npm run dev      # Vite dev server
npm run build    # outputs frontend/dist/
npm run preview  # serve the production build
```

`dist/` is committed as a prebuilt snapshot. A plain static server works, but
direct deep links (e.g. `/admin`) require an SPA fallback; use Vite for clean URLs.

## Structure

```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── dist/                         ← prebuilt static snapshot
└── src/
    ├── main.jsx                  ← routes + BrowserRouter
    ├── App.jsx / App.module.css  ← prescription review page
    ├── AppAdmin.jsx / AppAdmin.module.css
    ├── index.css                 ← design tokens (colors, fonts)
    ├── components/
    │   ├── PageSwitcher.jsx      ← bottom nav (4 pages)
    │   ├── Header.jsx            ← prescription page top bar
    │   ├── ImageViewer.jsx       ← source prescription pane
    │   ├── MedicineTable.jsx     ← editable medicine table
    │   ├── AdminHeader.jsx, SideNav.jsx, MetricsRow.jsx, StaffTable.jsx,
    │   │   ApiConnections.jsx, TopAppBar.jsx
    │   ├── PharmacyOrderPage.jsx
    │   └── EmergencyPage.jsx
    └── assets/
        ├── icons/                ← SVGs (incl. pharmacy/ and emergency/ sets)
        └── images/               ← prescription.png, avatars, background-map.png
```
