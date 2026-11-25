# OneMed — Requirements Checklist (Phase 1)

Source of truth: `Document/OneMed-Document.pdf` (93 pages, Alexandria University — Faculty of Computers and Data Science, graduation project).
Every requirement below is traced to a document section/page. Figures were reviewed as images (ERD p33, DFD p36–37, sequence p39 & p46, class diagram p40, state diagram p42, architecture p44–45, UI mockups p69–79, Gantt p84).

Status legend (filled in during Phase 2 audit): `DONE` / `PARTIAL` / `BROKEN` / `MISSING` / `UNVERIFIED`.
Scope note: the document mixes MVP scope (§3.6: two LLM features) with broader functional requirements (§3.1.3) and "future features" (§6.2). Conflicts are listed as Open Questions (OQ) at the bottom, not resolved by guessing.

---

## A. Functional Requirements

### Accounts, roles, authentication
- **R1** — Hospitals and labs shall register institutional accounts; each receives a unique institutional ID + credentials; medical license verified against MoH records before data-submission privileges. (FR1 p29; §3.4.1 p48; UC-09 p38)
- **R2** — Registration: multi-step wizard; sign-up/login via National ID or phone number with OTP verification; role selection (Patient, Doctor, Lab Staff, Admin); **emergency contact required at signup for all users** (name, phone, relationship). (UC-01 p38; Fig 13 p70; §2.1.5 p20; Fig 17 p74)
- **R3** — Authentication: Firebase Auth (phone OTP + email/password); **MFA mandatory for all medical staff** (doctors, lab technicians, admins); JWT with custom role claims, 15-minute expiry, refresh-token rotation; automatic logout after inactivity (configurable per role). (UC-02 p38; §3.4.2 p49; §4.2.3 p66)
- **R4** — RBAC enforced at API middleware for every request: role + institutional affiliation + patient consent checked before any data is returned. Roles per §3.4.2 table: Patient (own records only; modify consent/emergency settings; delete own data), Doctor (consented patients; upload clinical notes; modify own notes), Lab Staff (linked patients; upload results/imaging; modify own uploads), System Admin (de-identified data, global settings, institution accounts), Hospital Admin (own hospital metrics/config/staff), Pharmacy Staff (prescription inbox only; order status). (FR11 p29; §3.4.2 p49; role-set conflict → OQ6)
- **R5** — Profile & settings: personal information, emergency contact details, language preference, notification settings, per-institution consent toggles, emergency QR page configuration, QR & NFC badge link. (Fig 17 p74; §3.4.3 p50)

### Data ingestion & unified records
- **R6** — Authorized staff shall upload patient data: lab results, images, prescriptions, notes; each upload linked to a patient via National ID or phone lookup. (FR2 p29; UC-03 p38; §3.4.1 p48)
- **R7** — Multi-format ingestion: PDF (with OCR), image files JPG/PNG, CSV/JSON batch import, manual entry; FHIR JSON parsing; DICOM metadata extraction with image stored in Storage. (FR3 p29; §3.3.2 p45; Algorithm 1 p88; Fig 18 p75 also mentions HL7 ≤50MB → OQ13)
- **R8** — Upload validation pipeline: file-integrity/checksum verification, format validation, malware scan, integrity checks; invalid/corrupt files rejected. (§3.2.6 p43; Fig 8 p45; NFR reliability p30)
- **R9** — Record lifecycle states: Uploaded → Validating → OCR Processing (PDF/image) → Manual Review (if OCR confidence below threshold) → Normalizing → Encrypted (AES-256) → Stored (linked to patient) → Accessible → Archived (retention) / Deleted (patient request). Structured CSV/JSON skips OCR. (Fig 6 p42–43; Algorithm 1 p88; threshold conflict 80% vs 90% → OQ4)
- **R10** — OCR: Tesseract.js + EasyOCR, Arabic + English; confidence scored per extraction; low-confidence fields flagged for human verification with editable fields. (§4.2.6 p67; Fig 18 p75; EasyOCR/Python conflict → OQ10)
- **R11** — Data normalization engine: OCR text → LLM structuring of medical fields (test names, values, units, reference ranges); FHIR R4 normalization into standardized internal format. (§4.3.2 p68; §3.4.1 p48)
- **R12** — Unified patient profiles linked by National ID or phone; cross-institutional aggregation merged chronologically into one timeline. (FR4 p29; §3.3.3 p46)
- **R13** — Data conflict resolution: latest-timestamp precedence for general data; discrepancies in critical fields (allergies, blood type) raise a conflict flag in UI requiring attending-doctor manual review before acceptance. (§3.4.1 p49)
- **R14** — Hospital connection protocol: web portal upload, CSV/JSON batch import, PDF/image upload; API configuration, field mapping, connection test, activation; connection monitoring. (UC-13 p38; §1.4.2 p13; DFD 6.0 p37; Fig 20 p77)

### Clinical access & AI assistance
- **R15** — Authorized doctors search patients by name, National ID, phone, NFC tap, or QR scan and view complete cross-institutional history; retrieval under 5 seconds. (FR5 p29; UC-05 p38; §1.3 p12)
- **R16** — Doctor access permitted only if: (a) patient consented to doctor's institution, (b) doctor treating patient at registered facility, or (c) emergency override. (§3.4.1 p48)
- **R17** — Emergency override (ER physician): enter written justification → time-limited access to critical info (allergies, blood type) → fully logged. (UC-11 p38; §3.4.1 p48)
- **R18** — AI-generated clinical summaries (allergies, medications, abnormal results) to help doctors navigate patient data; generated on demand from patient profile. (FR6 p29; UC-06 p38; §3.7.3 p62)
- **R19** — RAG-enhanced AI medical chatbot for doctors, grounded in Egyptian medical knowledge, automatically scoped to the open patient's data. (FR7 p29; UC-07 p38; Algorithm 2 p88; MVP-scope conflict → OQ5)
- **R20** — AI confidence levels displayed: High / Moderate / Low / Knowledge Gap; confidence scoring per Algorithm 3 (semantic overlap 0.4, specific values/references 0.2, no contradictions 0.2, model confidence 0.2). (FR8 p29; Algorithm 3 p89)
- **R21** — Medical disclaimer displayed with/before each AI response; explicit acknowledgment when a query exceeds the knowledge base ("knowledge gap"). (FR9–10 p29; §3.6.4 p60)
- **R22** — AI responsibility boundaries: "Report Issue" button on every AI response; all AI interactions logged; ToS states AI output is informational only; doctor retains clinical liability. (§3.6.4 p61)

