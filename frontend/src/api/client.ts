import { loadDB, saveDB, findUserByEmail, DEMO_PASSWORDS, roleHome } from '../data/demo';
import type { Role, User, Session, Patient, MedicalRecord, Prescription, Pharmacy, Institution, Consent, EmergencyProfile, Conversation, Message, Notification, AuditEntry, ChatTurn, EmergencySettings } from '../types';

export const API_MODE = (import.meta.env.VITE_API_MODE as string) || 'demo';
const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function http<T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> {
  const isForm = opts.body instanceof FormData;
  const headers: Record<string,string> = { ...(opts.headers as Record<string,string> || {}) };
  if (!isForm) headers['Content-Type'] = 'application/json';
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
    const r = await http<{ accessToken:string; refreshExpiresAt:string; user:User; mfaRequired?:boolean; mfaToken?:string }>('/auth/login', { method:'POST', body:JSON.stringify({email,password}) });
    if (r.mfaRequired) throw new ApiError(428, 'MFA_REQUIRED:' + r.mfaToken);
    const session: Session = { token:r.accessToken, user:r.user, expiresAt:r.refreshExpiresAt };
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
    const r = await http<{accessToken:string;refreshExpiresAt:string;user:User}>('/auth/mfa/verify', {method:'POST',body:JSON.stringify({mfaToken,code})});
    const s:Session = {token:r.accessToken,user:r.user,expiresAt:r.refreshExpiresAt}; saveSession(s); return s;
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
      if (collection === 'prescriptions') {
        return (arr as any[]).map(p => ({
          ...p,
          medicines: (p.medicines || p.items || []).map((m:any) => ({ ...m, dosage: m.dosage || m.dose || '' })),
        })) as T[];
      }
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
  if (API_MODE === 'api') {
    try {
      const p = await http<any>(`/patients/${id}`, {}, token());
      return { ...p, name: p.name || p.fullName || p.id } as Patient;
    } catch { return null; }
  }
  return (await getById<Patient>('patients', id)) ?? null;
}
export async function mutate<T>(fn: (db: ReturnType<typeof loadDB>) => T): Promise<T> {
  const db = loadDB(); const result = fn(db); saveDB(db); await wait(100); return result;
}
// ---------------- M4 emergency helpers (demo + REST) ----------------
export async function emergencyProfile(tokenValue: string) {
  if (API_MODE === 'api') {
    try { return await http<any>(`/emergency/${tokenValue}`); } catch { return null; }
  }
  const db = loadDB();
  const profile = db.emergencyProfiles.find(p => p.token === tokenValue || p.nfcUid === tokenValue);
  if (!profile) return null;
  const patient = db.patients.find(p => p.id === profile.patientId);
  if (!patient) return null;
  profile.scanCount++; saveDB(db);
  return { visible: {
    patientName: patient.name,
    bloodGroup: profile.settings.showBloodType ? patient.bloodGroup : undefined,
    allergies: profile.settings.showAllergies ? patient.allergies : undefined,
    chronicConditions: profile.settings.showConditions ? patient.chronicDiseases : undefined,
    medications: profile.settings.showMedications ? ['Metformin 500mg - with meals'] : undefined,
    emergencyContacts: profile.settings.showContacts ? [patient.emergencyContact] : undefined,
    primaryPhysician: profile.settings.showContacts ? patient.primaryPhysician : undefined,
  }, settings: profile.settings };
}

export async function emergencyChat(tokenValue: string, message: string, language = 'en') {
  if (API_MODE === 'api') return http<any>(`/emergency/${tokenValue}/chat`, { method:'POST', body:JSON.stringify({ message, language }) });
  const db = loadDB();
  const profile = db.emergencyProfiles.find(p => p.token === tokenValue || p.nfcUid === tokenValue);
  const patient = profile ? db.patients.find(p => p.id === profile.patientId) : undefined;
  const res = await chatbot(message, patient);
  return { text:res.text, confidence:res.confidence, sources:res.sources, disclaimer:res.disclaimer, mode:'demo' };
}

export async function createEmergencyQr() {
  if (API_MODE === 'api') return http<any>('/emergency/qr', { method:'POST' }, token());
  return mutate(db => {
    const p = db.emergencyProfiles.find(x => x.patientId === getSession()?.user.uid);
    return { token:p?.token||`em-${Math.random().toString(36).slice(2,10)}`, url:`${location.origin}/emergency/${p?.token||''}` };
  });
}

