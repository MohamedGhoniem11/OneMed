import "dotenv/config";
import crypto from "node:crypto";
import { createEmergency, createFulfillment, createNfc } from "../src/services/token.service.js";
import { generateSecret } from "otplib";
import { requiresMfa } from "../src/constants/auth.js";

/**
 * Idempotent synthetic dataset (R82, M1 acceptance).
 *
 * Populates the real store with fictional institutions, one account per role,
 * patients with longitudinal clinical data, consents that let each staff role
 * perform its job, prescriptions in every fulfillment state, messages and the
 * first-aid KB with deterministic local embeddings. Every value is invented;
 * no real patient data is used. Safe to repeat: stable IDs skip existing records
 * and passwords are never overwritten after the first run.
 *
 * These accounts are for local evaluation only. Never use them in production.
 */

const SYNTHETIC = {
  institutions: [
    {
      id: "inst_alexandria_main",
      name: "Alexandria Main University Hospital",
      type: "hospital",
      licenseNumber: "HOSP-ALX-001",
      city: "Alexandria",
      address: "El Chatby, Alexandria",
      contactEmail: "contact@alexmain.example",
      contactPhone: "0223334455",
      verified: true,
      active: true,
    },
    {
      id: "inst_alexandria_lab",
      name: "Alexandria Central Laboratory",
      type: "laboratory",
      licenseNumber: "LAB-ALX-002",
      city: "Alexandria",
      address: "Smouha, Alexandria",
      contactEmail: "contact@alexlab.example",
      contactPhone: "0225556677",
      verified: true,
      active: true,
    },
    {
      id: "inst_nasr_clinic",
      name: "Nasr City Medical Center",
      type: "clinic",
      licenseNumber: "CLIN-CAI-003",
      city: "Cairo",
      address: "Nasr City, Cairo",
      contactEmail: "contact@nasrcity.example",
      contactPhone: "0227778899",
      verified: true,
      active: true,
    },
    {
      id: "inst_nile_diagnostics",
      name: "Nile Diagnostics Center",
      type: "laboratory",
      licenseNumber: "LAB-CAI-004",
      city: "Giza",
      address: "6th of October City, Giza",
      contactEmail: "contact@niledx.example",
      contactPhone: "0233331122",
      verified: false,
      active: true,
    },
    {
      id: "inst_damia_hospital",
      name: "Damietta General Hospital",
      type: "hospital",
      licenseNumber: "HOSP-DAM-005",
      city: "Damietta",
      address: "Corniche El Nil, Damietta",
      contactEmail: "contact@damietta.example",
      contactPhone: "0572223344",
      verified: false,
      active: true,
    },
  ],
  users: [
    {
      uid: "user_patient_1",
      name: "Mona Ali Hassan",
      email: "mona.patient@example.com",
      password: "Demo!onemed1",
      role: "patient",
      phone: "01012345678",
    },
    {
      uid: "user_patient_2",
      name: "Youssef Karim Adel",
      email: "youssef.patient@example.com",
      password: "Demo!onemed2",
      role: "patient",
      phone: "01122334455",
    },
    {
      uid: "user_patient_3",
      name: "Salma Mostafa Reda",
      email: "salma.patient@example.com",
      password: "Demo!onemed3",
      role: "patient",
      phone: "01233445566",
    },
    {
      uid: "user_patient_4",
      name: "Ahmed Farouk Nabil",
      email: "ahmed.patient@example.com",
      password: "Demo!onemed4",
      role: "patient",
      phone: "01044556677",
    },
    {
      uid: "user_patient_5",
      name: "Fatma El-Sayed Gomaa",
      email: "fatma.patient@example.com",
      password: "Demo!onemed5",
      role: "patient",
      phone: "01155667788",
    },
    {
      uid: "user_patient_6",
      name: "Mohamed Adel Sayed",
      email: "mohamed.patient@example.com",
      password: "Demo!onemed6",
      role: "patient",
      phone: "01266778899",
    },
    {
      uid: "user_doctor_1",
      name: "Dr. Karim Hassan",
      email: "karim.doctor@example.com",
      password: "Demo!onemedD1",
      role: "doctor",
      phone: "01112345678",
      institutionId: "inst_alexandria_main",
    },
    {
      uid: "user_doctor_2",
      name: "Dr. Sherif Azer",
      email: "sherif.doctor@example.com",
      password: "Demo!onemedD2",
      role: "doctor",
      phone: "01333445566",
      institutionId: "inst_nasr_clinic",
    },
    {
      uid: "user_lab_staff",
      name: "Nadia Lab Technician",
      email: "nadia.lab@example.com",
      password: "Demo!onemedL1",
      role: "lab_staff",
      phone: "01234567890",
      institutionId: "inst_alexandria_lab",
    },
    {
      uid: "user_pharmacy",
      name: "Pharmacy Partner Desk",
      email: "pharmacy.desk@example.com",
      password: "Demo!onemedP1",
      role: "pharmacy",
      phone: "01098765432",
      institutionId: "pharm_medica",
    },
    {
      uid: "user_hospital_admin",
      name: "Hany Hospital Administrator",
      email: "hany.admin@example.com",
      password: "Demo!onemedH1",
      role: "hospital_admin",
      phone: "01099887766",
      institutionId: "inst_alexandria_main",
    },
    {
      uid: "user_admin",
      name: "System Administrator",
      email: "admin.onemed@example.com",
      password: "Demo!onemedA1",
      role: "admin",
      phone: "01000000000",
    },
  ],
  patients: [
    {
      uid: "user_patient_1",
      nationalId: "29001011234567",
      dateOfBirth: "1990-01-10",
      gender: "female",
      bloodGroup: "O+",
      city: "Alexandria",
      address: "Sidi Gaber, Alexandria",
      allergies: ["Penicillin"],
      chronicDiseases: ["Type 2 Diabetes"],
      activeMedications: ["Metformin 500mg twice daily"],
      location: { lat: 31.2156, lng: 29.9553 },
    },
    {
      uid: "user_patient_2",
      nationalId: "29505200123456",
      dateOfBirth: "1995-05-20",
      gender: "female",
      bloodGroup: "A+",
      city: "Cairo",
      address: "Nasr City, Cairo",
      allergies: [],
      chronicDiseases: ["Asthma"],
      activeMedications: ["Salbutamol inhaler as needed"],
      location: { lat: 30.0566, lng: 31.3315 },
    },
    {
      uid: "user_patient_3",
      nationalId: "30007150123456",
      dateOfBirth: "2000-07-15",
      gender: "female",
      bloodGroup: "B+",
      city: "Alexandria",
      address: "Smouha, Alexandria",
      allergies: ["Ibuprofen"],
      chronicDiseases: [],
      activeMedications: [],
      location: { lat: 31.2089, lng: 29.9233 },
    },
    {
      uid: "user_patient_4",
      nationalId: "29709111234567",
      dateOfBirth: "1997-09-11",
      gender: "male",
      bloodGroup: "AB+",
      city: "Alexandria",
      address: "Moharam Bek, Alexandria",
      allergies: [],
      chronicDiseases: ["Hypertension"],
      activeMedications: ["Amlodipine 5mg once daily"],
      location: { lat: 31.1988, lng: 29.9188 },
    },
    {
      uid: "user_patient_5",
      nationalId: "29211221234567",
      dateOfBirth: "1992-11-22",
      gender: "female",
      bloodGroup: "O-",
      city: "Cairo",
      address: "Maadi, Cairo",
      allergies: ["Sulfa drugs"],
      chronicDiseases: ["Asthma", "Hypothyroidism"],
      activeMedications: ["Levothyroxine 50mcg once daily"],
      location: { lat: 29.9689, lng: 31.2757 },
    },
    {
      uid: "user_patient_6",
      nationalId: "30203031234567",
      dateOfBirth: "2002-03-03",
      gender: "male",
      bloodGroup: "A-",
      city: "Giza",
      address: "Dokki, Giza",
      allergies: [],
      chronicDiseases: [],
      activeMedications: [],
      location: { lat: 30.0438, lng: 31.2352 },
    },
  ],
  doctors: [
    {
      uid: "user_doctor_1",
      specialty: "Cardiology",
      licenseNumber: "EG-CARD-12345",
      city: "Alexandria",
      clinicName: "Karim Cardiology Clinic",
      clinicAddress: "El Ibrahimiya, Alexandria",
      yearsOfExperience: 10,
      verified: true,
      institutionId: "inst_alexandria_main",
    },
    {
      uid: "user_doctor_2",
      specialty: "Internal Medicine",
      licenseNumber: "EG-INT-54321",
      city: "Cairo",
      clinicName: "Nasr City Medical Center",
      clinicAddress: "Nasr City, Cairo",
      yearsOfExperience: 7,
      verified: true,
      institutionId: "inst_nasr_clinic",
    },
  ],
  pharmacies: [
    {
      id: "pharm_medica",
      institutionId: "pharm_medica",
      licenseNumber: "PH-ALX-001",
      name: "MediCare Plus Pharmacy",
      address: "14 El-Geish Road, Alexandria",
      city: "Alexandria",
      phone: "01098765432",
      whatsapp: "01098765432",
      location: { lat: 31.201, lng: 29.921 },
      openingHours: "Open 24/7",
      hours: "Open 24/7",
      rating: 4.8,
      active: true,
      status: "approved",
      verified: true,
      monthlyFee: 1500,
    },
    {
      id: "pharm_city",
      institutionId: "pharm_city",
      licenseNumber: "PH-ALX-002",
      name: "City Central Care",
      address: "3 Saad Zaghloul Square, Alexandria",
      city: "Alexandria",
      phone: "01234567891",
      whatsapp: "01234567891",
      location: { lat: 31.198, lng: 29.918 },
      openingHours: "08:00 - 22:00",
      hours: "08:00 - 22:00",
      rating: 4.5,
      active: true,
      status: "approved",
      verified: true,
      monthlyFee: 1500,
    },
    {
      id: "pharm_nile",
      institutionId: "pharm_nile",
      licenseNumber: "PH-GIZ-003",
      name: "Nile Pharmacy",
      address: "21 El-Tahrir Street, Giza",
      city: "Giza",
      phone: "01227778899",
      whatsapp: "01227778899",
      location: { lat: 30.0444, lng: 31.2357 },
      openingHours: "09:00 - 23:00",
      hours: "09:00 - 23:00",
      rating: 0,
      active: false,
      status: "pending",
      verified: false,
      monthlyFee: 1500,
    },
  ],
  prescriptions: [
    {
      id: "rx_demo_1",
      doctorId: "user_doctor_1",
      patientId: "user_patient_1",
      diagnosis: "Type 2 Diabetes follow-up",
      items: [
        { name: "Metformin", dose: "500mg", frequency: "twice daily", duration: "30 days" },
        { name: "Glimepiride", dose: "1mg", frequency: "once daily", duration: "30 days" },
      ],
      status: "confirmed",
      orderStatus: "ready",
      date: "2026-02-20T10:00:00.000Z",
    },
    {
      id: "rx_syn_2",
      doctorId: "user_doctor_2",
      patientId: "user_patient_2",
      diagnosis: "Asthma follow-up",
      items: [{ name: "Salbutamol", dose: "100mcg", frequency: "as needed", duration: "30 days" }],
      status: "confirmed",
      orderStatus: "received",
      date: "2026-03-02T10:00:00.000Z",
    },
    {
      id: "rx_syn_3",
      doctorId: "user_doctor_1",
      patientId: "user_patient_4",
      diagnosis: "Hypertension review",
      items: [{ name: "Amlodipine", dose: "5mg", frequency: "once daily", duration: "30 days" }],
      status: "confirmed",
      orderStatus: "preparing",
      date: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "rx_syn_4",
      doctorId: "user_doctor_2",
      patientId: "user_patient_5",
      diagnosis: "Thyroid review",
      items: [{ name: "Levothyroxine", dose: "50mcg", frequency: "once daily", duration: "60 days" }],
      status: "confirmed",
      orderStatus: "verifying",
      date: "2026-03-12T10:00:00.000Z",
    },
  ],
  records: [
    {
      id: "rec_lab_1",
      patientId: "user_patient_1",
      institutionId: "inst_alexandria_lab",
      type: "lab",
      title: "HbA1c and lipid panel",
      summary: "HbA1c 7.2%, LDL 130 mg/dL",
      data: { hba1c: 7.2, ldl: 130, hdl: 45, triglycerides: 160 },
      status: "abnormal",
      observedAt: "2026-01-15T09:00:00.000Z",
      uploadedBy: "user_lab_staff",
      source: "lab_upload",
      confidence: 95,
      reviewed: true,
    },
    {
      id: "rec_vital_1",
      patientId: "user_patient_1",
      institutionId: "inst_alexandria_main",
      type: "vital",
      title: "Blood pressure",
      summary: "128/82 mmHg",
      data: { systolic: 128, diastolic: 82, pulse: 74 },
      status: "normal",
      observedAt: "2026-02-02T09:00:00.000Z",
      uploadedBy: "user_doctor_1",
      source: "clinic",
      reviewed: true,
    },
    {
      id: "rec_lab_2",
      patientId: "user_patient_2",
      institutionId: "inst_alexandria_lab",
      type: "lab",
      title: "Complete blood count",
      summary: "Within normal limits",
      data: { hemoglobin: 13.5, wbc: 6500, platelets: 250000 },
      status: "normal",
      observedAt: "2026-02-10T09:00:00.000Z",
      uploadedBy: "user_lab_staff",
      source: "lab_upload",
      confidence: 96,
      reviewed: true,
    },
  ],
  consents: [
    {
      id: "consent_demo_1",
      patientId: "user_patient_1",
      granteeType: "doctor",
      granteeId: "user_doctor_1",
      scope: ["demographics", "records", "prescriptions", "emergency"],
      purpose: "Cardiology treatment",
      status: "active",
      expiresAt: "2027-01-01T00:00:00.000Z",
    },
    {
      id: "consent_demo_2",
      patientId: "user_patient_1",
      granteeType: "institution",
      granteeId: "inst_alexandria_lab",
      scope: ["records"],
      purpose: "Lab results sharing",
      status: "active",
      expiresAt: "2027-01-01T00:00:00.000Z",
    },
  ],
};

