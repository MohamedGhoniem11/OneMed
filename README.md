# OneMed

**Unified Medical Data Platform & AI Diagnostic Assistant**

OneMed bridges fragmented healthcare data across Egyptian hospitals, laboratories,
and pharmacies. Hospitals and labs push patient data (test results, scans, full
history) into a centralized secure profile; authorized doctors retrieve a complete
patient history in under 5 seconds via NFC tap, QR scan, or National ID lookup.

> Graduation Project — Alexandria University, Faculty of Computers and Data Science
> (2025–2026)

> **Prototype status:** the prescription OCR slice and four frontend prototypes are
> implemented. Platform-wide features listed under [Roadmap](#roadmap) are designed
> but not yet implemented. See [Status](#status) for the current breakdown.

---

## Status

| Capability | State | Notes |
|-----------|-------|-------|
| Prescription OCR + parsing (local WASM, bilingual) | Implemented | Tesseract.js, no LLM/key required |
| Prescription persistence in Firestore | Implemented | create / list / get by id |
| Role-guarded REST API | Implemented | Firebase Auth + `doctor` / `admin` guards |
| Frontend prototypes (4 pages) | Implemented | mock/demo data, not wired to live API |
| OCR smoke + accuracy tests | Implemented | 4 synthetic typed fixtures |
| Emergency first-aid RAG chatbot | Planned | — |
| LLM structured extraction / Gemini | Planned | current parser is deterministic heuristics |
| EasyOCR handwritten Arabic | Planned | — |
| NFC / QR / National ID lookup | Planned | — |
| 24h fulfillment link + GPS pharmacy match | Planned | — |
| 5 portals, 6-role RBAC, MFA, audit chain | Planned | route guards exist; rest is planned |
| Bilingual PWA, offline cache, FCM | Planned | — |

---

## Implemented features

- **Prescription OCR extraction** — image in, structured medicine rows out. Runs
  locally with Tesseract.js (WASM), with no LLM or API key; language data downloads
  once and is then cached on disk. Default language is `ara+eng`, overridable per
  request or with `TESSERACT_LANG`. A deterministic parser produces `name`, `dose`,
  `frequency`, `duration`, `notes`, and a `needsReview` flag plus warnings.
- **Doctor review UI** — editable medicine table, zoom/rotate source viewer,
  "needs review" indicator, and confirm/generate-link controls (prototype).
- **Emergency info page** — no-login medical summary (allergies, conditions,
  medications, contacts) with an "Ask Emergency First-Aid AI" entry point (prototype).
- **Pharmacy ordering and Admin dashboards** — UI prototypes only.

---

## Architecture

Three-tier:

```
Presentation   React 18 + Vite 5 (JavaScript/JSX, CSS Modules) — 4 prototype pages
                      │  HTTPS / REST
Application    Node.js + Express 4 (ESM) — /api routes, Firebase Auth middleware
                      │  firebase-admin SDK
Data           Firestore — prescriptions, users, doctors, pharmacies
```

### AI Feature 2 — Prescription OCR (implemented)

```
Upload (multer, in-memory, image only, 5 MB)
  → Tesseract.js worker (default ara+eng, cached)
  → heuristic regex parser
  → { rawText, ocrConfidence, lang, items[], warnings[] }
  → doctor review in frontend
  → Firestore via POST /api/prescriptions
```

- **No LLM and no API key** required; extraction is deterministic. Tesseract.js
  runs locally as WASM after a one-time download/cache of the language data.
- `ocrConfidence` is Tesseract's word-level confidence, **not** field-level accuracy.
- Measured on clean, synthetic, typed images only:

  | Fixture | Score |
  |---------|-------|
  | English | 95 |
  | Arabic | 91 |
  | Bilingual | 93 |

- Known limits: handwriting is unreliable; Arabic-Indic digits/units are not
  normalized; dose can fold into the medicine name in some Arabic layouts. Every
  row is intended for doctor confirmation before use.

### Roadmap

**AI Feature 1 — Emergency first-aid chatbot (planned)**
Query → Embed → Firestore Vector Search (cosine, top-5) → Prompt (system + chunks
+ query) → Gemini Flash → Response + citations. Always leads with "Call 123 first."
No diagnosis, no medication advice. Planned 5-layer hallucination mitigation:
RAG grounding · confidence scoring · medical disclaimers · knowledge-gap detection
· clinician-in-the-loop. Planned knowledge base: AHA CPR & First Aid 2024, IFRC
First Aid 2024, WHO Basic Emergency Care, Red Cross BLS.

**Prescription pipeline (planned extension)**
Add EasyOCR for handwritten Arabic, then Gemini Flash structured extraction, a
24-hour fulfillment link, and GPS pharmacy matching.

**Platform (planned)**
NFC tap / QR / National ID lookup, 5 portals, 6-role RBAC with MFA, SHA-256
hash-chained audit logs, bilingual offline PWA, PDF/DICOM storage, FCM push.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 (JavaScript/JSX), CSS Modules |
| Backend | Node.js + Express 4 (ESM) |
| Database / Auth | Firebase Firestore + Firebase Auth via `firebase-admin` |
| OCR | Tesseract.js 7 (`ara`, `eng`, or `ara+eng`) |
| Upload | multer 2 (in-memory, images only, 5 MB cap) |
| Tests | Plain Node scripts (no test framework) |
| Planned | Gemini Flash, EasyOCR, Firestore Vector Search, Web NFC, FCM, react-i18next, PWA |

---

## Getting Started

### Prerequisites

- Node.js 18+ (20 LTS recommended)
- A Firebase service account key at `./serviceAccountKey.json`, or set
  `GOOGLE_APPLICATION_CREDENTIALS` to its path. Without this, `npm start` exits
  on boot; OCR test scripts do not need it.

On this machine Node is installed at `C:\Program Files\nodejs`. If `node` is not
found in a new shell:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

### Backend

```bash
npm install
npm start          # or: npm run dev  (nodemon)
```

Health check: `GET http://localhost:3000/` → `{"status":"ok"}`. Override with
`PORT` — in PowerShell: `$env:PORT="3001"; npm start`.

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Both servers default to port 3000. If you run them together, change one: set
`$env:PORT` for the backend, or set `server.port` in `frontend/vite.config.js`.

`frontend/dist` is a prebuilt snapshot. It can be served with any static server,
but direct deep links (e.g. `/admin`) need an SPA fallback; use the Vite dev
server for clean URLs.

---

## API

Base path: `/api`. All `/prescriptions` routes require a Firebase ID token and
the indicated role.

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/` | public | Health check |
| POST | `/api/prescriptions/extract` | doctor | multipart field `image`; optional `lang` (`ara+eng` default) |
| POST | `/api/prescriptions` | doctor | Persist a reviewed prescription |
| GET | `/api/prescriptions` | doctor, admin | List, with `limit`, `patientId`, `startAfter` |
| GET | `/api/prescriptions/:id` | doctor, admin | Get one |

Additional route groups: `/api/auth`, `/api/users`, `/api/doctors`.

**Extract response**

```json
{
  "rawText": "...",
  "ocrConfidence": 92,
  "lang": "ara+eng",
  "items": [
    { "name": "Amoxicillin", "dose": "500mg", "frequency": "1-0-1 (BID)",
      "duration": "5 Days", "notes": "", "needsReview": false }
  ],
  "warnings": []
}
```

---

## Testing

```bash
npm run test:ocr            # smoke test on a synthetic typed prescription
npm run test:ocr:accuracy   # English / Arabic / bilingual accuracy harness
node scripts/ocr-file.mjs <image-path> [lang]   # OCR an arbitrary image
```

The accuracy harness passes 3/3 with scores 95, 91, and 93 on synthetic typed
fixtures. These numbers do not transfer to real handwriting or poor-quality scans.

---

## Project Structure

```
OneMed/
├── src/
│   ├── app.js, server.js          # Express app + boot
│   ├── config/firebase.js         # firebase-admin init
│   ├── controllers/               # auth, user, doctor, prescription
│   ├── middleware/                # auth, roles, upload, errors
│   ├── routes/                    # /api route groups
│   ├── schemas/                   # Firestore document schemas
│   └── services/                  # ocr, parser, persistence, domain logic
├── scripts/
│   ├── ocr-smoke.mjs, ocr-accuracy.mjs, ocr-file.mjs
│   └── fixtures/                  # synthetic test images
├── frontend/                      # React + Vite prototypes (4 pages)
│   └── dist/                      # prebuilt static snapshot
└── serviceAccountKey.json         # required for backend boot (not committed)
```

---

## Security & Compliance

**Implemented:** Firebase Auth verification and role checks on protected routes;
input validation; in-memory upload with image-only and size limits; prescription
ownership checks on read.

**Planned:** AES-256 at rest, TLS 1.3 in transit, MFA for medical staff,
SHA-256 hash-chained append-only audit logs, Egyptian data centers / EDP Law
compliance.

---

## Team

Alexandria University — 11-member team. See the report for full task allocation.

| Member | Role |
|--------|------|
| Mohamed Amgad Aly | AI & Backend |
| Hassan Ahmed Mohammed | Backend |
| Ahmed Adel Elsayed | Cyber Security |
| Seif Saad Abdulmagied | Dashboard |
| Saif Eldein Ashraf | Dashboard & Reporting |
| Mahmoud Safwat | Frontend & Backend |
| Abdallah Hamed Kheder | Frontend & Database |
| Seif Abdelazem Ahmed | Business Analysis |
| Ziad Mustafa Eid | Frontend |
| Mohamed Ahmed Mohamed | Frontend & Reporting |
| Mina Mounir Youssef | Frontend & Backend |
