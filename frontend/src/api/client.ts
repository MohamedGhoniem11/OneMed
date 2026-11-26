import { loadDB, saveDB, findUserByEmail, DEMO_PASSWORDS, roleHome } from '../data/demo';
import type { Role, User, Session, Patient, MedicalRecord, Prescription, Pharmacy, Institution, Consent, EmergencyProfile, Conversation, Message, Notification, AuditEntry, ChatTurn, EmergencySettings } from '../types';

// Production never uses browser demo data or demo credentials. Development
// defaults to the API too; the browser fixture is opt-in via VITE_API_MODE=demo.
// Unit tests exercise the seeded fixture so the data layer stays covered.
const requestedMode = (import.meta.env.VITE_API_MODE as string | undefined)
  ?? (import.meta.env.MODE === 'test' ? 'demo' : 'api');
export const API_MODE: 'api' | 'demo' = import.meta.env.PROD || requestedMode !== 'demo' ? 'api' : 'demo';
const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

let refreshInFlight: Promise<boolean> | null = null;
async function refreshAccess(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (!res.ok) return false;
        const data = await res.json();
        const session = getSession();
        if (!data.accessToken || !session) return false;
        saveSession({ ...session, token: data.accessToken, expiresAt: data.refreshExpiresAt || session.expiresAt });
        return true;
      } catch { return false; }
      finally { refreshInFlight = null; }
    })();
  }
  return refreshInFlight;
}

async function http<T>(path: string, opts: RequestInit = {}, token?: string, retried = false): Promise<T> {
  const isForm = opts.body instanceof FormData;
  const headers: Record<string,string> = { ...(opts.headers as Record<string,string> || {}) };
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials:'include' });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && token && !retried && await refreshAccess()) {
    const next = getSession()?.token;
    return http<T>(path, opts, next, true);
  }
  if (!res.ok) throw new ApiError(res.status, body.message || body.error || `Request failed (${res.status})`);
  return body as T;
}

