/**
 * Scripted end-to-end walkthrough of the documented OneMed flows.
 * Start the API first (`npm start` or `npm run dev:all`), then run `npm run demo`.
 * Uses the seeded demo accounts; no fake data is injected.
 */
import "dotenv/config";
import { generate } from "otplib";
import { getStore } from "../src/store/index.js";

const BASE = process.env.DEMO_BASE_URL || "http://localhost:3000/api";
const H = (t) => ({ "content-type": "application/json", authorization: `Bearer ${t}` });
const results = [];

async function check(name, fn) {
  try { const detail = await fn(); results.push({ name, status: "PASS", detail }); }
  catch (error) { results.push({ name, status: "FAIL", detail: error.message }); }
}
async function json(path, token, init = {}) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers || {}), ...(token ? H(token) : {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${body.message || ""}`);
  return body;
}

/** Authenticate through the real API, including first-login TOTP enrollment. */
async function staffToken(uid, email, password) {
  const first = await json("/auth/login", null, { method: "POST", body: JSON.stringify({ email, password }) });
  if (first.accessToken) return first.accessToken;
  if (first.mfaToken) {
    const record = await getStore().get("userMfa", uid);
    if (!record?.secret) throw new Error(`No seeded MFA secret for ${email}; run npm run seed`);
    const code = await generate({ secret: record.secret });
    const verified = await json("/auth/mfa/verify", null, { method: "POST", body: JSON.stringify({ mfaToken: first.mfaToken, code }) });
    return verified.accessToken;
  }
  if (!first.setupToken) throw new Error(`No session or MFA token for ${email}`);
  const setup = await json("/auth/mfa/setup", null, { method: "POST", body: JSON.stringify({ setupToken: first.setupToken }) });
  const code = await generate({ secret: setup.secret });
  await json("/auth/mfa/enable", null, { method: "POST", body: JSON.stringify({ setupToken: first.setupToken, code }) });
  const second = await json("/auth/login", null, { method: "POST", body: JSON.stringify({ email, password }) });
  const verified = await json("/auth/mfa/verify", null, { method: "POST", body: JSON.stringify({ mfaToken: second.mfaToken, code }) });
  return verified.accessToken;
}

async function main() {
  const health = await fetch(`${BASE.replace(/\/api$/, "")}/`).then(r => r.json());
  console.log(`OneMed demo · ${health.persistence} persistence · ${health.authProvider} auth`);

  const patientLogin = await json("/auth/login", null, { method: "POST", body: JSON.stringify({ email: "mona.patient@example.com", password: "Demo!onemed1" }) });
  const patient = patientLogin.accessToken;
  const doctor = await staffToken("user_doctor_1", "karim.doctor@example.com", "Demo!onemedD1");
  const pharmacy = await staffToken("user_pharmacy", "pharmacy.desk@example.com", "Demo!onemedP1");
  const admin = await staffToken("user_admin", "admin.onemed@example.com", "Demo!onemedA1");

  await check("Patient search", async () => (await json("/patients/search?q=Mona", doctor)).patients.length);
  await check("Clinical summary", async () => (await json("/analytics/clinical/user_patient_1/summary", doctor)).confidence);
  await check("Patient analytics", async () => `${(await json("/analytics/patient/user_patient_1", patient)).indicators.hba1c.value} HbA1c`);
  await check("Population analytics", async () => (await json("/analytics/population", admin)).totalPatients);
  await check("Audit chain", async () => (await json("/audit/verify", admin)).valid);
  await check("Doctor RAG assistant", async () => {
    const answer = await json("/analytics/clinical/user_patient_1/chat", doctor, {
      method: "POST", body: JSON.stringify({ message: "allergies and flagged results", language: "en" }),
    });
    if (!answer.disclaimer?.includes("responsible for clinical decisions")) throw new Error("Missing safety disclaimer");
    return `${answer.confidence} · ${answer.sources.length} sources`;
  });

  let link;
  await check("Prescription confirm + 24h link", async () => {
    const rx = await json("/prescriptions", doctor, { method: "POST", body: JSON.stringify({ patientId: "user_patient_1", items: [{ name: "Metformin", dose: "500mg", frequency: "BID", duration: "30 days" }] }) });
    const confirmed = await json(`/prescriptions/${rx.id}/confirm`, doctor, { method: "POST", body: JSON.stringify({ confirmed: true, items: [{ name: "Metformin", dosage: "500mg", frequency: "BID", duration: "30 days" }] }) });
    if (!confirmed.linkToken) throw new Error("No fulfillment link");
    link = confirmed.linkToken;
    return confirmed.extractionStatus;
  });
  await check("Fulfillment + WhatsApp order", async () => {
    const page = await json(`/fulfillment/${link}`);
    const chosen = await json(`/fulfillment/${link}/select`, null, { method: "POST", body: JSON.stringify({ pharmacyId: page.pharmacies[0].id }) });
    return `${page.pharmacies.length} pharmacies · ${chosen.whatsappUrl.slice(0, 22)}`;
  });
  await check("Pharmacy order status", async () => (await json("/pharmacy/orders", pharmacy)).orders.length);
  await check("Notifications", async () => (await json("/notifications", patient)).items.length);

  await check("Emergency profile + RAG chat", async () => {
    const qr = await json("/emergency/qr", patient, { method: "POST" });
    const profile = await json(`/emergency/${qr.token}`);
    const chat = await json(`/emergency/${qr.token}/chat`, null, { method: "POST", body: JSON.stringify({ message: "collapse and not breathing" }) });
    return `${profile.visible.patientName} · ${chat.confidence}`;
  });

  await check("Report exports", async () => {
    const pdf = await fetch(`${BASE}/reports/history?patientId=user_patient_1&format=pdf`, { headers: H(patient) });
    const fhir = await json("/reports/history?patientId=user_patient_1&format=fhir", patient);
    return `${pdf.status === 200 ? "PDF" : "no PDF"} · ${fhir.resourceType}`;
  });

  for (const row of results) console.log(`${row.status.padEnd(4)} ${row.name}: ${row.detail}`);
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`\n${results.length - failed}/${results.length} demo flows passed`);
  if (failed) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
