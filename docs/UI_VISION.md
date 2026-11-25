# OneMed — Concept UI Analysis & Design Direction

Examined: all 12 images in `UI/` (Picture1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14), 2026-11-24.
Source of truth remains `Document/OneMed-Document.pdf`; `docs/DECISIONS.md` resolves contradictions. This document is an **analysis and proposal** — no application code changed in this step.

## 1. Inventory: what each concept shows

| Image | Screen | PDF equivalent |
|-------|--------|----------------|
| Picture1 | Landing page: hero, dashboard preview card, "Integrated Healthcare Infrastructure" 3 feature cards, "How It Works" 3-step workflow, footer | Fig 12 (p69) |
| Picture3 | Registration step 3/4 — Emergency Contact (Arabic name field, phone +20, relationship, Back/Continue) | Fig 13 (p70) |
| Picture4 | Doctor dashboard: patient search, red **Emergency** button, navy **New Consultation**, recent-patients table, Pending panel, quick tiles NFC Scanner / QR Generator, "System Online" | Fig 14 (p71) |
| Picture5 | Patient record viewer: photo header with ID badge, age/gender, blood type, weight/height; Clinical Timeline with type filters; allergy banner; Active Medications; Latest Vitals; Emergency Contacts; "End of recent history" | Fig 15 (p72) |
| Picture6 | Patient analytics: top tabs Overview/Analytics/Reports; KPI cards (BMI, HbA1c, eGFR, CRP alert) with micro-bars; BP dual-line chart with threshold band; **Lipid Panel** with colored bars; medication Gantt timeline | Fig 16 (p73) |
| Picture7 | Profile & Settings: personal info + Medical ID/NPI, **per-institution consent toggles**, required emergency contact, notification preferences, **QR & NFC Badge Link** — all on one page | Fig 17 (p74) |
| Picture8 | Lab Data Ingestion: patient context, File Upload / Batch Import / Manual Entry tabs, drag-drop (PDF/JPG/PNG/HL7 ≤50MB), file "Processing Complete", Data Verification table with amber low-confidence fields, Confirm & Link | Fig 18 (p75) |
| Picture9 | Prescription Extraction Review: split source image / editable medicine table, zoom/rotate controls, High Confidence badge, Add Medication, Confirm & Generate Link | Fig 19 (p76) |
| Picture10 | Administration: 4 metric cards, Staff Management table with departments/status/pagination, **API Connections** panel with connected/warning states | Fig 20 (p77) |
| Picture11 | NFC landing: "Tap your NFC tag to continue", two action cards — Patient Dashboard (login required) and Emergency Info (open access), lock icons | §3.4.3 (p50) — two options per OQ7 |
| Picture13 | Public emergency page: red no-login banner, patient identity + large blood type, critical allergies (red), conditions, medications, contacts with one-tap CALL, bottom AI CTA | Fig 21 (p78) |
| Picture14 | Bystander chatbot: patient context chips (Diabetes/Asthma/Blood O+/Penicillin), quick-action chips (CPR Steps, Seizure Response), disclaimer banner, critical-priority numbered steps with call-first box | Fig 22 (p79) |

Note: Picture2 and Picture12 are absent from the folder (numbering skips). No other files exist.

## 2. The vision I read in these images

This is not a "generic dashboard" set. It has a distinct, consistent point of view:

1. **Information-dense but calm.** Every screen shows the *whole* clinical picture at a glance — patient header + timeline + sidebar panels on one view; KPI cards + two charts + medication timeline on one analytics view. White cards on a very light blue-grey canvas, thin borders, generous internal padding, minimal decoration.
2. **Navy sidebar = system frame; teal/green = clinical action; red = danger/emergency.** The palette is deliberately medical: deep navy `#002657`-ish for the persistent rail, teal `#006A61` for primary actions and "connected/active", green for normal/verified, amber for "needs review", red reserved for allergies, critical values, and the emergency entry point. Status meaning is carried by *color + pill shape*, consistently.
3. **Two-tier navigation.** A slim icon+label sidebar for the portal, plus a top bar holding global search, notifications (with red unread dot), settings, and the user's identity/role. Secondary view tabs (Overview / Analytics / Reports; Direct Care / Referrals / Lab Results) live under the top bar — they switch *context within a portal*, not route to another portal.
4. **Quick actions are first-class.** Doctor dashboard deliberately surfaces NFC Scanner and QR Generator as large tiles next to the patient table. Emergency is a red, always-visible button. This reflects the document's "≤3 clicks to core features" requirement.
5. **Every clinical value carries provenance and confidence.** Lab rows show value, unit, reference range; OCR fields show per-field confidence percentages with amber highlighting below threshold; extracted medicines show an overall confidence badge. The user is expected to *verify*, not trust.
6. **Consent, privacy and device linking are part of the main workflow**, not buried: per-institution toggles on the settings page, a required emergency-contact block, and a QR/NFC badge config card.
7. **Emergency is a separate, mobile-first, no-auth track.** Red banner, very large type, one-tap CALL buttons, a single bottom CTA. The NFC page is intentionally minimal with lock icons explaining which option needs login. The chatbot gives *instructions*, never diagnosis, with source citations and a persistent disclaimer.
8. **Admin is operational, not decorative:** real staff tables with departments and roles, connection health with warning states, export/new-user actions, uptime and sync-error metrics.