### Consent, audit, compliance
- **R23** — Consent management: granular per-institution opt-in/opt-out toggles; explicit, revocable; consent records store type, text, consented/revoked timestamps; enforced by API middleware. (UC-08 p38; §2.2.5 p23; Table 8 p52)
- **R24** — QR doctor–patient connection flow: doctor generates connection QR with **15-minute TTL** (countdown in UI) → patient scans → consent prompt → approval → access granted + audit logged. (§1.4.2 p13; §3.3.3 p46; Sprint 6 p85)
- **R25** — All access logged for audit: user ID, patient ID, action, resource type/ID, timestamp, IP address, user agent; append-only **SHA-256 hash-chained** audit trail, verifiable at any time. (FR12 p29; §4.3.1 p68; Table 8 p52; storage-engine conflict → OQ3)
- **R26** — Admin audit & compliance: filterable access log (user/patient/institution/action), consent history, hash-chain verification status, deletion requests status, security events (failed logins, overrides, unusual patterns), EDP checklist; export. (UC-10 p38; §3.7.4 p63)
- **R27** — Patient data rights: download all own data (portability); request complete deletion fulfilled within 30 days with cascade. (§2.2.5 p23; Table 8 p52; §3.4.1 p48)
- **R28** — Data governance: patient data never sold; consent-first sharing; data minimization per role; hospitals see only their own patients unless inter-institutional consent granted. (§2.2.5 p23; §3.4.2 p50)

### Emergency system (QR / NFC)
- **R29** — Emergency QR generation on patient opt-in: cryptographically random UUID v4 token; URL `https://onemed.eg/emergency/{token}`; downloadable SVG/PNG for wearables; token→patient mapping with no patient ID exposed in URL. (FR16 p29; UC-14 p38; §3.4.4 p51)
- **R30** — Public emergency page, **no login**: shows only patient-approved fields — name, blood type (large/prominent), allergies (red highlight), chronic conditions, current medications, emergency contacts + primary physician with one-tap call buttons; mobile-friendly, lightweight, **<3s load on 3G**; rate-limited; every scan logged (timestamp, IP, approx. location) and patient notified. (FR17 p29; UC-15 p38; §3.4.4 p51; Fig 21 p78; Algorithm 4 p89–90)
- **R31** — Granular patient privacy controls: per-field toggles (blood type, allergies, conditions, medications, contacts) + AI-chatbot enable switch; full records stay behind auth. (FR19 p29; UC-16 p38; Algorithm 4 p90)
- **R32** — Emergency first-aid AI chatbot on public page (no auth): RAG via Firestore Vector Search (top-5 chunks) over curated first-aid guideline library; tailored to patient's approved conditions; simple non-medical language; numbered one-sentence steps; source citations (e.g. "AHA 2024 §4.2"); **always starts with "Call emergency services (123)"**; never diagnoses/recommends medications; refuses off-topic/diagnostic queries; fallback text when context insufficient; mandatory disclaimer banner; session rate-limited; bilingual AR/EN incl. Egyptian dialect input; requires internet. (FR18 p29; §3.6.1 p57–58; Fig 22 p79; number conflict 123 vs 122 → OQ8)
- **R33** — Guideline library: paragraph-level chunks from AHA CPR & First Aid 2024, IFRC First Aid 2024, WHO Basic Emergency Care, Red Cross BLS; embedded at deployment with LLM embedding model; stored with vector index; fields: text, source, section, url, language, embedding, tags, version; first-aid only (no diagnostic/drug/treatment content). (§3.6.1 p58; ERD p35; content sourcing → OQ15)
- **R34** — NFC patient identification: free NTAG 424 DNA wristband/card at account creation; Web NFC API (Chrome/Android) reads encrypted token; Node.js validates token; NFC landing page served; QR is the fallback for iOS/unsupported browsers. (§1.4.2 p13; §3.3.3 p46; §6.5 p86)
- **R35** — NFC landing page: standalone lightweight page, no auth required for emergency info; navigation options: Patient Dashboard (login required) and Emergency Info (open access). (§3.4.3 p50; "three options" in §1.4.2/§2.1.4 → OQ7)

### Pharmacy middleman & prescriptions
- **R36** — LLM prescription extraction (Feature 5): doctor uploads prescription image/PDF from within patient profile → file saved to Firebase Storage → OCR (Tesseract.js typed; EasyOCR handwritten Arabic) → LLM extracts JSON array of `{name, dosage, frequency, duration, instructions}` (null for unclear fields; JSON-only output) → review screen: original image left, editable extracted table right, overall confidence badge, add/edit entries → **doctor confirmation mandatory** → confirmed extraction stored + **24-hour fulfillment link** generated. Extraction disclaimer shown; no drug-database validation in MVP. (§3.6.2 p58–59; Fig 19 p76; Fig 4 p39; §3.6.4 p61)
- **R37** — Pharmacy fulfillment (Feature 4): link shared with patient (SMS/app) → patient opens link → nearby pharmacies **sorted by GPS distance** (Geolocation API) → patient selects pharmacy → **pre-filled WhatsApp deep link** (drug name, dosage, frequency, duration) → redirect to chat → real pharmacy staff receives order and fulfills it (abstract: "six-step fulfillment flow"). (§1.4.2 p13; §3.4.1 p48–49; Fig 4 steps 7–14 p39; step enumeration → OQ12)
- **R38** — Pharmacy portal: prescription orders inbox, real-time chat with patients, order fulfillment status updates, GPS coordinates + operating hours management; pharmacies listed with GPS, hours, stock categories; subscription + per-order commission model. (§3.4.3 p50; §3.4.1 p48; Table 3 p83)
- **R39** — In-app messaging: conversations and messages (patient ↔ doctor, patient ↔ pharmacy), real-time; message types; notification on new messages. (§3.2.5 class diagram p40–41; §3.4.3 p50; §6.2.1 p81)