export async function updateEmergencyPrivacy(settings: any) {
  if (API_MODE === 'api') return http<any>('/emergency/privacy', { method:'PATCH', body:JSON.stringify(settings) }, token());
  return mutate(db => { const p = db.emergencyProfiles.find(x => x.patientId === getSession()?.user.uid); if(p) Object.assign(p.settings, settings); return p?.settings; });
}

// ---------------- M2/M3 domain helpers (demo + REST) ----------------
const token = () => getSession()?.token;

export async function listRecords(patientId?: string, type?: string): Promise<MedicalRecord[]> {
  if (API_MODE === 'api') {
    const params = new URLSearchParams();
    if (patientId) params.set('patientId', patientId);
    if (type) params.set('type', type);
    try {
      const r = await http<{items:MedicalRecord[]}>(`/records${params.size?`?${params}`:''}`, {}, token());
      return r.items;
    } catch { return []; }
  }
  const db = loadDB();
  return db.records.filter(r => (!patientId || r.patientId === patientId) && (!type || r.type === type));
}

export async function searchPatients(q: string): Promise<Patient[]> {
  if (API_MODE === 'api') {
    try { return (await http<{patients:Patient[]}>(`/patients/search?q=${encodeURIComponent(q)}`, {}, token())).patients; }
    catch { return []; }
  }
  const db = loadDB(); const needle = q.trim().toLowerCase();
  return db.patients.filter(p => !needle || [p.name,p.nationalId,p.phone,p.id].some(v=>String(v||'').toLowerCase().includes(needle)));
}

export async function ingestRecord(file: File, patientId: string, institutionId?: string) {
  if (API_MODE === 'api') {
    const form = new FormData(); form.append('file', file); form.append('patientId', patientId);
    if (institutionId) form.append('institutionId', institutionId);
    return http<any>('/records/ingest', { method:'POST', body:form }, token());
  }
  return mutate(db => {
    const id = uid('r');
    const rec:any = { id, patientId, type:'lab', title:file.name, date:new Date().toISOString(),
      institution:'Local Demo Lab', confidence:100, status:'accessible',
      summary:`Uploaded ${file.name} (demo processing)`, values:[] };
    db.records.push(rec);
    db.notifications.push({ id:uid('n'), userId:patientId, title:'New lab result available', body:file.name, type:'lab', read:false, createdAt:new Date().toISOString() });
    return { record:rec, upload:{ id:uid('u'), encryption:'demo' }, status:'accessible', lifecycle:'accessible', warnings:[] };
  });
}

export async function createManualRecord(payload: any) {
  if (API_MODE === 'api') return http<any>('/records/manual', { method:'POST', body:JSON.stringify(payload) }, token());
  return mutate(db => {
    const rec:any = { id:uid('r'), ...payload, date:payload.observedAt||new Date().toISOString(), status:'accessible', confidence:100 };
    db.records.push(rec); return { record:rec, status:'accessible', lifecycle:'accessible' };
  });
}

export async function reviewRecord(id: string, values: any[], note = '') {
  if (API_MODE === 'api') return http<any>(`/records/${id}/review`, { method:'PATCH', body:JSON.stringify({ values, note }) }, token());
  return mutate(db => { const r:any = db.records.find(x=>x.id===id); if(r){r.status='normal';r.confidence=100;r.reviewed=true;} return r; });
}

export async function pendingRecords(): Promise<MedicalRecord[]> {
  if (API_MODE === 'api') {
    try { return (await http<{items:MedicalRecord[]}>('/records/pending', {}, token())).items; } catch { return []; }
  }
  return loadDB().records.filter(r => r.status === 'needs_review' || r.confidence === undefined || (r.confidence ?? 100) < 80);
}

export async function generateConnectionQr(patientId: string, scope: string[], purpose: string) {
  if (API_MODE === 'api') return http<{token:string;url:string;expiresAt:string;scope:string[]}>('/connect/qr', { method:'POST', body:JSON.stringify({ patientId, scope, purpose }) }, token());
  return mutate(db => {
    const tk = `conn-${Math.random().toString(36).slice(2,10)}`;
    db.connectionQrs.push({ token:tk, doctorId:getSession()?.user.uid||'', doctorName:getSession()?.user.name||'', createdAt:new Date().toISOString(), expiresAt:new Date(Date.now()+900000).toISOString() });
    return { token:tk, url:`${location.origin}/qr/${tk}`, expiresAt:new Date(Date.now()+900000).toISOString(), scope };
  });
}

