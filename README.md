# OneMed

**Unified Medical Data Platform & AI Diagnostic Assistant**

OneMed bridges fragmented healthcare data across Egyptian hospitals, laboratories,
and pharmacies. Hospitals and labs push patient data (test results, scans, full
history) into a centralized secure profile; authorized doctors retrieve a complete
patient history in under 5 seconds via NFC tap, QR scan, or National ID lookup.

> Graduation Project — Alexandria University, Faculty of Computers and Data Science
> (2025–2026)

---

## ✨ Features

- **Cross-institutional unified patient profile** — records aggregated from multiple
  hospitals and labs into one chronologically ordered history
- **Instant emergency access** — NFC tap / QR scan / National ID lookup for critical care
- **Emergency first-aid AI chatbot (RAG)** — bilingual Arabic/English, public via QR/NFC,
  grounded in verified guidelines with source citations
- **LLM prescription extraction** — OCR → structured JSON → doctor confirmation →
  24-hour fulfillment link → GPS pharmacy matching
- **5 portals** — Patient, Doctor, Lab/Hospital, Admin, Pharmacy
- **6-role RBAC** with MFA for medical staff
- **Tamper-evident audit trail** — SHA-256 hash-chained, append-only
- **Bilingual, offline-capable PWA**

---

## 🏗 Architecture

Three-tier:

Presentation   React (TypeScript, PWA) — 5 portals + 2 public pages
                     │  HTTPS / REST
Application    Node.js + Express + Firebase Cloud Functions
                     │  Firebase SDK
Data            Firestore (real-time + vector search) · Auth · Storage (PDF/DICOM) · FCM

### AI Feature 1 — Emergency First-Aid Chatbot
Query → Embed → Firestore Vector Search (cosine, top-5)
      → Prompt (system + chunks + query) → Gemini Flash → Response + citations
- Always leads with "Call 123 first." No diagnosis, no medication advice.
- 5-layer hallucination mitigation: RAG grounding · confidence scoring ·
  medical disclaimers · knowledge-gap detection · clinician-in-the-loop.
- Knowledge base: AHA CPR & First Aid 2024, IFRC First Aid 2024,
  WHO Basic Emergency Care, Red Cross BLS.

### AI Feature 2 — LLM Prescription Extraction
Upload → Tesseract.js (typed) + EasyOCR (handwritten Arabic)
       → Gemini Flash structured extraction → JSON
       → Doctor review & confirm → fulfillment link → GPS pharmacy match
- OCR accuracy: typed ~97%, handwritten Arabic 85–92%. Doctor confirms before any action.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (TypeScript, PWA) |
| Backend | Node.js + Express + Firebase Cloud Functions |
| Database | Firebase Firestore (real-time, encrypted, vector search) |
| Auth | Firebase Auth (phone OTP, MFA, JWT role claims) |
| LLM | Gemini Flash |
| Vector search | Firestore Vector Search |
| OCR | Tesseract.js + EasyOCR |
| NFC | Web NFC API (NTAG 424 DNA) |
| QR | qrcode |
| Push | Firebase Cloud Messaging |
| i18n | react-i18next (Arabic/English) |
| CI/CD | GitHub Actions |

---

## 🔐 Security & Compliance

- AES-256 at rest, TLS 1.3 in transit
- RBAC across 6 roles; MFA for all medical staff
- SHA-256 hash-chained audit logs (tamper-evident)
- Egyptian data centers — EDP Law compliance

---

## 👥 Team

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