### Portals & dashboards
- **R40** — Patient portal: unified chronological record timeline (color-coded: lab=blue, prescription=green, imaging=purple, notes=gray; filters by type/institution/date range), analytics dashboard, consent management, emergency QR configuration, notification center, profile settings, pharmacy access; patients **cannot modify** clinical records. (§3.4.3 p50; §3.4.1 p48; Fig 15 p72)
- **R41** — Doctor portal: recent-patients quick-access cards, prominent search bar (name/NID/phone), AI assistant shortcut, pending lab-results notifications, quick-stats panel, NFC scanner shortcut, QR generator (15-min TTL countdown), prescription management with LLM extraction, in-app messaging, allergy warning banners on patient profile. (§3.4.3 p50; Fig 14 p71; Sprint 6 p85)
- **R42** — Lab staff portal: drag-and-drop PDF/DICOM upload, patient auto-link via National ID (or manual selection), OCR verification UI with editable fields and confidence highlighting (amber = unverified), batch CSV/JSON import, manual entry tab, upload history + status tracking. (§3.4.3 p50; Fig 18 p75)
- **R43** — Admin portal: user management & role assignment, pharmacy partnership approvals, institution management (register hospitals/labs, verify license), compliance dashboard, data-contribution metrics, audit monitoring, system configuration. (§3.4.3 p50; Fig 20 p77)
- **R44** — Hospital admin portal: institution overview, staff management, compliance status indicators, data contribution metrics, **credit balance & premium feature access**, FHIR/API connection status. (Fig 20 p77; §3.4.1 p48)
- **R45** — Patient data analytics dashboard visualizations: lab-value line charts with normal-range bands; BP dual-line with threshold zones; medication Gantt-style timeline; visit-frequency stacked bars by institution; condition summary color-coded cards (red=critical/orange=monitor/green=stable); cross-lab test comparison grouped bars; composite health-score gauge; imaging timeline with modality icons. (FR20 p29; UC-17 p38; §3.5.2 p54)
- **R46** — Dashboard indicators tracked: HbA1c/fasting glucose, blood pressure, LDL/total cholesterol, creatinine/eGFR, CBC (WBC/RBC/Hb), TSH/T3/T4, BMI, medication adherence (fill-rate % + timeline). (§3.5.3 p55)
- **R47** — Patient view vs doctor view: patient = plain language ("Blood Sugar Level"), green/yellow/red status, plain-language trend sentences, motivational elements, educational links, reference ranges hidden by default (tap to reveal); doctor = clinical terminology, full reference ranges, statistical trend analysis (slope/SD/rate of change), abnormal flagging, cross-institution side-by-side comparison, AI clinical-summary panel, one-click chart/data export, drill-down to source record. (§3.5.4 p56)
- **R48** — De-identified population health analytics for hospitals/MoH: disease prevalence by region/age/gender, lab trend distributions, seasonal patterns, resource utilization, anonymized institutional benchmarks. (FR14 p29; §3.7.5 p64)
- **R49** — Credit/incentive system rewarding data contribution (credits awarded on verified uploads; balance visible to institutions). (FR15 p29; Algorithm 1 p88; Fig 20 p77; rules unspecified → OQ17)

### Notifications & reports
- **R50** — Push notifications (FCM): lab results ready (patient + primary physician), chat messages, prescription updates; notification center in portals; patient notification preferences. (UC-12 p38; §4.2.3 p66; §6.2.1 p81; Fig 17 p74; SMS conflict → OQ9)
- **R51** — Patient Medical History Report: demographics, full chronological history, labs with ranges/abnormal flags, medications, imaging summaries, diagnoses, optional AI summary; export **PDF + FHIR JSON Bundle**; generated by authorized doctor or the patient. (§3.7.1 p61)
- **R52** — Lab Results Report: lab identity/accreditation, patient ID, test/value/unit/range/interpretation, collection & result timestamps, supervising technician; export **PDF + FHIR DiagnosticReport**. (§3.7.2 p62)
- **R53** — Clinical Summary Report: AI summary, condition statuses, medications + interaction warnings, recent abnormal labs with trend direction, allergy severity, upcoming tests, confidence level, disclaimer; export **PDF + clipboard**. (§3.7.3 p62–63; interaction warnings vs future-feature conflict → OQ5)
- **R54** — Audit & Compliance Report: filterable access log, consent history, hash verification status, deletion requests, security events, EDP checklist pass/fail; export **PDF + CSV**. (§3.7.4 p63)
- **R55** — Population Health Analytics Report: de-identified aggregates, trends, seasonal patterns, utilization, benchmarks; export **PDF + CSV/JSON**. (§3.7.5 p64)
- **R56** — Report generation architecture: server-side; authorization verified per report type/scope; data aggregated; AI content via RAG validated; rendered to format; encrypted temporary storage **auto-deleted after 24h**; generation event audit-logged. (§3.7.6 p64; "FastAPI/ReportLab" conflict → OQ2)

