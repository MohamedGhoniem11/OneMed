# OneMed

**Unified Medical Data Platform & AI Diagnostic Assistant**

OneMed bridges fragmented healthcare data across Egyptian hospitals, laboratories,
and pharmacies. Hospitals and labs push patient data (test results, scans, full
history) into a centralized secure profile; authorized doctors retrieve a complete
patient history in under 5 seconds via NFC tap, QR scan, or National ID lookup.

> Graduation Project — Alexandria University, Faculty of Computers and Data Science
> (2025–2026)

> **Prototype status:** this repository is under active implementation. The
> credential-free API foundation, local persistence/auth adapters, the verified
> prescription OCR slice, and five static frontend pages are in place.
> Patient/lab/pharmacy/emergency/AI features are still being built milestone by
> milestone; see [Status](#status) and [Roadmap](#roadmap). Nothing listed as
> planned should be treated as implemented.

---

## Quick start (no credentials required)

Requires Node.js 20.19+ (Node 22 LTS recommended).

```bash
npm install
npm start
```

The API starts at `http://localhost:3000` in **local demo mode**:

- file-backed persistence at `data/local-db.json`;
- backend-issued 15-minute JWTs with scrypt-hashed local passwords;
- a development signing secret generated once at `data/.jwt-secret`.

`data/` is gitignored. This mode exists so the project runs on any clean machine
and in CI. It is **not** a production deployment mode: use Firebase (below) and
synthetic demo data only.

Health check:

```bash
curl http://localhost:3000/
# {"status":"ok","persistence":"local","authProvider":"local","time":"..."}
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at **http://localhost:5173**. The Vite dev server proxies `/api` to the
backend on port 3000. The five pages are still static prototypes and are not yet
wired to the API.

---

## Production mode (Firebase)

1. Create a Firebase project and enable **Firestore** and **Authentication**
   (Email/Password).
2. Download a service account key and save it as `serviceAccountKey.json` in the
   repository root (gitignored).
3. Copy `.env.example` to `.env` and set at least:

   ```ini
   PERSISTENCE=firestore
   AUTH_PROVIDER=firebase
   FIREBASE_API_KEY=<Firebase Web API key>
   CORS_ORIGINS=https://your-frontend.example
   ```

   `FIREBASE_API_KEY` is the **Web API key** (Project settings → General). It is
   required by the backend for password sign-in and custom-token exchange. It is
   not the service account key.
4. Restart with `npm start`.

If `PERSISTENCE`/`AUTH_PROVIDER` are omitted, OneMed selects Firebase
automatically when a service account file (or the matching emulator host) is
present, and local mode otherwise. If you add only the service account and not
`FIREBASE_API_KEY`, registration still succeeds but returns an explicit
`customToken` with `requiresClientExchange: true` instead of a session; the
client SDK must exchange it. No silent null tokens.

### Firebase emulator (optional)

Install Java, then set `FIRESTORE_EMULATOR_HOST` and/or
`FIREBASE_AUTH_EMULATOR_HOST`, plus `FIREBASE_PROJECT_ID`. The emulator path is
implemented but **has not been exercised in this environment** (no Java/Docker
available).

---

## Status

| Capability | State | Notes |
|-----------|-------|-------|
| Credential-free boot + local store | Implemented | real file persistence; atomic writes |
| Local auth (register/login, scrypt, JWT) | Implemented | 15-min access token; refresh/MFA in M1 |
| Firebase/Firestore adapters | Implemented | lazy init; requires credentials |
| Security baseline | Implemented | helmet, CORS allowlist, rate limits, sanitized 500s, request IDs |
| Prescription OCR + parsing (Tesseract.js) | Implemented | bilingual `ara+eng`; no LLM/key |
| Prescription persistence | Implemented | create / list / get by id |
| Role guards | Implemented | six canonical roles; admin management |
| Frontend prototypes (5 pages) | Implemented | static mock data; not wired to API |
| Automated tests + CI | Implemented | Vitest/Supertest, ESLint, GitHub Actions |
| Patient/lab/pharmacy portals | Planned | M1–M5 |
| Consent, audit hash chain, QR/NFC | Planned | M1–M4 |
| Emergency RAG chatbot / Gemini | Planned | M4 |
| Fulfillment link + GPS pharmacy match | Planned | M5 |
| Analytics, reports, bilingual PWA | Planned | M6–M7 |

---

## Architecture

```
Presentation   React 18 + Vite 8 (JavaScript/JSX, CSS Modules) — static prototypes
                      │  HTTPS / REST (Vite proxies /api in development)
Application    Node.js + Express 4 (ESM)
                      │  routes → controllers → services → ports
Ports          store:  local file store  |  Firestore
               auth:   local JWT + scrypt (demo/CI)  |  Firebase Auth
               OCR:    Tesseract.js (WASM, local)
Data            local data/local-db.json  |  Firestore
```

The store and identity-provider ports keep domain services independent of the
cloud vendor. Both implementations are real; local mode is an offline demo/CI
adapter, not mock data. Firebase remains the production target. Gemini and the
remaining AI services will follow the same port pattern.

### Prescription OCR (implemented)

```
Upload (multer, in-memory, image only, 5 MB)
  → Tesseract.js worker (default ara+eng, cached)
  → heuristic regex parser
  → { rawText, ocrConfidence, lang, items[], warnings[] }
  → doctor review in frontend
  → persistence via POST /api/prescriptions
```

- No LLM and no API key; extraction is deterministic and runs locally.
- `ocrConfidence` is Tesseract's word-level confidence, **not** field-level accuracy.
- Measured on clean synthetic typed images, each fixture run with its declared
  language:

  | Fixture | OCR language | Confidence | Minimum gate |
  |---------|--------------|------------|--------------|
  | English | `eng` | 95 | 90 |
  | Arabic | `ara` | 87 | 80 |
  | Bilingual | `ara+eng` | 93 | 90 |

  The Arabic-only score (87) is lower than the previous `ara+eng`-for-everything
  claim (91). It is above the approved **<80% manual-review threshold** (OQ4).
  Production defaults to `ara+eng`.
- Known limits: handwriting is unreliable; Arabic-Indic digits/units are not
  normalized; dose can fold into the medicine name in Arabic layouts. Every row
  is intended for doctor confirmation before use.

---

## API

Base path: `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/` | public | Health/mode check |
| POST | `/api/auth/register` | public | Register patient or doctor; returns session |
| POST | `/api/auth/login` | public | Email/password login |
| GET | `/api/users/me` | any signed-in user | Own profile |
| PATCH | `/api/users/me` | any signed-in user | Update `name`/`phone` |
| GET | `/api/users` | admin | List users (paginated) |
| GET/PATCH/DELETE | `/api/users/:id` | admin | Read/update/delete a user |
| PATCH | `/api/users/:id/role` | admin | Set any of the six roles |
| GET/PUT/PATCH | `/api/doctors/me` | doctor | Doctor profile |
| GET | `/api/doctors` | signed-in | List verified doctors |
| GET | `/api/doctors/:id` | signed-in | Doctor profile (license hidden unless owner/admin) |
| PATCH | `/api/doctors/:id/verify` | admin | Verify a doctor |
| POST | `/api/prescriptions/extract` | doctor | Multipart image → OCR + parsed items |
| POST | `/api/prescriptions` | doctor | Persist a reviewed prescription |
| GET | `/api/prescriptions` | doctor, admin | List with pagination |
| GET | `/api/prescriptions/:id` | doctor (owner), admin | Get one |

Register body:

```json
{
  "name": "Mona Ali",
  "email": "mona@example.com",
  "password": "secret123",
  "role": "patient",
  "phone": "01012345678"
}
```

Only `patient` and `doctor` may self-register; staff roles are assigned by an
admin. Six canonical roles: `patient`, `doctor`, `lab_staff`, `pharmacy`,
`hospital_admin`, `admin`.

**Extract response**

```json
{
  "rawText": "...",
  "ocrConfidence": 92,
  "lang": "ara+eng",
  "items": [
    { "name": "Amoxicillin", "dose": "500mg", "frequency": "1x3",
      "duration": "5 days", "notes": "...", "needsReview": false }
  ],
  "warnings": []
}
```

Errors are JSON: `{ "message": "...", "requestId": "..." }`. 5xx responses never
include internal details; use the request id to correlate with server logs.

---

## Testing

```bash
npm test                    # 34 unit + integration tests (local adapter)
npm run lint                # ESLint flat config
npm run test:ocr            # smoke test on a synthetic prescription
npm run test:ocr:accuracy   # English / Arabic-only / bilingual fixtures
node scripts/ocr-file.mjs <image-path> [lang]   # OCR an arbitrary image
```

The OCR accuracy harness now runs each fixture with its actual language code
(`eng`, `ara`, `ara+eng`) and prints the measured confidence. It passes 3/3 on
the synthetic typed fixtures; these numbers do not transfer to handwriting or
poor-quality scans.

CI (`.github/workflows/ci.yml`) runs lint, tests, the production dependency
audit, both OCR suites, and the frontend build on every push and pull request.

The production dependency tree has **0 reported vulnerabilities**
(`npm audit --omit=dev`). A moderate, dev-only advisory remains in
`nodemon → minimatch`; it is not shipped in production and has no compatible
fixed release yet.

---

## Environment variables

See `.env.example` for the complete annotated list.

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | `production` requires explicit `AUTH_JWT_SECRET` in local mode |
| `PORT` | `3000` | API port |
| `PERSISTENCE` | auto | `local` or `firestore` |
| `AUTH_PROVIDER` | auto | `local` or `firebase` |
| `LOCAL_DATA_DIR` | `data` | local store + generated dev secret |
| `AUTH_JWT_SECRET` | generated in dev | 32+ chars; required in production local mode |
| `AUTH_ACCESS_TTL_SECONDS` | `900` | access-token lifetime |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./serviceAccountKey.json` | service account JSON path |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | — | inline service account JSON (hosted deploys) |
| `FIREBASE_PROJECT_ID` | — | required with emulators |
| `FIREBASE_API_KEY` | — | Firebase Web API key for password sign-in/token exchange |
| `FIRESTORE_EMULATOR_HOST` | — | Firestore emulator |
| `FIREBASE_AUTH_EMULATOR_HOST` | — | Auth emulator |
| `CORS_ORIGINS` | localhost 5173/4173 | comma-separated allowlist |
| `RATE_LIMIT_*` | 300/20/30 | global/auth/OCR rate limits per 15 min |
| `JSON_BODY_LIMIT` | `1mb` | JSON body cap |
| `TESSERACT_LANG` | `ara+eng` | default OCR language |

---

## Project structure

```
OneMed-main/
├── src/
│   ├── app.js, server.js          # Express app + graceful boot/shutdown
│   ├── auth/                      # local IdP, Firebase IdP, JWT secret
│   ├── config/                    # validated env + lazy Firebase init
│   ├── constants/roles.js         # six canonical roles
│   ├── controllers/               # auth, user, doctor, prescription
│   ├── middleware/                # auth, roles, errors, request ids, rate limits, upload
│   ├── routes/                    # /api route groups
│   ├── schemas/                   # document/request schemas
│   ├── services/                  # domain logic, OCR, parser
│   ├── store/                     # persistence port: local + Firestore
│   └── utils/                     # schema validator, validators, http errors
├── scripts/                       # OCR CLIs/tests, admin bootstrap
├── tests/                         # Vitest unit + Supertest integration
├── frontend/                      # React + Vite prototypes (port 5173)
├── .env.example
├── .github/workflows/ci.yml
└── package.json
```

---

## Security & compliance

**Implemented now:** Firebase/local token verification; six-role guards; schema
validation; scrypt password hashing (local mode); 15-minute access tokens;
helmet security headers; explicit CORS allowlist; request rate limits; request
IDs; sanitized 5xx responses; upload MIME/size limits; prescription ownership
checks.

**Planned (later milestones):** refresh-token rotation and inactivity logout,
MFA for medical staff, AES-256 field encryption, TLS 1.3 termination, consent
enforcement, SHA-256 hash-chained append-only audit log, QR/NFC emergency tokens
with rate limiting, deletion/portability pipeline, Egyptian EDP Law mapping. The
Arabic/Egyptian data-localization limitation (no Firebase Egypt region) will be
documented in the final submission, not hidden.

---

## Roadmap (next milestones)

- **M1** — full data model, six-role RBAC, OTP + staff MFA, audit chain, seed data
- **M2** — multi-format ingestion (PDF/CSV/JSON/FHIR/DICOM metadata), lab portal
- **M3** — patient search, record timeline, consent QR, NFC landing
- **M4** — patient portal, emergency QR/public page, first-aid RAG chatbot
- **M5** — doctor confirmation gate, 24h fulfillment link, GPS pharmacy match, WhatsApp, messaging
- **M6** — clinical summary, analytics, reports, population metrics
- **M7** — Arabic/English RTL, PWA, landing page, accessibility
- **M8** — hardening, measured performance, UAT, traceability/demo/limitations docs

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