const wait = (ms = 220) => new Promise(r => setTimeout(r, ms));
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2,10)}`;

// The REST API stores clinical values as `data` and timestamps as `observedAt`,
// while the UI/demo model uses `values`/`date`. Normalise at the boundary only.
export function normalizeRecord(r: any): any {
  if (!r) return r;
  const raw = r.values ?? r.data?.values;
  const values = Array.isArray(raw) ? raw : (r.data && typeof r.data === 'object'
    ? Object.entries(r.data).map(([name, value]: any) => ({ name, value, unit: '', flag: '' }))
    : []);
  return { ...r, date: r.date || r.observedAt || r.createdAt, institution: r.institution || r.institutionId || '', values };
}
export function normalizePatient(p: any): any {
  if (!p) return p;
  return { ...p, name: p.name || p.fullName || p.id, date: p.date || p.createdAt };
}
export function normalizePharmacy(p: any): any {
  if (!p) return p;
  return { ...p, lat: p.lat ?? p.location?.lat, lng: p.lng ?? p.location?.lng,
    whatsapp: p.whatsapp || p.whatsappPhone || p.whatsapp_number || '' };
}
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
    const map: Record<string,string> = { patients:'/patients', prescriptions:'/prescriptions', pharmacies:'/admin/pharmacies', institutions:'/institutions', consents:'/consents', users:'/users', records:'/records' };
    const path = map[collection as string];
    if (!path) return [] as T[];
    const r = await http<any>(path, {}, getSession()?.token);
    const arr = Array.isArray(r) ? r : (r.items || r.patients || r.prescriptions || r.consents || r.users || r.institutions || r.pharmacies || r.auditLog || []);
    let items = arr as any[];
    if (collection === 'prescriptions') items = items.map(normMeds);
    if (collection === 'patients') items = items.map(normalizePatient);
    if (collection === 'pharmacies') items = items.map(normalizePharmacy);
    if (collection === 'records') items = items.map(normalizeRecord);
    return (filter ? items.filter(filter) : items) as T[];
  }
  await wait(80); const db = loadDB(); return (db[collection] as unknown as T[]).filter(filter || (()=>true));
}
export async function getById<T>(collection: keyof ReturnType<typeof loadDB>, id: string): Promise<T | undefined> {
  const all = await list<any>(collection, x => x.id === id || x.uid === id || x.token === id);
  return all[0] as T | undefined;
}
export async function getPatient(id: string): Promise<Patient | null> {
  if (API_MODE === 'api') {
    const p = await http<any>(`/patients/${id}`, {}, token());
    return normalizePatient(p) as Patient;
  }
  return (await getById<Patient>('patients', id)) ?? null;
}
export async function mutate<T>(fn: (db: ReturnType<typeof loadDB>) => T): Promise<T> {
  const db = loadDB(); const result = fn(db); saveDB(db); await wait(100); return result;
}
/** A fresh link to the current patient's own public emergency page. */
export async function myEmergencyLink(): Promise<string | null> {
  if (API_MODE === 'api') {
    try { const r = await http<any>('/emergency/mine', {}, token()); return r.token ? `/emergency/${r.token}` : null; }
    catch { return null; }
  }
  const p = loadDB().emergencyProfiles.find(x => x.patientId === getSession()?.user.uid);
  return p?.token ? `/emergency/${p.token}` : null;
}

// ---------------- M4 emergency helpers (demo + REST) ----------------
export async function emergencyProfile(tokenValue: string) {
  if (API_MODE === 'api') {
    return http<any>(`/emergency/${tokenValue}`);
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

// ---------------- M5 pharmacy / messaging helpers (demo + REST) ----------------
const normMeds = (p:any) => ({ ...p, date:p.date||p.createdAt, medicines:(p.medicines||p.items||[]).map((m:any)=>({...m,dosage:m.dosage||m.dose||''})) });

export async function extractPrescription(file: File, lang = 'ara+eng') {
  if (API_MODE === 'api') {
    const form = new FormData(); form.append('image', file); form.append('lang', lang);
    return http<any>('/prescriptions/extract', { method:'POST', body:form }, token());
  }
  await wait(500);
  return { rawText:'Amoxicillin 500mg 1x3 5 days\nParacetamol 650mg BID 3 days', ocrConfidence:92, lang,
    items:[{name:'Amoxicillin',dosage:'500mg',frequency:'1x3',duration:'5 days',instructions:'',confidence:97},
           {name:'Paracetamol',dosage:'650mg',frequency:'BID',duration:'3 days',instructions:'',confidence:88}],
    warnings:[], mode:'demo' };
}

export async function createPrescription(payload: any) {
  if (API_MODE === 'api') return normMeds(await http<any>('/prescriptions',{method:'POST',body:JSON.stringify(payload)},token()));
  return mutate(db => { const r:any = { id:uid('rx'), doctorId:getSession()?.user.uid, doctorName:getSession()?.user.name,
    ...payload, status:'pending', extractionStatus:'extracted', date:new Date().toISOString() }; db.prescriptions.push(r); return normMeds(r); });
}

export async function confirmPrescription(id: string, items: any[]) {
  if (API_MODE === 'api') return normMeds(await http<any>(`/prescriptions/${id}/confirm`,{method:'POST',body:JSON.stringify({confirmed:true,items})},token()));
  return mutate(db => { const r:any = db.prescriptions.find(x=>x.id===id); if(!r) throw new ApiError(404,'Prescription not found');
    const tk=`rx-${Math.random().toString(36).slice(2,10)}`; Object.assign(r,{items,medicines:items,status:'confirmed',extractionStatus:'confirmed',linkToken:tk,
      fulfillmentLink:`/f/${tk}`,linkExpiresAt:new Date(Date.now()+86400000).toISOString(),date:new Date().toISOString()}); return normMeds(r); });
}

export async function fulfillmentProfile(linkToken: string, coords?: {lat:number;lng:number}) {
  if (API_MODE === 'api') {
    const q = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : '';
    return http<any>(`/fulfillment/${linkToken}${q}`);
  }
  const db=loadDB(); const rx:any=db.prescriptions.find(x=>x.linkToken===linkToken);
  if(!rx) throw new ApiError(404,'Invalid fulfillment link');
  const pharmacies=db.pharmacies.filter(p=>p.active&&p.status==='approved');
  return { prescription:normMeds(rx), pharmacies };
}

export async function selectPharmacy(linkToken: string, pharmacyId: string) {
  if (API_MODE === 'api') return http<any>(`/fulfillment/${linkToken}/select`,{method:'POST',body:JSON.stringify({pharmacyId})});
  const db=loadDB(); const rx:any=db.prescriptions.find(x=>x.linkToken===linkToken); const p:any=db.pharmacies.find(x=>x.id===pharmacyId);
  if(!rx||!p) throw new ApiError(404,'Not found');
  const text=`Hello ${p.name},\n\n*Medicines:*\n${(rx.medicines||rx.items||[]).map((m:any,i:number)=>`${i+1}. ${m.name} ${m.dosage||m.dose}`).join('\n')}`;
  const url=`https://wa.me/${String(p.whatsapp||'').replace(/\D/g,'')}?text=${encodeURIComponent(text)}`;
  Object.assign(rx,{pharmacyId,orderStatus:'received',whatsappUrl:url}); saveDB(db); return {prescription:normMeds(rx),whatsappUrl:url};
}