### Public pages
- **R57** — Public landing page: centered logo, medical-themed background, bilingual tagline "Your Complete Medical History, One Platform.", three feature intro sections (unified records / AI assistant / emergency QR), login & sign-up entry. (Fig 12 p69; Ch 5 p69)

## B. Non-Functional Requirements

- **R58** — Performance: patient profile retrieval <5s for 95% of queries; AI chatbot response <8s (retrieval+generation); lab upload processing incl. OCR <30s/document; 1,000 concurrent API requests with <10% degradation; emergency QR page <3s on 3G. (§3.1.4 p30)
- **R59** — Reliability: 99.5% uptime for core services during business hours; all uploads verified with checksums; automated daily backups with 30-day retention. (§3.1.4 p30)
- **R60** — Security: AES-256 encryption at rest (records, images, personal data); TLS 1.3 in transit; MFA for all medical staff; all access logged; rate limiting (emergency page + API); security headers/CORS/CSP; annual third-party security audit & penetration testing (aspirational for academic demo → OQ18). (§3.1.4 p30; §3.4.2 p49–50; Fig 8 p45)
- **R61** — Scalability targets: 10,000+ concurrent users with horizontal scaling; 100,000 uploads/day peak; up to 10M patient profiles (aspirational → OQ18). (§3.1.4 p30)
- **R62** — Usability: bilingual AR/EN for non-technical staff; chatbot accepts Arabic and Egyptian dialect; max 3 clicks to core features; WCAG 2.1 accessibility; responsive desktop/tablet/mobile. (§3.1.4 p30; §4.2.1 p65–66)
- **R63** — Compliance: full EDP (Law 151 — year conflict → OQ1) + MoH adherence; Table 8 mapping: explicit consent, right to access, right to deletion (30 days), data minimization, data localization (Egyptian data centers → OQ11), breach notification within 72h, hash-chained audit, encryption, purpose limitation, cross-border transfer restriction. (§3.1.4 p30; §3.4.5 p52)
- **R64** — PWA: installable; offline caching of previously loaded patient records; lightweight cached emergency profile page for low connectivity (chatbot still needs internet). (§4.2.1 p65–66; §1.4.4 p15)
- **R65** — Session security: short-lived JWT (15 min) + refresh rotation; inactivity auto-logout per role. (§3.4.2 p49)

## C. Required Tech Stack & Constraints

- **R66** — Frontend: React + TypeScript, PWA-capable; single app with role-based routing; react-i18next for AR(RTL)/EN(LTR); Recharts or Chart.js for charts. (§4.1 Table 5 p65; §4.2.1 p65; §4.3.3 p68; §3.4.3 p50)
- **R67** — Backend: Node.js + Express; Firebase Admin SDK for JWT validation & custom role claims; REST API for all portal features. (§4.1 p65; §4.2.2 p66; §6.2.2 p82)
- **R68** — Data tier: Firebase **Firestore as sole structured database** (profiles, records, consents, prescriptions, audit logs, guideline chunks); Firebase Authentication; Firebase Storage (encrypted uploaded files); Firebase Cloud Messaging; Firebase Cloud Functions for LLM API calls + Firestore Vector Search. (Abstract p2; §3.3.1 p44; §4.2.3 p66)
- **R69** — Firestore Vector Search: cosine similarity, top-5 guideline chunks; embeddings produced by LLM API embedding model at deployment; NOT used for patient record retrieval. (§4.2.5 p67)
- **R70** — LLM: Gemini Flash (or equivalent) cloud API for prescription extraction (JSON mode) and emergency chatbot generation; no local GPU. (§4.2.4 p67)
- **R71** — OCR: Tesseract.js + EasyOCR (Arabic/English). (§4.2.6 p67; Python-sidecar conflict → OQ10)
- **R72** — QR: `qrcode` npm server-side generation (connection + emergency). NFC: Web NFC API (NTAG 424 DNA). Geolocation API for pharmacy GPS sorting. (§4.2.6 p67)
- **R73** — CI/CD: GitHub Actions. (§4.1 Table 5 p65; Sprint 4 p85)

## D. Database / Data Model & API Requirements

- **R74** — Entities & fields per ERD (§3.2.1.2 p34–35, Fig 1 p33): USER (user_id, email UQ, password_hash, role, pharmacy_id FK, status, timestamps); PATIENT (patient_id, user_id FK, names, national_id UQ, dob, gender, blood_group, phone, address, emergency_contact_name/phone/relation, allergies, chronic_conditions, timestamps); DOCTOR (doctor_id, user_id FK, names, specialization, license_number UQ, institution_name, phone); PHARMACY (pharmacy_id, name, address, whatsapp_phone, gps_lat/lng, rating, hours, status, monthly_fee_egp); PATIENT_CONSENT (consent_id, patient_id FK, granted_to_user_id FK, consent_type, consent_text, consented, consented_at, revoked_at); EMERGENCY_QR (qr_id, patient_id FK, qr_token UQ, nfc_uid, nfc_activated_at, nfc_wristband_issued, emergency_contact_name/phone, medical_summary, rate_limit_count/window); PRESCRIPTION (prescription_id, doctor_id FK, patient_id FK, report_url, extraction_status, fulfillment_link_token, whatsapp_redirect_url, notes, link_expires_at); PRESCRIPTION_MEDICINE (medicine_id, prescription_id FK, medicine_name, dosage, frequency, duration, instructions, confidence); ACCESS_LOG (access_log_id, patient_id FK, user_id FK, action, resource_type, resource_id, ip_address, user_agent); GUIDELINE_CHUNK (chunk_id, text, source, section, url, language, embedding vector, tags array, version).
- **R75** — Additional entities per UML class diagram (§3.2.5 p40–41): CONVERSATION (id, patient_id, other_user_id) and MESSAGE (id, conversation_id, sender_id, content, type, sent_at); PRESCRIPTION.selected_pharmacy_id + status enum; EMERGENCY_QR.scan_count/last_scanned_at.
- **R76** — Cardinalities (§3.2.1.3 p35): User 1:1 Patient; User 1:1 Doctor; Pharmacy 1:N User(staff); Patient 1:N Consent; User 1:N Consent(granted); Patient 1:1 Emergency_QR; Patient 1:N Prescription; Doctor 1:N Prescription; Prescription 1:N Medicine; Patient/User 1:N Access_Log; Pharmacy 1:N Prescription(fulfilled); Conversation 1:N Message.
- **R77** — Backend services (§3.3.2 p45; §6.2.2 p82): auth/JWT validation; data normalization; NFC token service (generate/sign/validate); QR service (15-min TTL connection QR, rate-limited emergency QR); pharmacy GPS matching; prescription fulfillment; emergency public API (no auth middleware, rate-limited, optimized); FCM notification service; audit & compliance logging.
- **R78** — Schema style: relational ERD adapted to Firestore documents ("JSON-like flexibility where necessary", vector fields). (§3.2.1.1 p33)