/**
 * Longitudinal synthetic observations. Ranges are illustrative, documented
 * reference values (see clinical-values.js), not diagnostic thresholds.
 */
const value = (name, numeric, unit, low, high) => ({
  name, value: numeric, unit, referenceLow: low, referenceHigh: high,
  flag: numeric < low ? "low" : numeric > high ? "high" : "normal",
});
const lab = (id, patientId, title, observedAt, values, status = "normal") => ({
  id, patientId, institutionId: "inst_alexandria_lab", type: "lab", title,
  summary: values.map((v) => `${v.name} ${v.value} ${v.unit}`).join(" · "),
  data: { values }, status, observedAt, uploadedBy: "user_lab_staff",
  source: "lab_upload", confidence: 96, reviewed: true,
});
const vital = (id, patientId, systolic, diastolic, pulse, observedAt) => ({
  id, patientId, institutionId: "inst_alexandria_main", type: "vital", title: "Vital signs",
  summary: `${systolic}/${diastolic} mmHg · pulse ${pulse}`,
  data: { values: [
    value("Systolic", systolic, "mmHg", 90, 120),
    value("Diastolic", diastolic, "mmHg", 60, 80),
    { name: "Heart Rate", value: pulse, unit: "bpm", flag: "normal" },
  ] },
  status: systolic > 120 || diastolic > 80 ? "monitor" : "normal",
  observedAt, uploadedBy: "user_doctor_1", source: "clinic", confidence: 99, reviewed: true,
});
const monthly = ["2026-01-20", "2026-02-20", "2026-03-20", "2026-04-20", "2026-05-20", "2026-06-20"];
monthly.forEach((day, i) => {
  const hba1c = [7.8, 7.5, 7.2, 6.9, 6.7, 6.5][i];
  const glucose = [148, 138, 126, 119, 110, 104][i];
  SYNTHETIC.records.push(lab(`rec_syn_hba1c_${i + 1}`, "user_patient_1", "Diabetes follow-up panel",
    `${day}T09:00:00.000Z`, [
      value("HbA1c", hba1c, "%", 4, 5.6),
      value("Glucose, Fasting", glucose, "mg/dL", 70, 100),
      value("Creatinine", 1.0, "mg/dL", 0.6, 1.2),
    ], hba1c > 5.6 ? "abnormal" : "normal"));
  SYNTHETIC.records.push(vital(`rec_syn_vital_${i + 1}`, "user_patient_1",
    [132, 128, 124, 122, 119, 118][i], [84, 82, 80, 79, 77, 76][i], [78, 76, 74, 73, 72, 70][i], `${day}T09:30:00.000Z`));
});
SYNTHETIC.records.push(
  lab("rec_syn_lipid_1", "user_patient_1", "Lipid panel", "2026-06-21T09:00:00.000Z", [
    value("LDL", 118, "mg/dL", 0, 100), value("HDL", 52, "mg/dL", 40, 90),
    value("Total Cholesterol", 192, "mg/dL", 0, 200), value("Triglycerides", 132, "mg/dL", 0, 150),
  ], "abnormal"),
  lab("rec_syn_cbc_1", "user_patient_2", "Complete blood count", "2026-04-12T09:00:00.000Z", [
    value("Hemoglobin", 13.8, "g/dL", 12, 16), value("WBC", 7200, "/µL", 4000, 11000),
    value("Platelets", 268000, "/µL", 150000, 400000),
  ]),
  lab("rec_syn_cbc_2", "user_patient_4", "Complete blood count", "2026-03-18T09:00:00.000Z", [
    value("Hemoglobin", 15.1, "g/dL", 12, 16), value("WBC", 8100, "/µL", 4000, 11000),
  ]),
  lab("rec_syn_thyroid_1", "user_patient_5", "Thyroid function panel", "2026-05-04T09:00:00.000Z", [
    { name: "TSH", value: 4.8, unit: "mIU/L", flag: "high", referenceLow: 0.4, referenceHigh: 4 },
  ], "monitor"),
  lab("rec_syn_review_1", "user_patient_3", "Glucose panel (low confidence)", "2026-06-10T09:00:00.000Z", [
    value("Glucose, Fasting", 92, "mg/dL", 70, 100),
  ], "needs_review"),
  { id: "rec_syn_imaging_1", patientId: "user_patient_1", institutionId: "inst_alexandria_main", type: "imaging",
    title: "Chest X-ray", summary: "No acute findings", status: "normal", observedAt: "2026-05-28T11:00:00.000Z",
    uploadedBy: "user_doctor_1", source: "clinic", confidence: 99, reviewed: true },
  { id: "rec_syn_visit_1", patientId: "user_patient_1", institutionId: "inst_alexandria_main", type: "visit",
    title: "Cardiology consultation", summary: "Follow-up for type 2 diabetes and hypertension", status: "normal",
    observedAt: "2026-05-28T10:00:00.000Z", uploadedBy: "user_doctor_1", source: "clinic", reviewed: true },
  { id: "rec_syn_note_1", patientId: "user_patient_5", institutionId: "inst_nasr_clinic", type: "note",
    title: "Asthma action plan", summary: "Inhaler technique reviewed; avoid known triggers", status: "normal",
    observedAt: "2026-06-02T10:00:00.000Z", uploadedBy: "user_doctor_2", source: "clinic", reviewed: true },
);
// The low-confidence record must appear in the lab verification queue.
SYNTHETIC.records.find((r) => r.id === "rec_syn_review_1").confidence = 62;