export async function pharmacyOrders() {
  if (API_MODE === 'api') { const r=await http<any>('/pharmacy/orders',{},token()); return (r.orders||[]).map(normMeds); }
  return loadDB().prescriptions.filter(p=>p.status==='confirmed'&&p.orderStatus).map(normMeds);
}
export async function advanceOrder(id: string) {
  if (API_MODE === 'api') return normMeds(await http<any>(`/pharmacy/orders/${id}/status`,{method:'PATCH'},token()));
  return mutate(db=>{ const r:any=db.prescriptions.find(x=>x.id===id); const flow=['received','verifying','preparing','ready','handed_over','completed'];
    if(r){const i=flow.indexOf(r.orderStatus||'received');r.orderStatus=flow[Math.min(flow.length-1,i+1)];} return normMeds(r); });
}
export async function pharmacyProfile() {
  if (API_MODE === 'api') { return normalizePharmacy(await http<any>('/pharmacy/profile',{},token())); }
  return loadDB().pharmacies[0]||null;
}
export async function updatePharmacyProfile(id: string, patch: any) {
  if (API_MODE === 'api') return http<any>(`/pharmacy/profile`,{method:'PATCH',body:JSON.stringify({...patch,id})},token());
  return mutate(db=>{ const p:any=db.pharmacies.find(x=>x.id===id); if(p) Object.assign(p,patch); return p; });
}
export async function listConversations() {
  if (API_MODE === 'api') { const r=await http<any>('/messages/conversations',{},token()); return r.conversations||[]; }
  return loadDB().conversations;
}
export async function createConversation(data:any) {
  if (API_MODE === 'api') return http<any>('/messages/conversations',{method:'POST',body:JSON.stringify(data)},token());
  return mutate(db=>{ const c={id:uid('conv'),...data,updatedAt:new Date().toISOString()}; db.conversations.push(c); return c; });
}
export async function listMessages(conversationId:string) {
  if (API_MODE === 'api') { const r=await http<any>(`/messages/conversations/${conversationId}/messages`,{},token()); return r.messages||[]; }
  return loadDB().messages.filter(m=>m.conversationId===conversationId).sort((a:any,b:any)=>String(a.sentAt).localeCompare(String(b.sentAt)));
}
export async function sendMessage(conversationId:string, text:string) {
  if (API_MODE === 'api') return http<any>(`/messages/conversations/${conversationId}/messages`,{method:'POST',body:JSON.stringify({text})},token());
  return mutate(db=>{ const m:any={id:uid('m'),conversationId,senderId:getSession()?.user.uid,text,sentAt:new Date().toISOString()}; db.messages.push(m); return m; });
}
export async function listNotifications() {
  if (API_MODE === 'api') { const r=await http<any>('/notifications',{},token()); return r.items||[]; }
  return loadDB().notifications.filter(n=>n.userId===getSession()?.user.uid).sort((a:any,b:any)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}
export async function markNotificationsRead() {
  if (API_MODE === 'api') return http<any>('/notifications/read-all',{method:'POST'},token());
  return mutate(db=>{db.notifications.filter(n=>n.userId===getSession()?.user.uid).forEach(n=>{n.read=true;});return true;});
}

export async function listRecords(patientId?: string, type?: string): Promise<MedicalRecord[]> {
  if (API_MODE === 'api') {
    const params = new URLSearchParams();
    if (patientId) params.set('patientId', patientId);
    if (type) params.set('type', type);
    const r = await http<{items:any[]}>(`/records${params.size?`?${params}`:''}`, {}, token());
    return r.items.map(normalizeRecord);
  }
  const db = loadDB();
  return db.records.filter(r => (!patientId || r.patientId === patientId) && (!type || r.type === type));
}

export async function searchPatients(q: string): Promise<Patient[]> {
  if (API_MODE === 'api') {
    const r = await http<{patients:any[]}>(`/patients/search?q=${encodeURIComponent(q)}`, {}, token());
    return r.patients.map(normalizePatient);
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
    const r = await http<{items:any[]}>('/records/pending', {}, token());
    return r.items.map(normalizeRecord);
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

export async function resolveNfc(tokenValue: string): Promise<{patientId:string;valid:boolean;emergencyToken?:string;emergencyUrl?:string}> {
  if (API_MODE === 'api') return http<any>(`/nfc/${tokenValue}`);
  const db = loadDB();
  const direct = db.emergencyProfiles.find(x=>x.token===tokenValue || x.nfcUid===tokenValue);
  if (!direct) throw new ApiError(404,'NFC token not found');
  return { patientId:direct.patientId, valid:true, emergencyToken:direct.token };
}

/** Issue (or re-issue) a signed NFC landing link for the signed-in patient. */
export async function issueMyNfc() {
  if (API_MODE === 'api') return http<any>('/nfc', { method:'POST', body:JSON.stringify({ patientId:getSession()?.user.uid }) }, token());
  const p = loadDB().emergencyProfiles.find(x => x.patientId === getSession()?.user.uid);
  return { token: p?.nfcUid || null };
}

export async function myNfc() {
  if (API_MODE === 'api') {
    return http<any>('/nfc/mine', {}, token());
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
/** Patient-scoped, grounded doctor assistant. Never diagnoses or prescribes. */
export async function doctorChat(patientId: string, message: string, language = 'en'): Promise<any> {
  if (API_MODE === 'api') return http<any>(`/analytics/clinical/${patientId}/chat`, { method:'POST', body:JSON.stringify({ message, language }) }, token());
  const p = await getPatient(patientId);
  const reply = await chatbot(message, p || undefined);
  return { ...reply, mode:'demo', isKnowledgeGap: reply.confidence === 'Knowledge Gap' };
}

// ---------------- M6 clinical AI / analytics / reports (demo + REST) ----------------
export type ClinicalSummary = { text:string; confidence:'High'|'Moderate'|'Low'|'Knowledge Gap'; sources:string[]; disclaimer?:string; mode?:string };

function demoValues(r:any):any[] { return Array.isArray(r.values)?r.values:(Array.isArray(r.data?.values)?r.data.values:Object.entries(r.data||{}).map(([name,value]:any)=>({name,value}))); }

export async function clinicalSummary(patientId: string): Promise<ClinicalSummary> {
  if (API_MODE === 'api') return http<ClinicalSummary>(`/analytics/clinical/${patientId}/summary`,{},token());
  const db = loadDB(); const p:any = db.patients.find(x=>x.id===patientId); const recs = db.records.filter(r=>r.patientId===patientId);
  if (!p) return { text:'', confidence:'Knowledge Gap', sources:[] };
  const abnormal = recs.flatMap(demoValues).filter(v=>v.flag && v.flag!=='normal');
  const text = `${p.name}, ${p.dateOfBirth}, blood group ${p.bloodGroup}. Chronic conditions: ${(p.chronicDiseases||[]).join(', ')||'none'}. Critical allergies: ${(p.allergies||[]).join(', ')||'none'}. Recent abnormal results: ${abnormal.map(v=>`${v.name} ${v.value} ${v.unit}`).join('; ')||'none'}. Active medications: ${db.prescriptions.filter(r=>r.patientId===patientId).flatMap((r:any)=>(r.medicines||r.items||[]).map((m:any)=>m.name)).join(', ')||'none recorded'}.\nAI-generated navigation aid only. Not medical advice.`;
  return { text, confidence: recs.length>3?'High':recs.length>1?'Moderate':'Low', sources: recs.slice(0,5).map(r=>r.title), disclaimer:'AI-generated navigation aid only. Not medical advice.', mode:'demo' };
}

export async function patientAnalytics(patientId: string): Promise<any> {
  if (API_MODE === 'api') return http<any>(`/analytics/patient/${patientId}`,{},token());
  const db = loadDB(); const p:any = db.patients.find(x=>x.id===patientId);
  const recs = db.records.filter(r=>r.patientId===patientId);
  const values = recs.flatMap(demoValues);
  const latest = (name:string) => [...values].reverse().find(v=>v.name===name)||null;
  const indicators:any = { hba1c:latest('HbA1c'), systolic:latest('Systolic'), diastolic:latest('Diastolic'), ldl:latest('LDL'), hdl:latest('HDL') };
  const known = Object.values(indicators).filter((v:any)=>v&&typeof v.value==='number') as any[];
  const inRange = known.filter((v:any)=>v.flag!=='high'&&v.flag!=='low').length;
  return { patientId, patientName:p?.name||patientId, generatedAt:new Date().toISOString(), indicators,
    labTrends:recs.map((r:any)=>({date:String(r.date).slice(0,7),...(Object.fromEntries(demoValues(r).map((v:any)=>[v.name,v.value])))})),
    bloodPressure:[], lipidPanel:[], medications:db.prescriptions.filter(r=>r.patientId===patientId).flatMap((r:any)=>(r.medicines||r.items||[]).map((m:any)=>({name:m.name,dosage:m.dosage||m.dose||'',frequency:m.frequency||'',status:r.status}))),
    visits:{}, conditions:p?.chronicDiseases||[], allergies:p?.allergies||[], abnormalCount:values.filter(v=>v.flag==='high'||v.flag==='low').length,
    recordCount:recs.length, healthScore:known.length?Math.round(inRange/known.length*100):0 };
}

export async function populationAnalytics(): Promise<any> {
  if (API_MODE === 'api') return http<any>('/analytics/population',{},token());
  const db = loadDB();
  const cities:Record<string,number> = {}; const conditions:Record<string,number> = {};
  for (const p of db.patients as any[]) { const city=p.city||'unknown'; cities[city]=(cities[city]||0)+1; for(const c of p.chronicDiseases||[]) conditions[c]=(conditions[c]||0)+1; }
  return { generatedAt:new Date().toISOString(), totalPatients:db.patients.length, totalRecords:db.records.length, patientsByCity:cities, conditionCounts:conditions, labAverages:{}, visitsByMonth:{} };
}

export async function auditEntries(): Promise<any[]> {
  if (API_MODE === 'api') { const r=await http<any>('/audit',{},token()); return r.auditLog||[]; }
  return loadDB().audit;
}
export async function verifyAuditChain(): Promise<any> {
  if (API_MODE === 'api') return http<any>('/audit/verify',{},token());
  return { valid:true, count:loadDB().audit.length };
}

// ---------------- Admin / institution management (REST) ----------------
export async function updateMyProfile(patch: any) {
  if (API_MODE === 'api') return http<any>('/users/me', { method:'PATCH', body:JSON.stringify(patch) }, token());
  return mutate(db => { const u:any=db.users.find(x=>x.uid===getSession()?.user.uid); if(u) Object.assign(u,patch); return u; });
}
export async function updateEmergencyContact(contact: any) {
  if (API_MODE === 'api') return http<any>('/patients/me', { method:'PATCH', body:JSON.stringify({ emergencyContacts:[contact] }) }, token());
  return mutate(db => { const p:any=db.patients.find(x=>x.id===getSession()?.user.uid); if(p) p.emergencyContact=contact; return p; });
}
/** Admin edit of an existing user account (REST PATCH / demo fixture). */
export async function updateUserAdmin(id: string, patch: any) {
  if (API_MODE === 'api') return http<any>(`/users/${id}`, { method:'PATCH', body:JSON.stringify(patch) }, token());
  return mutate(db => { const u:any = db.users.find(x=>x.uid===id||(x as any).id===id); if(u) Object.assign(u,patch); return u; });
}
/** Admin role change for an existing user account. */
export async function setUserRoleAdmin(id: string, role: string) {
  if (API_MODE === 'api') return http<any>(`/users/${id}/role`, { method:'PATCH', body:JSON.stringify({ role }) }, token());
  return mutate(db => { const u:any = db.users.find(x=>x.uid===id||(x as any).id===id); if(u) u.role=role; return u; });
}

export async function createStaffAccount(data: any) {
  if (API_MODE === 'api') return http<any>('/auth/staff', { method:'POST', body:JSON.stringify(data) }, token());
  return mutate(db => { const uidValue=uid('user'); db.users.push({ uid:uidValue, ...data, status:'active' }); return { user:{ uid:uidValue, ...data } }; });
}
export async function verifyInstitution(id: string) {
  if (API_MODE === 'api') return http<any>(`/institutions/${id}/verify`, { method:'PATCH', body:JSON.stringify({ verified:true }) }, token());
  return mutate(db => { const i:any=db.institutions.find(x=>x.id===id); if(i){i.verified=true;i.active=true;} return i; });
}
export async function verifyDoctorAccount(id: string) {
  if (API_MODE === 'api') return http<any>(`/doctors/${id}/verify`, { method:'PATCH', body:JSON.stringify({ verified:true }) }, token());
  return mutate(db => { const d:any=(db.doctors as any[]).find(x=>x.uid===id||x.id===id); if(d)d.verified=true; return d; });
}
export async function approvePharmacy(id: string) {
  if (API_MODE === 'api') return http<any>(`/admin/pharmacies/${id}/approve`, { method:'PATCH' }, token());
  return mutate(db => { const p:any=db.pharmacies.find(x=>x.id===id); if(p)p.status='approved'; return p; });
}
export async function createInstitution(data: any) {
  if (API_MODE === 'api') return http<any>('/institutions', { method:'POST', body:JSON.stringify(data) }, token());
  return mutate(db => { const i:any={ id:uid('inst'), ...data, verified:false, active:true }; db.institutions.push(i); return i; });
}
export async function requestDeletion(patientId: string, reason = '') {
  if (API_MODE === 'api') return http<any>(`/patients/${patientId}/deletion`, { method:'POST', body:JSON.stringify({ reason }) }, token());
  return mutate(db => { (db.deletionRequests as any[]).push({ id:uid('del'), patientId, reason, status:'pending', requestedAt:new Date().toISOString(), dueAt:new Date(Date.now()+30*86400000).toISOString() }); return true; });
}
export async function reportIssue(payload: any) {
  if (API_MODE === 'api') return http<any>('/ai/report-issue', { method:'POST', body:JSON.stringify(payload) }, token());
  return true;
}

export async function creditBalance(): Promise<any> {
  if (API_MODE === 'api') { return http<any>('/analytics/credits',{},token()); }
  return { institutionId:'demo', balance:120 };
}

export async function reportText(type: string, opts: { patientId?:string; institutionId?:string } = {}): Promise<string> {
  if (API_MODE === 'api') {
    const params = new URLSearchParams({ format:'text', ...(opts.patientId?{patientId:opts.patientId}:{}) , ...(opts.institutionId?{institutionId:opts.institutionId}:{}) });
    const res = await fetch(`${BASE}/reports/${type}?${params}`, { headers: token()?{Authorization:`Bearer ${token()}`}:{} });
    if (!res.ok) { const e:any = await res.json().catch(()=>({})); throw new ApiError(res.status, e.message||'Report generation failed'); }
    return res.text();
  }
  await wait(200);
  return type==='clinical-summary'?(await clinicalSummary(opts.patientId||'')).text:`OneMed ${type} report preview (demo). Generated ${new Date().toLocaleString()}.`;
}

export async function downloadReport(type: string, opts: { patientId?:string; format?:string; institutionId?:string } = {}): Promise<void> {
  const format = opts.format || 'pdf';
  if (API_MODE === 'api') {
    const params = new URLSearchParams({ format, ...(opts.patientId?{patientId:opts.patientId}:{}) , ...(opts.institutionId?{institutionId:opts.institutionId}:{}) });
    const res = await fetch(`${BASE}/reports/${type}?${params}`, { headers: token()?{Authorization:`Bearer ${token()}`}:{} });
    if (!res.ok) { const e:any = await res.json().catch(()=>({})); throw new ApiError(res.status, e.message||'Report generation failed'); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`onemed-${type}.${format==='fhir'?'fhir.json':format}`; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url); return;
  }
  await wait(300);
  const summary = type==='clinical-summary'?await clinicalSummary(opts.patientId||''):null;
  const body = summary?.text || `OneMed ${type} report. Generated ${new Date().toLocaleString()}. Patient ${opts.patientId||'-'}.`;
  const blob = new Blob([summary?.text?body:`%PDF-1.4\ndemo report\n${body}`],{type:format==='pdf'?'application/pdf':'text/plain'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`onemed-${type}.${format}`; a.click(); URL.revokeObjectURL(url);
}
export function routeForRole(role: Role) { return roleHome(role); }