## E. UI/UX Requirements

- **R79** — Screens per Chapter 5 mockups: landing (Fig 12); 4-step registration wizard with required emergency-contact step (Fig 13); doctor dashboard with NFC Scanner / QR Generator shortcuts, recent patients table, pending prescriptions panel (Fig 14); patient record viewer with clinical timeline, type filters, critical-allergy banner, active medications, latest vitals, emergency contacts, print record (Fig 15); patient analytics with KPI cards, BP trend chart, lipid panel, medication Gantt (Fig 16); profile & settings with consents + notification prefs + QR/NFC badge config (Fig 17); lab ingestion with target-patient context, upload/batch/manual tabs, drag-drop zone, verification table with per-field confidence and amber unverified highlights (Fig 18); extraction review split view with confidence badge, editable medicine table, add medication, Confirm & Generate Link (Fig 19); hospital admin with stats, staff management, API connections (Fig 20); mobile-first emergency public page (Fig 21); bystander chatbot with patient context chips, quick actions (CPR Steps / Seizure Response), disclaimer banner, critical-priority numbered steps, large text (Fig 22).
- **R80** — Visual language: clean medical theme; navy/teal/green palette per mockups; record-type color coding (lab blue, Rx green, imaging purple, notes gray); status colors green=normal / yellow=monitor / red=abnormal; blood type large & prominent; allergies red; one-tap call buttons; bilingual text with language toggle everywhere. (Ch 5 p69–79; §3.5.2 p54)
- **R81** — Shared design system/component library across portals; role-based routing from JWT role claim; same API layer; backend enforces RBAC regardless of portal. (§3.4.3 p50)

## F. Deliverables & Evaluation

- **R82** — Working application satisfying the document's requirements, demonstrable end-to-end with realistic seed/demo data (per user brief; document Sprint 9–10 UAT & demo preparation p85).
- **R83** — Testing & validation: integration testing, compliance audit (consent, hash-chain verification, deletion pipeline), UAT across roles, LLM accuracy validation (OCR confidence thresholds, chatbot grounding), performance optimization (sub-5s retrieval, sub-3s emergency page), security hardening (MFA enforcement audit, API rate limiting). (§6.4 Sprints 9–10 p85)
- **R84** — Automated tests for critical logic and flows; README with setup/run/test instructions + architecture overview + API docs; traceability table (requirement → implementation → test); demo script; known-limitations list. (User brief FINAL DELIVERABLE)
- **R85** — No hardcoded secrets; environment-variable configuration with `.env.example`; input validation & clear user-facing error messages; secure handling of patient/health data. (User brief QUALITY STANDARDS; document security architecture p49–50)

---

## Open Questions (ambiguities / contradictions — NOT resolved by guessing)

