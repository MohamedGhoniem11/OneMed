import { loadDB, saveDB, findUserByEmail, DEMO_PASSWORDS, roleHome } from '../data/demo';
import type { Role, User, Session, Patient, MedicalRecord, Prescription, Pharmacy, Institution, Consent, EmergencyProfile, Conversation, Message, Notification, AuditEntry, ChatTurn, EmergencySettings } from '../types';

export const API_MODE = (import.meta.env.VITE_API_MODE as string) || 'demo';
const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function http<T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string,string> = { 'Content-Type':'application/json', ...(opts.headers as Record<string,string> || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials:'include' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.message || body.error || `Request failed (${res.status})`);
  return body as T;
}

const wait = (ms = 220) => new Promise(r => setTimeout(r, ms));
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2,10)}`;
const sessionKey = 'onemed.session';

export function getSession(): Session | null {
  try { const s = localStorage.getItem(sessionKey); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function saveSession(s: Session | null) {
  if (s) localStorage.setItem(sessionKey, JSON.stringify(s)); else localStorage.removeItem(sessionKey);
}

// ---------------- Auth ----------------
export async function login(email: string, password: string): Promise<Session> {
  if (API_MODE === 'api') {
    const r = await http<{ token:string; refreshExpiresAt:string; user:User; mfaRequired?:boolean; mfaToken?:string }>('/auth/login', { method:'POST', body:JSON.stringify({email,password}) });
    if (r.mfaRequired) throw new ApiError(428, 'MFA_REQUIRED:' + r.mfaToken);
    const session: Session = { token:r.token, user:r.user, expiresAt:r.refreshExpiresAt };
    saveSession(session); return session;
  }
  await wait();
  const db = loadDB(); const user = findUserByEmail(email);
  // Seeded accounts use DEMO_PASSWORDS; accounts created in this browser keep
  // their demo password on the record so registration -> login works end to end.
  const expected = (user as any)?.demoPassword || DEMO_PASSWORDS[user?.uid || ''];
  if (!user || expected !== password) throw new ApiError(401, 'Invalid email or password');
  const session: Session = { token:`demo.jwt.${btoa(user.uid)}`, user, expiresAt:new Date(Date.now()+15*60000).toISOString() };
  saveSession(session);
  db.audit.push({ id:uid('a'), actor:user.uid, actorName:user.name, action:'login', resource:'auth', timestamp:new Date().toISOString(), ip:'127.0.0.1', previousHash:'', hash:'' });
  saveDB(db); return session;
}
export async function verifyMfa(mfaToken: string, code: string): Promise<Session> {
  if (API_MODE === 'api') {
    const r = await http<{token:string;refreshExpiresAt:string;user:User}>('/auth/mfa/verify', {method:'POST',body:JSON.stringify({mfaToken,code})});
    const s:Session = {token:r.token,user:r.user,expiresAt:r.refreshExpiresAt}; saveSession(s); return s;
  }
  await wait(); const s = getSession(); if (!s) throw new ApiError(400,'No pending login'); s.user.mfaEnabled = true; saveSession(s); return s;
}
type RegisterPayload = {
  name:string; email:string; password:string; role:Role; phone:string;
  emergencyContact:User['emergencyContact'];
  patient?:{nationalId:string;dateOfBirth:string;gender:'male'|'female';bloodGroup:string;city:string;address?:string;allergies?:string[];chronicDiseases?:string[]};
  doctor?:{specialty:string;licenseNumber:string;city:string;clinicName?:string};
};
export async function register(payload: RegisterPayload): Promise<{challengeId:string;devCode?:string}> {
  if (API_MODE === 'api') return http('/auth/register',{method:'POST',body:JSON.stringify(payload)});
  await wait(); const db = loadDB();
  if (db.users.some(u=>u.email.toLowerCase()===payload.email.toLowerCase())) throw new ApiError(409,'Email already exists');
  const uidValue = uid('user');
  const code = String(Math.floor(100000+Math.random()*900000));
  const challengeId = uid('challenge');
  const user: User & {demoPassword?:string; pendingOtp?:string; challengeId?:string} = {
    uid:uidValue, name:payload.name, email:payload.email, phone:payload.phone, role:payload.role,
    emergencyContact:payload.emergencyContact, status:'pending_verification',
    demoPassword:payload.password, pendingOtp:code, challengeId,
  };
  db.users.push(user);
  if (payload.role==='patient') {
    const p = payload.patient;
    db.patients.push({ id:uidValue, userId:uidValue, nationalId:p?.nationalId||'', name:payload.name,
      dateOfBirth:p?.dateOfBirth||'', gender:p?.gender||'male', bloodGroup:p?.bloodGroup||'O+', phone:payload.phone,
      address:p?.address||'', city:p?.city||'', allergies:p?.allergies||[], chronicDiseases:p?.chronicDiseases||[],
      emergencyContact:payload.emergencyContact!, primaryPhysician:'-', primaryPhysicianPhone:'-' });
    db.emergencyProfiles.push({ token:uid('em'), patientId:uidValue, qrIssued:false, nfcIssued:false,
      activatedAt:new Date().toISOString(), scanCount:0,
      settings:{showBloodType:true,showAllergies:true,showConditions:true,showMedications:false,showContacts:true,aiChatbotEnabled:true} });
  }
  if (payload.role==='doctor') {
    const d = payload.doctor;
    db.doctors.push({ id:uidValue, userId:uidValue, name:payload.name, specialty:d?.specialty||'', licenseNumber:d?.licenseNumber||'', city:d?.city||'', clinicName:d?.clinicName||'', verified:false });
  }
  saveDB(db);
  return { challengeId, devCode:code };
}
export async function verifyOtp(challengeId: string, code: string): Promise<Session> {
  if (API_MODE === 'api') return http('/auth/register/verify-otp',{method:'POST',body:JSON.stringify({challengeId,code})});
  await wait();
  const db = loadDB();
  const pending = db.users.find(u => (u as any).challengeId===challengeId && u.status==='pending_verification');
  if (!pending) throw new ApiError(404,'Pending registration not found');
  if ((pending as any).pendingOtp !== code) throw new ApiError(400,'Incorrect verification code');
  pending.status = 'active'; delete (pending as any).pendingOtp; saveDB(db);
  const s: Session = { token:`demo.jwt.${btoa(pending.uid)}`, user:pending, expiresAt:new Date(Date.now()+15*60000).toISOString() }; saveSession(s); return s;
}
export async function logout(): Promise<void> {
  if (API_MODE === 'api') { try { await http('/auth/logout',{method:'POST'}); } catch { /* ignore */ } }
  saveSession(null);
}

// ---------------- Generic data access ----------------
export async function list<T>(collection: keyof ReturnType<typeof loadDB>, filter?: (x:any)=>boolean): Promise<T[]> {
  if (API_MODE === 'api') {
    const map: Record<string,string> = { patients:'/patients', prescriptions:'/prescriptions', pharmacies:'/pharmacies', institutions:'/institutions', consents:'/consents', users:'/users' };
    const path = map[collection as string];
    if (!path) { const db = loadDB(); return (db[collection] as unknown as T[]).filter(filter || (()=>true)); }
    try {
      const r = await http<any>(path, {}, getSession()?.token);
      const arr = Array.isArray(r) ? r : (r.patients || r.prescriptions || r.consents || r.users || r.institutions || r.pharmacies || []);
      return arr as T[];
    } catch { const db = loadDB(); return (db[collection] as unknown as T[]).filter(filter || (()=>true)); }
  }
  await wait(80); const db = loadDB(); return (db[collection] as unknown as T[]).filter(filter || (()=>true));
}
export async function getById<T>(collection: keyof ReturnType<typeof loadDB>, id: string): Promise<T | undefined> {
  const all = await list<any>(collection, x => x.id === id || x.uid === id || x.token === id);
  return all[0] as T | undefined;
}
export async function getPatient(id: string): Promise<Patient | null> {
  return (await getById<Patient>('patients', id)) ?? null;
}
export async function mutate<T>(fn: (db: ReturnType<typeof loadDB>) => T): Promise<T> {
  const db = loadDB(); const result = fn(db); saveDB(db); await wait(100); return result;
}
export async function patientEmergency(token: string): Promise<{patient:Patient; profile:EmergencyProfile; settings:EmergencySettings} | null> {
  const db = loadDB(); const profile = db.emergencyProfiles.find(p=>p.token===token); if (!profile) return null;
  const patient = db.patients.find(p=>p.id===profile.patientId); if (!patient) return null;
  profile.scanCount++; saveDB(db);
  return { patient, profile, settings:profile.settings };
}
export async function chatbot(message: string, patient?: Patient): Promise<ChatTurn> {
  const db = loadDB(); const lang = localStorage.getItem('onemed.lang') || 'en';
  const q = message.toLowerCase();
  const scored = db.guidelines.filter(g => g.language === lang).map(g => ({ g, score:g.tags.reduce((a,t)=>a+(q.includes(t.toLowerCase())?1:0),0) + (q.includes(g.section.toLowerCase().split(' ')[0])?1:0) })).sort((a,b)=>b.score-a.score);
  const best = scored[0]?.score ? scored[0].g : undefined;
  const conditionContext = patient ? `Patient: ${patient.name} - ${patient.chronicDiseases.join(', ') || 'no chronic conditions'}; allergies: ${patient.allergies.join(', ') || 'none'}; blood group ${patient.bloodGroup}. ` : '';
  if (!best) return { role:'assistant', text:lang==='ar'?'لا أستطيع تقديم إرشادات لهذه الحالة. يرجى انتظار الإسعاف.':'I cannot provide guidance for this situation. Please wait for emergency services.', confidence:'Knowledge Gap', sources:[], disclaimer:lang==='ar'?'إرشادات إسعافات أولية فقط - ليست بديلاً عن الرعاية الطبية.':'First-aid guidance only - not a substitute for professional medical care.' };
  const ar = lang === 'ar';
  const text = `${ar?'اتصل بالإسعاف (١٢٣) فوراً إن لم تكن قد فعلت ذلك.':'Call emergency services (123) immediately if you have not already.'}\n\n${conditionContext}${ar?'الإرشادات: ':'Guidance: '}${best.text}`;
  return { role:'assistant', text, confidence:'High', sources:[`${best.source} §${best.section}`], disclaimer:ar?'إرشادات إسعافات أولية فقط - ليست بديلاً عن الرعاية الطبية.':'First-aid guidance only - not a substitute for professional medical care.' };
}
export async function clinicalSummary(patientId: string): Promise<{ text:string; confidence:'High'|'Moderate'|'Low'|'Knowledge Gap'; sources:string[] }> {
  const db = loadDB(); const p = db.patients.find(x=>x.id===patientId); const recs = db.records.filter(r=>r.patientId===patientId);
  if (!p) return { text:'', confidence:'Knowledge Gap', sources:[] };
  const abnormal = recs.flatMap(r=>r.values||[]).filter(v=>v.flag && v.flag!=='normal');
  const text = `${p.name}, ${p.dateOfBirth}, blood group ${p.bloodGroup}. Chronic conditions: ${p.chronicDiseases.join(', ')||'none'}. Critical allergies: ${p.allergies.join(', ')||'none'}. Recent abnormal results: ${abnormal.map(v=>`${v.name} ${v.value} ${v.unit}`).join('; ')||'none'}. Active medications from latest prescriptions: ${db.prescriptions.filter(r=>r.patientId===patientId).flatMap(r=>r.medicines.map(m=>m.name)).join(', ')||'none recorded'}.`;
  return { text, confidence: recs.length>3?'High':'Moderate', sources: recs.slice(0,5).map(r=>r.title) };
}
export function routeForRole(role: Role) { return roleHome(role); }