// Consent grants that let each role do its job on the fictional cohort.
for (const patient of SYNTHETIC.patients) {
  for (const doctor of SYNTHETIC.doctors) {
    SYNTHETIC.consents.push({
      id: `consent_syn_${patient.uid}_${doctor.uid}`, patientId: patient.uid,
      granteeType: "doctor", granteeId: doctor.uid,
      scope: ["demographics", "records", "prescriptions", "emergency"],
      purpose: "Continuity of care", status: "active", expiresAt: "2027-12-31T00:00:00.000Z",
    });
  }
  for (const institutionId of ["inst_alexandria_lab", "inst_alexandria_main"]) {
    SYNTHETIC.consents.push({
      id: `consent_syn_${patient.uid}_${institutionId}`, patientId: patient.uid,
      granteeType: "institution", granteeId: institutionId, scope: ["records"],
      purpose: institutionId.includes("lab") ? "Laboratory result sharing" : "Hospital care coordination",
      status: "active", expiresAt: "2027-12-31T00:00:00.000Z",
    });
  }
}

// Notifications and care-team conversations for the dashboard inboxes.
SYNTHETIC.notifications = [
  { id: "syn_notif_1", userId: "user_patient_1", title: "New lab result available", body: "Diabetes follow-up panel · June 2026", type: "lab", read: false, createdAt: "2026-06-20T09:05:00.000Z" },
  { id: "syn_notif_2", userId: "user_patient_1", title: "Prescription ready", body: "Your pharmacy fulfillment link is active for 24 hours", type: "prescription", read: false, createdAt: "2026-06-21T11:00:00.000Z" },
  { id: "syn_notif_3", userId: "user_patient_2", title: "Result needs review", body: "A lab result is awaiting verification", type: "lab", read: false, createdAt: "2026-06-11T08:00:00.000Z" },
  { id: "syn_notif_4", userId: "user_doctor_1", title: "Consultation scheduled", body: "Mona Ali Hassan · cardiology follow-up", type: "visit", read: false, createdAt: "2026-06-27T08:00:00.000Z" },
];
SYNTHETIC.conversations = [
  { id: "syn_conv_1", patientId: "user_patient_1", doctorId: "user_doctor_1", otherUserId: "user_doctor_1", otherName: "Dr. Karim Hassan", role: "doctor", updatedAt: "2026-06-25T12:00:00.000Z" },
  { id: "syn_conv_2", patientId: "user_patient_2", doctorId: "user_doctor_2", otherUserId: "user_doctor_2", otherName: "Dr. Sherif Azer", role: "doctor", updatedAt: "2026-06-24T12:00:00.000Z" },
];
SYNTHETIC.messages = [
  { id: "syn_msg_1", conversationId: "syn_conv_1", senderId: "user_doctor_1", text: "Your June HbA1c is improving. Continue the current plan and we will review again in three months.", sentAt: "2026-06-25T12:00:00.000Z" },
  { id: "syn_msg_2", conversationId: "syn_conv_1", senderId: "user_patient_1", text: "Thank you, doctor. I have been walking every morning.", sentAt: "2026-06-25T12:05:00.000Z" },
  { id: "syn_msg_3", conversationId: "syn_conv_2", senderId: "user_doctor_2", text: "Please bring your inhaler to the next visit so we can check your technique.", sentAt: "2026-06-24T12:00:00.000Z" },
];