export async function resolveConnection(tokenValue: string) {
  if (API_MODE === 'api') return http<any>(`/connect/${tokenValue}`);
  const db = loadDB(); const c = db.connectionQrs.find(x=>x.token===tokenValue);
  if (!c || new Date(c.expiresAt).getTime() < Date.now()) throw new ApiError(400, 'Connection QR expired or invalid');
  return { valid:true, doctorName:c.doctorName, scope:['records','prescriptions'], purpose:'QR connection', expiresAt:c.expiresAt, accepted:false };
}

export async function acceptConnection(tokenValue: string) {
  if (API_MODE === 'api') return http<any>(`/connect/${tokenValue}/accept`, { method:'POST' }, token());
  const db = loadDB(); const c = db.connectionQrs.find(x=>x.token===tokenValue);
  if (!c) throw new ApiError(404,'Connection not found');
  db.consents.push({ id:uid('c'), patientId:getSession()?.user.uid||'', granteeType:'doctor', granteeId:c.doctorId||'', granteeName:c.doctorName||'', scope:'records,prescriptions', purpose:'QR connection', active:true, grantedAt:new Date().toISOString() });
  saveDB(db); return { consent:{ id:uid('c') } };
}

export async function issueNfc(patientId: string, nfcUid?: string) {
  if (API_MODE === 'api') return http<any>('/nfc', { method:'POST', body:JSON.stringify({ patientId, nfcUid }) }, token());
  return mutate(db => {
    const p = db.emergencyProfiles.find(x=>x.patientId===patientId);
    if(p){p.nfcIssued=true;p.nfcUid=nfcUid||p.nfcUid||`NTAG424-${Math.random().toString(36).slice(2,8).toUpperCase()}`;}
    return { token:`nfc-demo-${patientId}`, nfcUid:p?.nfcUid, createdAt:new Date().toISOString() };
  });
}

export async function resolveNfc(tokenValue: string) {
  if (API_MODE === 'api') return http<{patientId:string;valid:boolean}>(`/nfc/${tokenValue}`);
  const db = loadDB();
  const direct = db.emergencyProfiles.find(x=>x.token===tokenValue || x.nfcUid===tokenValue);
  if (!direct) throw new ApiError(404,'NFC token not found');
  return { patientId:direct.patientId, valid:true };
}

export async function myNfc() {
  if (API_MODE === 'api') {
    try { return await http<any>('/nfc/mine', {}, token()); } catch { return { issued:false }; }
  }
  const p = loadDB().emergencyProfiles.find(x=>x.patientId===getSession()?.user.uid);
  return p ? { issued:p.nfcIssued, nfcUid:p.nfcUid, scanCount:p.scanCount, lastScanAt:null, createdAt:p.activatedAt } : { issued:false };
}

export async function emergencyOverride(patientId: string, reason: string, ttlMinutes = 15) {
  if (API_MODE === 'api') return http<any>(`/patients/${patientId}/emergency-override`, { method:'POST', body:JSON.stringify({ reason, ttlMinutes }) }, token());
  await mutate(db => { db.audit.push({ id:uid('a'), actor:getSession()?.user.uid||'', actorName:getSession()?.user.name||'', action:'emergency_override', resource:'patient', patientId, timestamp:new Date().toISOString(), ip:'-', hash:'', previousHash:'' }); return true; });
  const p = loadDB().patients.find(x=>x.id===patientId);
  return { patientId, reason, expiresAt:new Date(Date.now()+ttlMinutes*60000).toISOString(), critical:{ bloodGroup:p?.bloodGroup, allergies:p?.allergies||[], chronicDiseases:p?.chronicDiseases||[] } };
}

export async function grantConsent(data: any) {
  if (API_MODE === 'api') return http<any>('/consents', { method:'POST', body:JSON.stringify(data) }, token());
  return mutate(db => { const c = { id:uid('c'), patientId:getSession()?.user.uid||'', ...data, active:true, grantedAt:new Date().toISOString() }; db.consents.push(c); return c; });
}

export async function revokeConsentApi(id: string, reason = '') {
  if (API_MODE === 'api') return http<any>(`/consents/${id}/revoke`, { method:'POST', body:JSON.stringify({ reason }) }, token());
  return mutate(db => { const c:any = db.consents.find(x=>x.id===id); if(c) c.active=false; return c; });
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
