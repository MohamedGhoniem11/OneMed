import "dotenv/config";
import crypto from "node:crypto";

/**
 * Idempotent demo seed (R82, M1 acceptance).
 *
 * Creates institutions, one account per role, three patients with longitudinal
 * records/consents/prescriptions, and the first-aid KB chunks with deterministic
 * local embeddings. Safe to run repeatedly: it keys everything by stable IDs and
 * never overwrites a user's password after the first run.
 *
 * Credentials are printed once and are DEMO-ONLY. Never use them in production.
 */

const DEMO = {
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
      uid: "user_doctor_1",
      name: "Dr. Karim Hassan",
      email: "karim.doctor@example.com",
      password: "Demo!onemedD1",
      role: "doctor",
      phone: "01112345678",
    },
    {
      uid: "user_lab_staff",
      name: "Nadia Lab Technician",
      email: "nadia.lab@example.com",
      password: "Demo!onemedL1",
      role: "lab_staff",
      phone: "01234567890",
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
      gender: "male",
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

  for (const institution of DEMO.institutions) {
    const existing = await store.get("institutions", institution.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("institutions", institution.id, { ...institution, createdAt: now, updatedAt: now });
    report.institutions += 1;
  }

  for (const user of DEMO.users) {
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
        mfaEnabled: user.role !== "patient",
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

  for (const patient of DEMO.patients) {
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

  for (const doctor of DEMO.doctors) {
    const existing = await store.get("doctors", doctor.uid);
    if (existing) { report.skipped += 1; continue; }
    await store.set("doctors", doctor.uid, { ...doctor, createdAt: now, updatedAt: now });
    report.doctors += 1;
  }

  for (const pharmacy of DEMO.pharmacies) {
    const existing = await store.get("pharmacies", pharmacy.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("pharmacies", pharmacy.id, { ...pharmacy, createdAt: now, updatedAt: now });
    report.pharmacies += 1;
  }

  for (const prescription of DEMO.prescriptions) {
    const existing = await store.get("prescriptions", prescription.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("prescriptions", prescription.id, {
      ...prescription,
      doctorName: "Dr. Karim Hassan",
      patientName: "Mona Ali Hassan",
      status: prescription.status || "confirmed",
      extractionStatus: "confirmed",
      orderStatus: null,
      createdAt: now,
      updatedAt: now,
    });
    report.prescriptions += 1;
  }

  for (const record of DEMO.records) {
    const existing = await store.get("records", record.id);
    if (existing) { report.skipped += 1; continue; }
    await store.set("records", record.id, { ...record, createdAt: now, updatedAt: now });
    report.records += 1;
  }

  for (const consent of DEMO.consents) {
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

  return report;
}

function printCredentials() {
  console.log("\nDemo accounts (DEMO ONLY — change or remove before any real deployment):");
  for (const user of DEMO.users) {
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

export { DEMO, GUIDELINES, hashEmbed, seed };
export default main;