## 3. Inconsistencies in the concepts — resolved using the PDF + your decisions

I will not copy these literally. Where the concepts disagree with each other, the PDF or your decisions win:

- **122 vs 123:** Picture14 shows "Emergency 122" button and "call (122)" in the step, while body text and OQ8 decision say **123**. → Use **123** everywhere (Egyptian ambulance). I'll keep the prominent red emergency button but label it 123.
- **"Three navigation options" vs two:** Picture11 correctly shows **two** options, matching your OQ7 decision and §3.4.3. → Two options, with clear lock annotations.
- **"HL7 formats" in Picture8 vs OQ13:** you confirmed PDF/JPG/PNG/CSV/JSON/FHIR/DICOM, HL7 v2 **out of scope**, 50MB cap. → Upload copy will say "PDF, JPG, PNG, CSV/JSON, FHIR, DICOM — up to 50MB."
- **Concept mock data uses US/European names/phones** (Dr. Youssef, Carlos Rodriguez, +1 numbers, "MediCare Plus"). PDF and seed data are Egyptian. → Keep Egyptian institutions, names, +20 phone format, Arabic medical terms.
- **Concept mixes full medical-record access with "schedule & availability only" toggles** — matches FR23 granularity; keep, but use the ERD scope vocabulary (`records`, `prescriptions`, `schedule`).
- **Picture14 "122" and the generic smiling avatar photos** are decorative; I'll keep the information architecture (chips → disclaimer → numbered steps) but use our verified patients and citations.

## 4. Gap analysis: concept → current front-end

| # | Concept element (image) | Current state in `frontend/src` | Needed |
|---|-------------------------|----------------------------------|--------|
| G1 | Landing "How It Works" 3-step workflow + footer links (Picture1) | `pages/public.tsx` Landing has hero + 3 feature cards only | Add a compact "How It Works" row (registration → encounter → fulfillment) and a real footer (Privacy, Terms, Support) |
| G2 | Doctor dashboard red **Emergency** button + global search + notification dot + "System Online" (`Picture4`) | `pages/doctor.tsx` has search + NFC/QR tiles, but no red emergency shortcut; `AppShell.tsx` bell has no unread state | Add emergency shortcut (→ public emergency demo page), unread bell indicator, "System Online" chip; recent-patient statuses should show Waiting/Discharged/Critical/In-progress semantics |
| G3 | Patient header with photo, ID badge, age/gender, blood, weight/height, "End of recent history" (`Picture5`) | `pages/doctor.tsx` PatientViewer header is text-only; no height/weight; no history footer | Add identity strip (initials avatar + ID pill + demographics + blood + weight/height) and a "showing last 6 months" footer |
| G4 | Analytics top tabs + **Lipid Panel** colored bars + metric micro-bars (`Picture6`) | `pages/patient.tsx` PatientAnalytics has KPI cards and BP/HbA1c charts and medication table, but no Overview/Analytics/Reports tabs and no Lipid Panel | Add view tabs and a Lipid Panel card (Total/LDL/HDL/Triglycerides with threshold-colored bars); add trend arrows/micro-bars to KPI cards |
| G5 | Settings consolidates personal info, **per-institution consents**, emergency contact, notification prefs, QR/NFC link (`Picture7`) | `pages/patient.tsx` splits these: `PatientSettings` (personal/contact) + `PatientConsents` + `PatientEmergencyConfig` | Keep separate routes for depth, but add cross-links and surface a condensed "consent + notification + badge" summary on the settings page so the concept's single-view mental model holds |
| G6 | Lab: **Batch Import** and **Manual Entry** tab content, "No patient selected" state, "Processing Complete" file chip (`Picture8`) | `pages/staff.tsx` LabPortal renders the same verification UI for all tabs; no batch/manual forms; no file status chip | Add real batch-import form (paste CSV/JSON) and manual-entry form; empty-state prompt; processing-complete chip |
| G7 | Extraction review: **zoom in / zoom out / rotate** controls on source image (`Picture9`) | `pages/doctor.tsx` DoctorPrescriptions has upload + image display but no zoom/rotate | Add viewer controls (CSS transform) over the source image |
| G8 | Admin **API Connections** panel with connected/warning states (`Picture10`) | `pages/staff.tsx` connections exist only in HospitalAdmin; AdminOverview has audit feed + health cards | Add an API Connections card to the admin overview with connected/warning states and "Add connection" |
| G9 | Chatbot **patient context chips** (conditions/allergies/blood) beside quick actions (`Picture14`) | `pages/public.tsx` chatbot modal has disclaimer + quick prompts + replies, but no patient context chip strip | Add a compact patient-context chip row at the top of the chatbot modal (only approved fields, per R31) |
| G10 | Consistent status vocabulary: Waiting / Discharged / Critical / In progress; amber "Unverified" (`Picture4`, `Picture8`) | Mixed: some "CONSENTED", some "received", some "accessible" | Define one status-token set in `ui.tsx` `StatusBadge` and use clinical labels in doctor/lab/pharmacy views |
| G11 | "OneMed Healthcare" product name in staff headers vs "OneMed" elsewhere | `AppShell` uses OneMed; staff pages use plain titles | Unify brand: "OneMed" with a small "Healthcare Platform" descriptor, not two product names |
| G12 | Tight, consistent 8px spacing scale and shared card/pill/chip components across all concepts | `index.css` has tokens but several pages use ad-hoc inline styles | Promote recurring patterns (identity strip, stat card, verification row, chip) into `components/ui.tsx`; reduce inline styles |