- **OQ1 — EDP law year:** Abstract & most sections say "Law No. 151 of **2022**"; NFRs, risk matrix, references and Arabic summary say "EDP **2020** / Law 151 of 2020" (the real Egyptian law is 151/2020). Which citation should the app/compliance docs use?
- **OQ2 — Report backend contradiction:** §3.7.6 (p64) says reports are generated by a "**FastAPI** backend" using ReportLab/WeasyPrint/fhir.resources (Python), while Ch 4 explicitly rejects FastAPI in favor of Node.js+Express. Assumed leftover from an earlier draft — confirm Node-side report generation (e.g., PDFKit + hand-built FHIR R4 JSON) is acceptable.
- **OQ3 — Audit store contradiction:** §4.3.1 (p68) places the hash-chained audit trail "in **PostgreSQL**", but the abstract declares Firestore the *sole* database and Table 8 specifies a Firestore append-only collection. Confirm Firestore hash-chain implementation.
- **OQ4 — OCR review threshold:** State diagram (p43) & Algorithm 1 use **<80%** confidence → manual review; §3.3.2 (p45) & Fig 8 use a **90%** split. Which threshold governs?
- **OQ5 — Doctor-facing AI scope:** FR6–FR10, UC-06/07 and user stories require AI clinical summaries, a patient-scoped RAG doctor chatbot, and "AI drug interaction checks"; but §3.6 (p57) says MVP includes only two LLM features and §6.2 (p82) lists "AI Chatbot for Doctors" and "Drug Interaction Validation" as **future** work. §3.7.3 also asks for interaction warnings in the clinical summary. What exactly is in scope for submission: (a) clinical summary only, (b) summary + patient-scoped doctor chatbot, (c) also rule-based interaction warnings?
- **OQ6 — Role set:** FR11 lists 4 roles; feature matrix says "5 Roles"; §3.4.2 RBAC table lists 6 (adds Hospital Admin); ERD USER.role enum = patient/doctor/pharmacist/admin. Confirm final role list (proposal: patient, doctor, lab_staff, pharmacy, hospital_admin, admin).
- **OQ7 — NFC landing options:** §1.4.2/§2.1.4 say "three navigation options"; §3.4.3 lists two (Dashboard w/ login, Emergency Info open). What is the third?
- **OQ8 — Emergency number:** body text & prompts say **123** (Egyptian ambulance); Fig 22 mockup shows "Emergency **122**" (police). Use 123 everywhere?
- **OQ9 — SMS vs push:** §4.2.3 says FCM, "No SMS required"; §3.4.1 says notify "via push notification **and SMS**"; Fig 4 step 7 shares link "via SMS / app". Confirm FCM + in-app notification center only (no SMS provider available).
- **OQ10 — EasyOCR is Python** while the stack is Node-only. Accept Tesseract.js (ara+eng) with manual-review fallback as the OCR engine, or add a Python sidecar service?
- **OQ11 — Data localization:** "Egyptian data centers" is required (Table 8), but Firebase has no Egypt region. Accept as a documented deployment limitation for the academic demo?
- **OQ12 — "Six-step fulfillment flow"** (abstract) is never enumerated. Proposal for pharmacy order statuses: received → verifying → preparing → ready → handed over → completed (+ cancelled). Approve or supply the intended six steps.
- **OQ13 — Ingestion formats:** Fig 18 mentions "HL7 formats up to 50MB"; FR3 lists PDF/JPG/PNG/CSV/JSON/manual; Algorithm 1 handles FHIR_JSON and DICOM. Confirm scope = PDF, JPG/PNG, CSV/JSON, FHIR JSON, DICOM metadata, manual entry (HL7 v2 out of scope), 50MB cap.
- **OQ14 — OTP/MFA mechanics:** Firebase phone OTP & SMS MFA require billing/SMS setup. With no external credentials guaranteed, what is acceptable for the demo: email-link/OTP + TOTP-style MFA for staff, phone OTP simulated in dev mode? (Also affects R3/R2.)
- **OQ15 — Guideline library content:** AHA/IFRC/WHO/Red Cross texts are copyrighted. Is an original, medically-conservative paraphrased first-aid chunk library with proper source citations acceptable for the demo KB (curated, versioned, first-aid only)?
- **OQ16 — External credentials:** Will you provide a Firebase project (service account) and a Gemini API key, or should the plan include Firestore emulator + a pluggable LLM adapter (real Gemini when key present, deterministic offline fallback otherwise) so everything is verifiable on a clean machine?
- **OQ17 — Unspecified formulas:** composite "health score" (§3.5.2) and credit/incentive earn rules (FR15) have no formulas. Approve simple documented heuristics (e.g., score from fraction of indicators in range; credits per verified upload)?
- **OQ18 — Aspirational NFRs:** 1,000-concurrent/10k-user load targets, 99.5% uptime, annual third-party pen test, Egyptian data-center hosting cannot be truly verified in an academic demo. Accept a measured subset (local load smoke test, checksum/backup scripts, rate-limit tests) plus a documented limitations list?

## Internal inconsistencies noted (for the record)

1. EDP 2020 vs 2022 (OQ1). 2. FastAPI/Python report libs vs Node stack (OQ2). 3. PostgreSQL vs Firestore-only (OQ3). 4. OCR 80% vs 90% (OQ4). 5. Doctor AI in FRs vs "future work" (OQ5). 6. Role counts 4/5/6 (OQ6). 7. NFC landing 2 vs 3 options (OQ7). 8. Emergency 123 vs 122 (OQ8). 9. SMS vs FCM-only (OQ9). 10. EasyOCR (Python) in Node stack (OQ10). 11. Egypt localization vs Firebase regions (OQ11). 12. DFD Level-1 process names differ slightly from §3.2.2.2 text (e.g., "4.0 Process NFC Scan" in figure vs "4.0 AI Medical Assistant" in text) — figure appears older; text + §3.6 govern. 13. Fig 13 registration shows role selection incl. Admin while UC-01 implies open signup — admin/institution accounts presumably provisioned/approved (R1, R43); confirm self-signup allowed roles (patient/doctor/lab/pharmacy) with admin approval for institutions.

---

## Decisions & Amendments (user-approved 2026-11-23)

These decisions override the raw document text where they conflict. Original R-text above is kept as the document-faithful record.

| OQ | Decision |
|----|----------|
| OQ2 | **Reject FastAPI.** Reports generated Node-side (PDFKit + hand-built FHIR R4 JSON + CSV). |
| OQ3 | **Firestore** append-only, SHA-256 hash-chained audit trail (no PostgreSQL). |
| OQ4 | Manual-review threshold = **OCR confidence < 80%**. |
| OQ5 | **Revised:** clinical summary + a real patient-scoped doctor RAG assistant are in submission scope. Drug-interaction validation remains **future work** (licensed drug DB + clinical liability), consistent with §3.6/§6.2. |
| OQ6 | **Six roles:** patient, doctor, lab_staff, pharmacy, hospital_admin, admin. |
| OQ7 | NFC landing page = **two** options (Patient Dashboard w/ login, Emergency Info open). |
| OQ8 | Emergency number = **123** everywhere. |
| OQ9 | **No SMS.** FCM (when creds present) + in-app notification center only. |
| OQ10 | **Tesseract.js only** (ara+eng). No EasyOCR/Python sidecar. |
| OQ11 | Egyptian data-center localization accepted as a **documented deployment limitation**. |
| OQ12 | Six-step fulfillment statuses approved: **received → verifying → preparing → ready → handed over → completed** (+ cancelled). |
| OQ13 | Ingestion set confirmed: **PDF, JPG/PNG, CSV/JSON, FHIR JSON, DICOM metadata, manual entry; 50MB cap; no HL7 v2**. |
| OQ14 | Approved: dev-delivered OTP + server-enforced **TOTP MFA for medical staff**; Firebase phone MFA upgrade path when real project exists. |
| OQ15 | Approved: **original paraphrased first-aid KB chunks with source citations** (AHA/IFRC/WHO/Red Cross), curated + versioned. |
| OQ16 | Real Firebase/Gemini keys **provided later**; build env-driven plug-in ports now so keys drop in without code changes. |
| OQ17 | Approved: simple documented heuristics for health score and contribution credits. |
| OQ1 | **DECIDED:** cite "Egypt Data Protection Law No. 151 of **2020**" (the actual law; matches NFRs/references/Arabic summary) with a note that the document also says 2022. |
| OQ18 | **DECIDED:** aspirational NFRs (1k/10k concurrency, 99.5% uptime, annual pen test, Egypt hosting) handled as a **measured subset + documented limitations list**. |

