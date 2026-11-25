# OneMed Frontend — Code Review (2026-11-24)

Scope: the UI correctness/design pass and the earlier UI-refinement pass in `OneMed-main/frontend/src`.
Method: five-axis review (correctness, readability, architecture, security, performance), mutation-style checks where practical, build + test + browser verification. Findings are labelled by severity; everything marked **Required** was fixed in this change.

## Context
The user reported that some UI components/functionality did not make sense, wanted every portal reachable and coherent, asked for the `design-taste-frontend` skill to remove slop, and for `code-review-and-quality` to review the code. The PDF remains the scope map.

**Design read (declared before changes):** regulated medical product, mostly dense clinical dashboards and multi-step product UI; the taste skill's landing-page rules apply to the public landing page, while dashboards stay in the skill's out-of-scope zone. Dials: variance 4 (trust-first), motion 2 (static, accessibility-first), density 6 (clinical data). One light theme locked, one teal accent, semantic red/amber reserved for emergency/review states.

## Findings and resolutions

### Correctness (Required)
1. **Public pages inherited the authenticated shell.** `main.tsx` wrapped every route in `AppShell`, so a logged-in bystander opening `/emergency/:token` saw the patient sidebar and top bar. Fixed by moving public routes outside `AppShell` and wrapping only `/app/*` in `Protected`. Verified: emergency page with a patient session shows no "Main navigation" (`publicNoShell=true`).
2. **Registration dropped all clinical profile fields.** The wizard stored `nationalId/dateOfBirth/gender/bloodGroup/city/allergies` at the top level of form state, but `api.register` expected a nested `patient` object. New patients were created with empty National ID and DOB. Fixed by mapping the fields in `Register.next()`. Regression test added (`stores every collected patient field from registration`): 4/4 FE tests pass.
3. **Newly registered users could not log in.** Demo login only consulted the hardcoded `DEMO_PASSWORDS` map, so any browser-registered account had no password. Fixed by persisting a `demoPassword` on the demo user and checking it at login. Verified end to end: register (4 steps) → OTP → `/app/patient`.
4. **OTP accepted any code.** `verifyOtp` activated the first pending user without checking the code. Fixed by storing `challengeId` + `pendingOtp` and rejecting mismatches. Verified with the dev code shown in the demo banner.
5. **Expired sessions were never enforced.** `AuthContext` only cleared a removed session. Fixed with expiry checks on init and interval (15-minute access window per R3/R65).
6. **Lab history route rendered the upload tab.** `/app/lab/history` mounted `LabPortal` with default tab `upload`. Fixed with an `initialTab` prop; verified "Upload History" is present on that route.
7. **Consent QR granted a hardcoded patient/doctor.** The public `/qr/:token` page always granted `user_patient_1 → user_doctor_1`. Fixed: doctors now persist generated connection tokens with 15-minute expiry; the consent page resolves the token, uses the logged-in patient, writes the correct grantee/scope and audit entry. Verified with a real generated token (consents 3 → 4, correct grantee and expiry).
8. **Pharmacy ordering used a fixed patient location.** Fulfillment sorted pharmacies from hardcoded Alexandria coordinates even for a Cairo patient. Fixed with haversine distance from the prescription's patient location.
9. **Emergency page showed hardcoded medicines.** Replaced with the patient's confirmed prescription medicines, subject to `showMedications` privacy toggle.
10. **`DoctorMessages` was a placeholder** ("use the patient record viewer"). Replaced with a real conversation list, thread, and send action against the demo store.
11. **Report generation ignored report type.** Every type produced a patient clinical summary; "Audit & Compliance" and "Population Health" now generate their own content, and FHIR export builds a real Bundle from records instead of an empty stub.
12. **Patient "Order Status" linked to another patient's demo prescription** when `linkToken` was absent. Now shows "Link pending confirmation" unless a real token exists.
13. **Overview tab duplicated Analytics.** Overview now shows an at-a-glance summary; Analytics keeps the charts.
14. **Lab upload mislabelled data.** It used the patient's physician as the institution and marked every value normal; now uses the lab staff's institution, computes flags from reference ranges, and blocks linking while any field is under 80% confidence (editing a value marks it human-verified).

### Architecture / readability
15. Global search and the notification bell sent every role to doctor-only routes, producing guard redirects that looked like broken pages. Search is now role-aware; a single `/app/notifications` route works for all authenticated roles with a "mark all read" action.
16. Dead `ConsentQrPage` in `public.tsx` removed after its replacement was moved to `pages/consent-qr.tsx`.
17. Dead imports and the fake `print-only` dashboard card removed from the landing page.

### Security / quality gates
18. No hardcoded secrets in project source. Demo passwords are sample data, clearly labelled; the production path uses the Firebase/API adapter.
19. **Dependency vulnerabilities:** frontend `npm audit` had 4 (2 critical in `tinypool` via Vitest 3, 2 moderate incl. `i18next`). Upgraded Vitest to 5.1.1 and i18next to 26.3.4 with tests green. Result: **0 vulnerabilities**.
20. Role guards retained on every `/app/*` route; public routes never render protected data.

### Design anti-slop (design-taste-frontend)
21. **54 em-dashes** in visible strings (headings, subtitles, disclaimers, i18n values) removed globally. Verified in-browser: `document.body.innerText` contains 0 em/en dashes.
22. **Div-based fake dashboard screenshot** in the hero removed. Replaced with a branded visual panel.
23. **Fake social proof** ("Trusted by 5,000+ providers") removed from the hero; replaced with a truthful line below the feature section.
24. **Three equal feature cards** replaced with an asymmetric bento (one tall accent cell + two smaller cells, one tinted). "How It Works" became a single card with stepped rows and sparse dividers, a different layout family.
25. Hero CTA label unified with nav (`Sign up`) to avoid duplicate intent; trust micro-strip moved out of the hero; nav on one line, 64px.
26. Image generation was attempted for hero/wristband photos but failed with `Invalid credential`. Per the skill's last-resort rule, unrelated random stock photos were removed and **clearly labelled image slots** left in code comments. No fake screenshot or irrelevant photo is shipped.

## Performance / remaining optional items
- **Optional:** bundle is ~883 kB (255 kB gzip) because Recharts and QRCode are in the main chunk. Code splitting by route is worthwhile but not required for the academic demo.
- **Optional:** dark mode is not implemented. The PDF mockups and the medical brand are light-only; this is a documented limitation, not an oversight of the review.
- **Optional:** the new Meeting/consultation creation flow still starts from the prescription review page rather than a dedicated consultation form; acceptable because the PDF's "New Consultation" is represented by the documented prescription workflow.
- **FYI:** the taste skill explicitly excludes dashboards and multi-step wizards; its rules were applied only where they fit (landing page, copy, icon/visual discipline, contrast, states).

## Verification story
- `npm run build` (strict TypeScript + Vite): PASS after every change batch.
- `npm test` (frontend): 4/4; `npm test` (backend): 61/61.
- `npm audit` (frontend): 0 vulnerabilities.
- Browser route matrix: 6 roles, 33 authenticated routes + 7 public routes, zero console errors, no unexpected redirects.
- Interaction checks: registration → OTP → role home; consent grant with generated QR token; lab history tab; notification bell; public page without shell while logged in; 0 em-dashes in rendered text.
- Screenshots reviewed for the landing page and analytics during the design pass.

## Verdict
**Approve.** All Critical and Required findings were resolved before commit. Remaining items are Optional/FYI and do not block submission.