const GUIDELINES = [
  {
    id: "kb_cpr_adult",
    source: "AHA CPR & First Aid 2024 (paraphrased)",
    section: "Adult CPR",
    url: "https://cpr.heart.org/",
    language: "en",
    text: "If an adult is unresponsive and not breathing normally, call emergency services first. Place the heel of one hand on the center of the chest and the other hand on top. Push hard and fast, about 5 to 6 cm deep, at 100 to 120 compressions per minute. Let the chest return fully between compressions. Continue until help arrives or the person starts breathing normally.",
    tags: ["cpr", "adult", "cardiac"],
    version: "2024",
  },
  {
    id: "kb_seizure",
    source: "Red Cross First Aid 2024 (paraphrased)",
    section: "Seizures",
    url: "https://www.redcross.org/",
    language: "en",
    text: "During a seizure, protect the person from injury by clearing sharp or hard objects away. Cushion the head and do not hold the person down. Do not put anything in their mouth. Time the seizure. Call emergency services if it lasts longer than five minutes, if the person is injured, or if it is their first seizure.",
    tags: ["seizure", "first-aid"],
    version: "2024",
  },
  {
    id: "kb_anaphylaxis",
    source: "WHO Basic Emergency Care (paraphrased)",
    section: "Anaphylaxis",
    url: "https://www.who.int/",
    language: "en",
    text: "Signs of a severe allergic reaction include swelling of the face or throat, difficulty breathing, and a widespread rash. If an adrenaline auto-injector is available, use it as instructed and call emergency services immediately. Lay the person flat with legs raised unless they are struggling to breathe, in which case let them sit.",
    tags: ["anaphylaxis", "allergy", "emergency"],
    version: "2024",
  },
  {
    id: "kb_cpr_adult_ar",
    source: "AHA CPR & First Aid 2024 (ملخص مُعاد صياغته)",
    section: "الإنعاش القلبي الرئوي للبالغين",
    url: "https://cpr.heart.org/",
    language: "ar",
    text: "إذا كان الشخص فاقدًا للوعي ولا يتنفس بشكل طبيعي، اتصل بالإسعاف أولًا. ضع كف يدك في منتصف الصدر واليد الأخرى فوقها. اضغط بقوة وسرعة بعمق ٥ إلى ٦ سنتيمترات، بمعدل ١٠٠ إلى ١٢٠ ضغطة في الدقيقة. اسمح للصدر بالعودة بالكامل بين الضغطات. استمر حتى وصول المساعدة أو بدء التنفس الطبيعي.",
    tags: ["cpr", "adult", "cardiac", "إنعاش"],
    version: "2024",
  },
  {
    id: "kb_seizure_ar",
    source: "Red Cross First Aid 2024 (ملخص مُعاد صياغته)",
    section: "التشنجات",
    url: "https://www.redcross.org/",
    language: "ar",
    text: "أثناء التشنج، أبعد الأشياء الحادة والصلبة عن الشخص لحمايته من الإصابة. ضع وسادة تحت رأسه ولا تمنع حركته بالقوة. لا تضع أي شيء في فمه. احسب مدة التشنج. اتصل بالإسعاف إذا استمر أكثر من خمس دقائق، أو إذا أصيب الشخص، أو كانت هذه أول نوبة له.",
    tags: ["seizure", "first-aid", "تشنجات"],
    version: "2024",
  },
  {
    id: "kb_anaphylaxis_ar",
    source: "WHO Basic Emergency Care (ملخص مُعاد صياغته)",
    section: "الحساسية المفرطة",
    url: "https://www.who.int/",
    language: "ar",
    text: "تشمل علامات الحساسية المفرطة تورم الوجه أو الحلق وصعوبة التنفس وطفح جلدي واسع. إذا توفر حقن الأدرينالين التلقائي استخدمه حسب التعليمات واتصل بالإسعاف فورًا. اجعل الشخص مستلقيًا مع رفع الساقين، إلا إذا كان يجد صعوبة في التنفس فيترك في وضع الجلوس.",
    tags: ["anaphylaxis", "allergy", "emergency", "حساسية"],
    version: "2024",
  },
];