### Requirement amendments resulting from the decisions
- **R4** → role set is exactly the six roles above; RBAC matrix per §3.4.2 (hospital_admin scoped to own institution).
- **R7** → format set per OQ13; 50MB cap applies to all uploads.
- **R9** → manual review when OCR confidence **< 80%**; ≥80% auto-normalizes.
- **R10 / R71** → Tesseract.js only; handwritten-Arab accuracy limitation documented; manual verification UI is the mitigation.
- **R19** → **DEFERRED (future work)**. Not built, not tested, not claimed.
- **R20–R22** → apply to the clinical summary (the only in-scope generative AI besides emergency chatbot + extraction).
- **R32 / R35** → 123; two landing options.
- **R37** → fulfillment status machine per OQ12; link TTL 24h; WhatsApp via `wa.me` deep link.
- **R50** → no SMS anywhere; notification center + FCM adapter.
- **R53** → "potential interaction warnings" element **deferred** with OQ5; remaining contents in scope.
- **R25 / R56 / R63** → Firestore chain, Node report pipeline, localization limitation as decided.
- **R3 / R2** → OTP challenge with dev delivery (console/dev inbox, clearly labeled) + TOTP MFA for staff; production delivery plugs in via env.
- **R45 / R49** → health score = documented heuristic (fraction of tracked indicators in reference range, weighted); credits = fixed award per verified upload, visible to institution; formulas documented in README.


---

## Phase 4 FE milestone status update (2026-11-24)

The front-end now implements the UI layer for: R2 (registration wizard/OTP/MFA UI), R5, R13/62 (AR/EN + RTL), R15/R16 UI (doctor search + consent-gated viewer), R19–R22 UI (summary/chat with confidence + disclaimers in demo), R23 (consent toggles), R24 (consent QR page), R29–R32 (QR generation + public emergency page + first-aid chatbot UI), R34–R35 (NFC landing), R36 (extraction review + confirm), R37 (GPS pharmacy + WhatsApp), R38–R44 (all portal UIs), R45–R47 (analytics charts + patient/doctor views), R48 (population view), R50 (notification center UI), R51–R56 report UI (PDF/FHIR/CSV export buttons), R57 (landing), R64 (PWA manifest), R79–R81 (all documented screens, shared design system, role-based routing). Verified: rontend/npm test 3/3, 
pm run build strict TS PASS, all 30+ routes browser-verified with 0 console errors, interactions verified against localStorage. Backend APIs for most of these remain M2–M8 work; FE runs fully in labeled demo mode and switches to REST via VITE_API_MODE=api.


---

## Phase 4 M2 status update (2026-11-24)

Backend records/ingestion API implemented and verified:

- R6/R74: /api/records/manual, /api/records/ingest, patient linking and record schema extended with prescription/visit types, lifecycle, checksum and provenance fields.
- R7: PDF (PDF.js text layer), image (Tesseract.js ara+eng), CSV/TSV, JSON/FHIR R4, DICOM metadata and manual entry. HL7 v2 remains out of scope per OQ13; 50MB cap via UPLOAD_MAX_MB.
- R8: SHA-256 checksum, format/magic validation, size limits, invalid/corrupt rejection; originals encrypted with AES-256-GCM (UPLOAD_ENCRYPTION_KEY or generated dev key) and never stored plaintext; encrypted download verifies checksum. Malware scanning remains a documented gap.
- R9: lifecycle states enforced (alidating → ocr_processing/
ormalizing → manual_review → encrypted → stored → ccessible), with <80% review gate per OQ4 and review endpoint.
- R10/R11/R71: Tesseract.js OCR with confidence scoring, normalization into canonical lab rows with units and reference ranges, abnormal flags from ranges only; no EasyOCR/LLM normalization yet (OQ5/OQ10 decisions).
- R4/R16/R28/R60: capability RBAC, consent/institution access checks, audited ingestion/review/download events.
- R77/R85: no hardcoded secrets, env-driven key, .env.example updated.

Verification: 
pm test 72/72 (14 files), 
pm run lint 0 errors, live boot on port 3011 with health 200 and guarded /api/records 401, encrypted-on-disk assertion, CSV/PDF/manual/review/RBAC integration tests. Remaining M2 gaps: archived/deleted lifecycle transitions and Firebase Storage adapter for encrypted originals in cloud mode.


---

## Phase 4 M3 status update (2026-11-24)

Backend + front-end wiring implemented and verified:

- R15/R16: GET /api/patients/search?q= with consent-filtered results; doctor dashboard and patient lists now use it in API mode.
- R17/UC-11: POST /api/patients/:id/emergency-override requires a written justification (min 10 chars), bounded TTL, role guard, and writes an audit entry; the doctor record viewer confirms and displays returned critical fields.
- R24: POST /api/connect/qr (doctor only) creates a signed 15-minute token; public GET /api/connect/:token reveals only the clinician/scope; POST /api/connect/:token/accept (patient only) creates a scoped, expiring consent and audits it. Raw tokens are returned once; only SHA-256 hashes are stored.
- R34/R35: POST /api/nfc issues a signed NTAG-linked token, public GET /api/nfc/:token resolves it and records scans, GET /api/nfc/mine exposes status without the raw token, and revocation is supported.
- R4/R25/R28: capability RBAC and hash-chained audit events on QR creation, consent acceptance, NFC issue/scan and emergency override.
- R6/R7/R10/R11/R42: front-end lab portal now uses POST /api/records/ingest / POST /api/records/manual in API mode; records lists, analytics and reports use /api/records.