## 5. Refined design direction (not a copy)

Keep the concepts' **information architecture, density, and status semantics**; replace their inconsistencies with one system:

- **Tokens:** navy `#002657` rail, teal `#006A61` primary, green `#0A7A50` normal, amber `#996100` review, red `#B72F2F` critical/emergency; one 8px spacing scale; 12px card radius; Inter (EN) / Cairo (AR).
- **Frame:** persistent role rail + top bar (global search, bell with unread dot, language toggle, identity). Secondary tabs only where they switch *view within a portal*.
- **Clinical canvas:** white cards, thin `#E2E9F2` borders, section headers with a single action on the right, tables with unit/range columns always visible.
- **Verification-first:** every extracted/OCR value shows confidence; sub-threshold values get amber background + explicit "Unverified" pill; confirmation is always a deliberate teal action.
- **Identity strip component:** avatar + name + ID pill + demographics + blood type + allergies summary — reused in doctor patient viewer and patient header.
- **Status pills:** one vocabulary (`waiting`, `in_progress`, `discharged`, `critical`, `needs_review`, `verified`, `connected`, `warning`) with fixed tones; no ad-hoc colors.
- **Emergency track:** mobile-first, red banner, huge blood type, ONE primary CTA, no auth; chatbot chips → disclaimer → cited numbered steps; always 123.
- **Bilingual by construction:** every label through `t()`, RTL-aware logical properties, Arabic numerals where the concept uses them only in AR mode.

## 6. What I propose to add (sequenced)

1. **Design-system pass** (`index.css`, `components/ui.tsx`): shared IdentityStrip, StatusPill vocabulary, MetricCard, VerificationRow, Chip; unify brand name; unread bell. (G10–G12, G2)
2. **Landing + footer** (`pages/public.tsx`): How It Works + Privacy/Terms/Support. (G1)
3. **Doctor dashboard + patient viewer** (`pages/doctor.tsx`): emergency shortcut, system-online chip, rich identity strip, status semantics, history footer. (G2, G3)
4. **Analytics** (`pages/patient.tsx`): view tabs, lipid panel, KPI micro-bars/trends. (G4)
5. **Settings consolidation + lab tabs + viewer controls + admin connections + chatbot chips** (`pages/patient.tsx`, `staff.tsx`, `doctor.tsx`, `public.tsx`). (G5–G9)
6. **Verification:** rebuild, `npm test` FE + BE, browser pass over every changed route in EN and AR, screenshots of the main flows.

## 7. Open question

The concepts are close to the PDF figures but add several real details (Lipid Panel, API Connections, batch/manual entry, zoom controls, patient chips, how-it-works). My proposal is to **keep the PDF's scope as the map**, adopt these additions where they support a documented requirement, and standardize the visual language rather than duplicate each mockup pixel-for-pixel. Confirm before I change the UI.