function hashEmbed(text, dimensions = 64) {
  const vector = new Array(dimensions).fill(0);
  const tokens = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  tokens.forEach((token, index) => {
    const digest = crypto.createHash("sha256").update(token).digest();
    const bucket = digest.readUInt16LE(0) % dimensions;
    const sign = digest[1] & 1 ? 1 : -1;
    vector[bucket] += sign * (1 + (index % 3) * 0.1);
  });
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(6)));
}

async function seed() {
  const { getIdp } = await import("../src/auth/index.js");
  const { getStore } = await import("../src/store/index.js");
  const store = getStore();
  const idp = getIdp();
  const now = new Date();
  const report = { institutions: 0, users: 0, patients: 0, doctors: 0, pharmacies: 0, prescriptions: 0, records: 0, consents: 0, guidelineChunks: 0, skipped: 0 };
  const demoPatient = "user_patient_1";

  for (const institution of SYNTHETIC.institutions) {
    const existing = await store.get("institutions", institution.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("institutions", institution.id, { ...institution, createdAt: now, updatedAt: now });
    report.institutions += 1;
  }

  for (const user of SYNTHETIC.users) {
    const existingProfile = await store.get("users", user.uid);
    const { password, ...profile } = user;
    if (!existingProfile) {
      try {
        await idp.createUser({ uid: user.uid, email: user.email, password, displayName: user.name });
      } catch (error) {
        if (error?.code !== "auth/email-already-exists") throw error;
      }
      const authUser = await idp.getUserByEmail(user.email);
      await idp.setCustomUserClaims(authUser.uid, { role: user.role });
      await store.set("users", authUser.uid, {
        ...profile,
        status: "active",
        emailVerified: true,
        mfaEnabled: requiresMfa(user.role),
        emergencyContact:
          user.role === "patient"
            ? { name: "Family Contact", phone: "01000000001", relationship: "family" }
            : undefined,
        createdAt: now,
        updatedAt: now,
      });
      report.users += 1;
    } else {
      if (user.institutionId && existingProfile.institutionId !== user.institutionId) {
        await store.update("users", user.uid, { institutionId: user.institutionId, updatedAt: now });
      } else report.skipped += 1;
    }
  }

  // Seed real TOTP credentials for staff so their seeded `mfaEnabled` flag is
  // true in the backend, not just a UI claim, and demo runs can authenticate.
  for (const user of SYNTHETIC.users.filter((u) => requiresMfa(u.role))) {
    if (await store.get("userMfa", user.uid)) { report.skipped += 1; continue; }
    await store.set("userMfa", user.uid, {
      userId: user.uid, secret: generateSecret(), enabled: true,
      createdAt: now, updatedAt: now,
    });
    report.mfa = (report.mfa || 0) + 1;
  }

  for (const patient of SYNTHETIC.patients) {
    const existing = await store.get("patients", patient.uid);
    if (existing) { report.skipped += 1; continue; }
    await store.set("patients", patient.uid, {
      ...patient,
      emergencyContacts: [{ name: "Family Contact", phone: "01000000001", relationship: "family" }],
      createdAt: now,
      updatedAt: now,
    });
    report.patients += 1;
  }

  for (const doctor of SYNTHETIC.doctors) {
    const existing = await store.get("doctors", doctor.uid);
    if (existing) { report.skipped += 1; continue; }
    await store.set("doctors", doctor.uid, { ...doctor, createdAt: now, updatedAt: now });
    report.doctors += 1;
  }

  for (const pharmacy of SYNTHETIC.pharmacies) {
    const existing = await store.get("pharmacies", pharmacy.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("pharmacies", pharmacy.id, { ...pharmacy, createdAt: now, updatedAt: now });
    report.pharmacies += 1;
  }

  for (const prescription of SYNTHETIC.prescriptions) {
    const existing = await store.get("prescriptions", prescription.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("prescriptions", prescription.id, {
      ...prescription,
      doctorName: SYNTHETIC.users.find((u) => u.uid === prescription.doctorId)?.name || "OneMed clinician",
      patientName: SYNTHETIC.users.find((u) => u.uid === prescription.patientId)?.name || prescription.patientId,
      status: prescription.status || "confirmed",
      extractionStatus: "confirmed",
      orderStatus: prescription.orderStatus || null,
      date: prescription.date || now,
      createdAt: now,
      updatedAt: now,
    });
    report.prescriptions += 1;
  }
  const fulfilledId = "rx_demo_fulfilled";
  if (!(await store.get("prescriptions", fulfilledId))) {
    const link = await createFulfillment({ prescriptionId: fulfilledId, patientId: demoPatient });
    await store.set("prescriptions", fulfilledId, {
      id: fulfilledId, doctorId: "user_doctor_1", patientId: demoPatient,
      doctorName: "Dr. Karim Hassan", patientName: "Mona Ali Hassan",
      diagnosis: "Routine follow-up", status: "confirmed", extractionStatus: "confirmed",
      items: [{ name: "Metformin", dosage: "500mg", frequency: "BID", duration: "30 days" }],
      linkToken: link.token, linkExpiresAt: link.expiresAt, pharmacyId: "pharm_medica",
      pharmacyName: "MediCare Plus Pharmacy", orderStatus: "completed",
      whatsappUrl: "https://wa.me/01098765432", createdAt: now, updatedAt: now,
    });
    report.prescriptions += 1;
  }

  for (const record of SYNTHETIC.records) {
    const existing = await store.get("records", record.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("records", record.id, { ...record, createdAt: now, updatedAt: now });
    report.records += 1;
  }

  for (const consent of SYNTHETIC.consents) {
    const existing = await store.get("consents", consent.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("consents", consent.id, {
      ...consent,
      grantedAt: now,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
      expiresAt: consent.expiresAt ? new Date(consent.expiresAt) : null,
    });
    report.consents += 1;
  }

  for (const collection of ["notifications", "conversations", "messages"]) {
    for (const item of SYNTHETIC[collection]) {
      const existing = await store.get(collection, item.id);
      if (existing) { report.skipped += 1; continue; }
      await store.set(collection, item.id, { ...item, createdAt: item.createdAt || item.sentAt || now });
      report[collection] = (report[collection] || 0) + 1;
    }
  }

  for (const chunk of GUIDELINES) {
    const existing = await store.get("guidelineChunks", chunk.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("guidelineChunks", chunk.id, {
      ...chunk,
      embedding: hashEmbed(chunk.text),
      createdAt: now,
    });
    report.guidelineChunks += 1;
  }

  // Signed artifacts for the synthetic cohort: an emergency QR and an NFC
  // wristband. Tokens are printed once here; only hashes are stored.
  const existingQr = await store.get("emergencyQr", "demo_emergency_qr");
  if (!existingQr) {
    const emergency = await createEmergency({ patientId: demoPatient, issuedBy: "system" });
    await store.set("emergencyQr", "demo_emergency_qr", { ...(await store.get("emergencyQr", emergency.record.id)), demoToken: emergency.token });
    console.log(`Synthetic emergency page: ${emergency.url}`);
    report.emergencyQr = 1;
  }
  const nfc = await findOrCreateNfc(store, demoPatient);
  if (nfc) report.nfc = 1;
  const noteId = "demo_notification_1";
  if (!(await store.get("notifications", noteId))) {
    await store.set("notifications", noteId, {
      id: noteId, userId: demoPatient, title: "New lab result available", body: "HbA1c and lipid panel", type: "lab",
      read: false, createdAt: now,
    });
    report.notifications = 1;
  }

  return report;
}

async function findOrCreateNfc(store, patientId) {
  const existing = await store.get("nfcTokens", "demo_nfc");
  if (existing) return existing;
  const created = await createNfc({ patientId, nfcUid: "NTAG424-SYNTHETIC", issuedBy: "system" });
  await store.set("nfcTokens", "demo_nfc", { ...(await store.get("nfcTokens", created.record.id)), demoToken: created.token });
  console.log(`Synthetic NFC landing: ${created.url}`);
  return created.record;
}

function printCredentials() {
  console.log("\nSynthetic accounts (local evaluation only — change or remove before any real deployment):");
  for (const user of SYNTHETIC.users) {
    console.log(`  ${user.role.padEnd(15)} ${user.email.padEnd(32)} ${user.password}`);
  }
  console.log("\nMedical staff must enroll TOTP MFA on first login (authenticator app).");
  console.log("Patient accounts can log in immediately.\n");
}

async function main() {
  try {
    const report = await seed();
    console.log("Seed complete:", report);
    printCredentials();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("/scripts/seed.mjs");
if (isDirectRun) main();

export { SYNTHETIC, GUIDELINES, hashEmbed, seed };
export default main;