Verification: backend 81/81 tests (16 files), frontend 6/6, both builds/lints clean, audit 0. API-mode browser test against seeded backend: real patient names in doctor dashboard, QR generated by API, public resolve showed the real clinician name, patient consent granted and audited, zero console errors. Demo mode remains fully functional.


---

## Phase 4 M4 status update (2026-11-25)

Real Firebase project and Gemini key configured via gitignored .env (project onemed-8fdcc; model gemini-2.5-flash, embeddings gemini-embedding-001). Firestore and Gemini access verified live. Firebase Auth exchange still uses local mode until a Firebase Web API key is supplied; AUTH_PROVIDER=firebase remains a config switch.

Implemented and verified:

- R29/R30: signed emergency QR tokens (POST /api/emergency/qr), public profile endpoint GET /api/emergency/:token exposing only patient-approved fields, scan counting and hash-chained audit logging, emergency rate limiting, and a static patient privacy endpoint PATCH /api/emergency/privacy.
- R31/R32: patient-configurable field privacy; RAG chatbot POST /api/emergency/:token/chat with 123-first responses, numbered steps, source citations, confidence labels, disclaimer, knowledge-gap fallback and no diagnosis/medication advice.
- R33: curated first-aid guideline library (src/data/guidelines.js, OQ15 paraphrases) embedded into Firestore by 
pm run seed:guidelines using Gemini embeddings; Firestore vector search with cosine fallback when no vector index is deployed.
- R63: LLM port with deterministic offline provider when no key is present, so demo/CI remains functional.
- R4/R25/R28: RBAC and audit events for QR creation, privacy updates, page views and chats.

Verification: backend 87/87 tests (17 files), frontend 6/6, strict TS build, lint 0 errors, audit 0. Live API-mode browser run against real Firestore/Gemini: patient login, privacy-filtered public page, QR generation, seeded first-aid chunks, real Gemini answer with 3 citations and Moderate confidence, zero console errors. Missing composite Firestore indexes are handled by an in-memory sort fallback; recommended indexes are in irestore.indexes.json.


---

## Phase 4 M5 status update (2026-11-25)

Implemented and verified:

- R36: Gemini JSON prescription extraction (POST /api/prescriptions/extract) with local parser fallback; prescriptions are created pending and a fulfillment link is generated only after explicit doctor confirmation (POST /api/prescriptions/:id/confirm).
- R37: 24-hour signed fulfillment tokens (FULFILLMENT_TTL_SECONDS, default 86400), public GPS-sorted pharmacy page (GET /api/fulfillment/:token), pharmacy selection (POST /api/fulfillment/:token/select) generating a WhatsApp deep link with structured medicine data.
- R38: pharmacy portal APIs for orders, six-step status transitions, cancellation, profile/GPS/hours updates, and nearby pharmacy lookup.
- R39: conversations and messages for patient-doctor and patient-pharmacy channels with strict participant checks.
- R50: in-app notification center with notifications on lab results, prescriptions, messages and order changes (FCM device push still future work).
- R4/R25: RBAC and audit entries for extraction, confirmation, link open, pharmacy selection, status changes and order cancellation.

Verification: backend 92/92 tests (18 files), FE 6/6, strict build, lint 0 errors, audit 0. Live API-mode browser run against real Firestore: doctor prescription list, patient fulfillment page with two GPS-sorted pharmacies, pharmacy order inbox with status transitions, and zero console errors. Real Gemini key is configured; extraction falls back to the deterministic parser when no key is present.


---

## Phase 4 M6 status update (2026-11-25)

Implemented and verified:

- R18/R20/R21: on-demand grounded clinical summaries at GET /api/analytics/clinical/:patientId/summary with explicit confidence, source records and a mandatory not-medical-advice disclaimer; doctor access is consent-gated, patient self/admin allowed. Gemini is used when configured; a labelled deterministic summary is the safe fallback.
- R45/R47: patient analytics API at GET /api/analytics/patient/:patientId with lab trends, BP series, lipid panel, medication list, abnormal counts and a documented health-score heuristic (share of numeric indicators inside reference range). FE patient analytics now renders these real values.
- R48: de-identified population analytics at GET /api/analytics/population with city/condition distributions, lab averages and visits by month; restricted to hospital_admin/admin; no names, national IDs or phone numbers.
- R51-R55: five reports generated from stored data - Patient Medical History (PDF/FHIR Bundle/CSV), Lab Results (PDF/FHIR DiagnosticReport/CSV), Clinical Summary (PDF/text/clipboard), Audit and Compliance (PDF/CSV with hash-chain verification), Population Health (PDF/CSV/JSON). Every generation is audit logged.
- R49: credit/incentive ledger - 10 credits per verified (non-review) upload, balance visible to institutions; documented heuristic per OQ17.
- R25/R22: all report generations and summary requests are recorded in the append-only hash chain; AI output keeps the disclaimer and a report-issue boundary.
- Security: AES-256-GCM encrypt/decrypt helpers added for original uploads; FHIR/PDF/CSV emitters are dependency-free and escape untrusted text.

Verification: backend 99/99 tests (19 files), FE 6/6, strict TS build, lint 0 errors, audit 0. Live API-mode browser run against real Firestore confirmed patient analytics with real values, doctor report preview, hospital population view and 0 console errors.
