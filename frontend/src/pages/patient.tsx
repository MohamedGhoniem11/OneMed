import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import {
  Activity, AlertTriangle, BarChart3, Bell, CalendarDays, Download, FileText, HeartPulse,
  Pill, QrCode, Settings, ShieldCheck, Trash2, TrendingUp, CheckCircle2, Clock,
} from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Legend, BarChart, Bar,
} from 'recharts';
import * as api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Patient, MedicalRecord, Prescription, Consent, EmergencyProfile, Notification, Conversation, Message, AuditEntry } from '../types';
import { Badge, Card, Empty, Field, Modal, PageHead, Stat, StatusBadge, Tabs, useToast } from '../components/ui';

const RECORD_COLORS:Record<string,string> = { lab:'blue', imaging:'purple', prescription:'green', note:'gray', visit:'blue', vitals:'teal' };

export function PatientDashboard() {
  const { session } = useAuth(); const { t } = useTranslation(); const nav = useNavigate();
  const [patient,setPatient] = useState<Patient|null>(null); const [records,setRecords] = useState<MedicalRecord[]>([]); const [rx,setRx] = useState<Prescription[]>([]);
  useEffect(()=>{ api.getPatient(session!.user.uid).then(setPatient); api.list<MedicalRecord>('records',r=>r.patientId===session!.user.uid).then(a=>setRecords(a.sort((x,y)=>y.date.localeCompare(x.date)))); api.list<Prescription>('prescriptions',r=>r.patientId===session!.user.uid).then(setRx); },[]);
  const abnormal = records.flatMap(r=>r.values||[]).filter(v=>v.flag && v.flag!=='normal');
  return <>
    <PageHead title={`${t('welcomeBack')}, ${patient?.name.split(' ')[0]||session?.user.name.split(' ')[0]}`} subtitle={`${t('dashboard')} — ${new Date().toLocaleDateString()}`} actions={<Link className="btn primary" to="/app/patient/analytics"><BarChart3 size={16}/> {t('analytics')}</Link>}/>
    <div className="grid cols-4">
      <Stat label={t('records')} value={records.length} sub={`${records.filter(r=>r.type==='lab').length} ${t('lab')}`}/>
      <Stat label={t('activeMedications')} value={rx.reduce((a,r)=>a+r.medicines.length,0)}/>
      <Stat label="Blood Group" value={patient?.bloodGroup||'—'}/>
      <Stat label={t('healthScore')} value={<span style={{color:'var(--green)'}}>{Math.max(60,100-abnormal.length*4)}%</span>} sub={t('comprehensiveHealth')}/>
    </div>
    <div className="grid cols-2" style={{marginTop:16}}>
      <Card title={t('clinicalTimeline')} action={<Link className="btn sm outline" to="/app/patient/records">{t('viewAll')}</Link>} pad={false}>
        <div className="card-body"><div className="timeline">{records.slice(0,5).map(r=><div className="timeline-item" key={r.id}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8}}><div><Badge tone={RECORD_COLORS[r.type] as any}>{t(r.type)}</Badge> <strong style={{marginLeft:6}}>{r.title}</strong><div style={{color:'var(--muted)',fontSize:12}}>{r.institution} · {new Date(r.date).toLocaleDateString()}</div></div><Link className="btn sm" to={`/app/patient/records?record=${r.id}`}>{t('view')}</Link></div>
        </div>)}</div>{!records.length && <Empty/>}</div>
      </Card>
      <div className="grid" style={{gap:16}}>
        <Card title={t('criticalAllergies')}><div className="alert red"><AlertTriangle size={16}/> {patient?.allergies.join(', ')||'—'}</div>
          <div style={{marginTop:10,fontSize:13}}><strong>{t('chronicConditions')}:</strong> {patient?.chronicDiseases.join(', ')||'—'}</div></Card>
        <Card title={t('prescriptions')}>{rx.map(r=><div key={r.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--line)'}}><div><strong>{r.medicines.map(m=>m.name).join(', ')}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{r.doctorName} · {new Date(r.date).toLocaleDateString()}</div></div><StatusBadge status={r.orderStatus||r.status}/></div>)}{!rx.length&&<Empty/>}</Card>
        <Card title={t('emergencyQr')}><p style={{color:'var(--muted)'}}>Your QR wearable gives bystanders instant access to approved critical information.</p><Link className="btn primary" to="/app/patient/emergency"><QrCode size={16}/> {t('configure')}</Link></Card>
      </div>
    </div>
  </>;
}

export function PatientRecords() {
  const { session } = useAuth(); const { t } = useTranslation(); const [records,setRecords] = useState<MedicalRecord[]>([]); const [type,setType] = useState('all'); const [q,setQ] = useState('');
  useEffect(()=>{ api.list<MedicalRecord>('records',r=>r.patientId===session!.user.uid).then(a=>setRecords(a.sort((x,y)=>y.date.localeCompare(x.date)))); },[]);
  const filtered = records.filter(r=>(type==='all'||r.type===type) && (!q||`${r.title} ${r.institution}`.toLowerCase().includes(q.toLowerCase())));
  return <><PageHead title={t('records')} subtitle={t('clinicalTimeline')} actions={<button className="btn outline" onClick={()=>window.print()}><Download size={16}/> {t('printRecord')}</button>}/>
    <Card pad><div style={{padding:18,display:'flex',gap:10,flexWrap:'wrap'}}><input className="input" style={{maxWidth:260}} placeholder={t('search')} value={q} onChange={e=>setQ(e.target.value)}/><div className="tabs" style={{border:0,margin:0}}>{['all','lab','imaging','prescription','note','visit','vitals'].map(x=><button key={x} className={`tab ${type===x?'active':''}`} onClick={()=>setType(x)}>{t(x)}</button>)}</div></div>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('type')}</th><th>{t('name')}</th><th>{t('institution')}</th><th>{t('confidenceLabel')}</th><th>{t('status')}</th></tr></thead><tbody>
        {filtered.map(r=><tr key={r.id}><td>{new Date(r.date).toLocaleDateString()}</td><td><Badge tone={RECORD_COLORS[r.type] as any}>{t(r.type)}</Badge></td><td><strong>{r.title}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{r.summary}</div>{r.values?.map(v=><div key={v.name} style={{fontSize:12}}>{v.name}: <strong style={{color:v.flag==='high'?'var(--red)':v.flag==='low'?'var(--amber)':'inherit'}}>{v.value} {v.unit}</strong> <span style={{color:'var(--muted)'}}>({v.referenceLow}–{v.referenceHigh})</span></div>)}</td><td>{r.institution}</td><td>{r.confidence?`${r.confidence}%`:'—'}</td><td><StatusBadge status={r.status||'accessible'}/></td></tr>)}
      </tbody></table>{!filtered.length&&<Empty/>}</div>
    </Card>
  </>;
}

export function PatientAnalytics() {
  const { session } = useAuth(); const { t } = useTranslation(); const [records,setRecords] = useState<MedicalRecord[]>([]);
  useEffect(()=>{ api.list<MedicalRecord>('records',r=>r.patientId===session!.user.uid).then(setRecords); },[]);
  const series = useMemo(()=>{
    const a1c = records.filter(r=>r.values?.some(v=>v.name==='HbA1c')).map(r=>({date:new Date(r.date).toLocaleDateString('en',{month:'short'}),value:r.values!.find(v=>v.name==='HbA1c')!.value,low:4,high:5.6}));
    const bp = records.filter(r=>r.values?.some(v=>v.name==='Systolic')).map(r=>({date:new Date(r.date).toLocaleDateString('en',{month:'short'}),systolic:r.values!.find(v=>v.name==='Systolic')!.value,diastolic:r.values!.find(v=>v.name==='Diastolic')!.value}));
    return {a1c,bp};
  },[records]);
  const latest = (name:string)=>records.flatMap(r=>r.values||[]).filter(v=>v.name===name).sort((a,b)=>0)[0];
  const status = (v:any)=>!v?'—':v.flag==='high'?'red':v.flag==='low'?'amber':'green';
  return <><PageHead title={t('patientAnalytics')} subtitle={t('comprehensiveHealth')} actions={<button className="btn outline" onClick={()=>window.print()}><Download size={16}/> {t('exportPdf')}</button>}/>
    <div className="grid cols-4"><Card><div className="stat"><span className="value">27.4 <Badge tone="amber">↑ 0.5</Badge></span><span className="label">BMI</span></div></Card>
      <Card><div className="stat"><span className="value">{(series.a1c[series.a1c.length-1])?.value||'—'}%</span><span className="label">HbA1c</span></div></Card>
      <Card><div className="stat"><span className="value">92 <span style={{fontSize:12}}>mL/min</span></span><span className="label">eGFR</span></div></Card>
      <Card><div className="stat"><span className="value" style={{color:'var(--red)'}}>12.4</span><span className="label">CRP — HIGH</span></div></Card></div>
    <div className="grid cols-2" style={{marginTop:16}}>
      <Card title={t('bloodPressure')}><ResponsiveContainer width="100%" height={240}><LineChart data={series.bp}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[50,170]}/><Tooltip/><Legend/><ReferenceArea y1={90} y2={120} fill="#e7f6f3" fillOpacity={.5}/><Line type="monotone" dataKey="systolic" stroke="#002657" strokeWidth={2.5}/><Line type="monotone" dataKey="diastolic" stroke="#0f9d6e" strokeWidth={2.5}/></LineChart></ResponsiveContainer></Card>
      <Card title={t('labTrends') + ' — HbA1c'}><ResponsiveContainer width="100%" height={240}><LineChart data={series.a1c}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[4,9]}/><Tooltip/><Legend/><ReferenceArea y1={4} y2={5.6} fill="#e7f7ef" fillOpacity={.7}/><Line type="monotone" dataKey="value" stroke="#d99219" strokeWidth={2.5}/></LineChart></ResponsiveContainer></Card>
    </div>
    <Card title={t('medicationTimeline')} style={{marginTop:16}}><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('medicine')}</th><th>{t('dosage')}</th><th>{t('status')}</th></tr></thead><tbody><tr><td>Lisinopril 10mg</td><td>Once daily</td><td><Badge tone="green">Ongoing · 95%</Badge></td></tr><tr><td>Atorvastatin 20mg</td><td>At evening</td><td><Badge tone="green">Started Aug 15</Badge></td></tr><tr><td>Amoxicillin 500mg</td><td>BID</td><td><Badge tone="gray">Complete</Badge></td></tr></tbody></table></div></Card>
    <Card title={t('conditionSummary')} style={{marginTop:16}}><div className="grid cols-4">{[{label:'Type 2 Diabetes',tone:'red'},{label:'Hypertension',tone:'amber'},{label:`HbA1c ${latest('HbA1c')?.value||''}`,tone:status(latest('HbA1c'))},{label:`BP ${latest('Systolic')?.value||''}/${latest('Diastolic')?.value||''}`,tone:status(latest('Systolic'))}].map((c,i)=><div key={i} className="alert" style={{background:'#fff',padding:12}}><Badge tone={c.tone as any}>{c.label}</Badge></div>)}</div></Card>
  </>;
}

export function PatientPrescriptions() {
  const { session } = useAuth(); const { t } = useTranslation(); const [rx,setRx] = useState<Prescription[]>([]); const {toast}=useToast();
  useEffect(()=>{ api.list<Prescription>('prescriptions',r=>r.patientId===session!.user.uid).then(setRx); },[]);
  return <><PageHead title={t('prescriptions')} subtitle="Doctor-confirmed digital prescriptions"/>
    <Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('doctor')}</th><th>{t('extractedMedicines')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>
      {rx.map(r=><tr key={r.id}><td>{new Date(r.date).toLocaleDateString()}</td><td>{r.doctorName}</td><td>{r.medicines.map(m=>`${m.name} ${m.dosage}`).join(', ')}</td><td><StatusBadge status={r.orderStatus||r.status}/></td><td><Link className="btn sm primary" to={`/f/${r.linkToken||'rx-demo-8f3a'}`}>{t('orderStatus')}</Link></td></tr>)}
    </tbody></table>{!rx.length&&<Empty/>}</div></Card></>;
}

export function PatientConsents() {
  const { session } = useAuth(); const { t } = useTranslation(); const [list,setList] = useState<Consent[]>([]); const {toast}=useToast();
  const load = ()=>api.list<Consent>('consents',c=>c.patientId===session!.user.uid).then(setList); useEffect(()=>{void load();},[]);
  const toggle = async (c:Consent)=>{ await api.mutate(db=>{const x=db.consents.find(y=>y.id===c.id); if(x) x.active=!x.active;}); toast(c.active?t('revoke'):t('grant')); void load(); };
  return <><PageHead title={t('dataPrivacy')} subtitle="Control who can access your medical record. Changes are audit logged."/>
    <Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('role')}</th><th>Scope</th><th>Purpose</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>
      {list.map(c=><tr key={c.id}><td>{c.granteeName}</td><td>{t(c.granteeType)}</td><td>{c.scope}</td><td>{c.purpose}</td><td><StatusBadge status={c.active?'active':'revoked'}/></td><td><button className="btn sm outline" onClick={()=>void toggle(c)}>{c.active?t('revoke'):t('grant')}</button></td></tr>)}
    </tbody></table>{!list.length&&<Empty/>}</div></Card>
    <Card title="Your data rights" style={{marginTop:16}}><p style={{color:'var(--muted)'}}>You may download all your data or request complete deletion within 30 days (EDP compliance).</p><div style={{display:'flex',gap:8}}><button className="btn outline" onClick={()=>toast('Data export queued (demo)')}><Download size={16}/> {t('download')} JSON</button><button className="btn danger" onClick={()=>{ api.mutate(db=>{db.deletionRequests.push({id:`del_${Date.now()}`,patientId:session!.user.uid,requestedAt:new Date().toISOString(),status:'pending'});}); toast('Deletion request recorded — completed within 30 days'); }}><Trash2 size={16}/> Request deletion</button></div></Card>
  </>;
}

export function PatientEmergencyConfig() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast();
  const [profile,setProfile] = useState<EmergencyProfile|null>(null); const [qr,setQr] = useState(''); const [tab,setTab]=useState('settings');
  useEffect(()=>{ api.list<EmergencyProfile>('emergencyProfiles',p=>p.patientId===session!.user.uid).then(a=>{ const p=a[0]; setProfile(p||null); if(p) QRCode.toDataURL(`${location.origin}/emergency/${p.token}`).then(setQr); }); },[]);
  const toggle = (k:keyof EmergencyProfile['settings'])=>{ if(!profile) return; const next={...profile,settings:{...profile.settings,[k]:!profile.settings[k]}}; setProfile(next); api.mutate(db=>{const p=db.emergencyProfiles.find(x=>x.token===profile.token); if(p) p.settings[k]=next.settings[k];}); };
  const fields:[keyof EmergencyProfile['settings'],string][] = [['showBloodType',t('bloodGroup')],['showAllergies',t('allergies')],['showConditions',t('chronicConditions')],['showMedications',t('currentMedications')],['showContacts',t('emergencyContact')],['aiChatbotEnabled',t('askAi')]];
  return <><PageHead title={t('emergencyQr')} subtitle="Choose what bystanders see when they scan your QR wearable."/>
    <Tabs tabs={[{id:'settings',label:t('settings')},{id:'qr',label:'QR / NFC'}]} active={tab} onChange={setTab}/>
    {tab==='settings'?<Card title={t('dataPrivacy')}>{fields.map(([k,label])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--line)'}}><strong>{label}</strong><button className={`btn sm ${profile?.settings[k]?'primary':'outline'}`} onClick={()=>toggle(k)}>{profile?.settings[k]?t('yes'):t('no')}</button></div>)}<p className="disclaimer" style={{marginTop:14}}>Full medical records stay behind authentication. Network and scan logs are kept for security.</p></Card>
    :<div className="grid cols-2"><Card title="Emergency QR"><div style={{textAlign:'center'}}>{qr?<img src={qr} alt="Emergency QR" style={{width:200,height:200}}/>:<div className="empty">Generating…</div>}<div className="disclaimer" style={{marginTop:12}}>{location.origin}/emergency/{profile?.token}</div><a className="btn primary" style={{marginTop:12}} href={qr} download="onemed-emergency-qr.png"><Download size={16}/> {t('downloadQr')}</a></div></Card>
      <Card title="NFC Wristband"><p style={{color:'var(--muted)'}}>NTAG 424 DNA wristband linked to this profile.</p><dl style={{lineHeight:2}}><dt style={{color:'var(--muted)'}}>Status</dt><dd>{profile?.nfcIssued?t('active'):'Not issued'}</dd><dt style={{color:'var(--muted)'}}>UID</dt><dd>{profile?.nfcUid||'—'}</dd><dt style={{color:'var(--muted)'}}>{t('scanQr')}</dt><dd>{profile?.scanCount||0}</dd></dl><Link className="btn outline" to={`/nfc/${profile?.token}`}>{t('view')} NFC page</Link></Card></div>}
  </>;
}

export function PatientMessages() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast();
  const [convs,setConvs]=useState<Conversation[]>([]); const [active,setActive]=useState<string|null>(null); const [msgs,setMsgs]=useState<Message[]>([]); const [text,setText]=useState('');
  useEffect(()=>{ api.list<Conversation>('conversations',c=>c.patientId===session!.user.uid).then(a=>{setConvs(a);setActive(a[0]?.id||null);}); },[]);
  useEffect(()=>{ if(active) api.list<Message>('messages',m=>m.conversationId===active).then(a=>setMsgs(a.sort((x,y)=>x.sentAt.localeCompare(y.sentAt)))); },[active]);
  const send=async()=>{ if(!text.trim()||!active) return; await api.mutate(db=>{db.messages.push({id:`m_${Date.now()}`,conversationId:active,senderId:session!.user.uid,text,sentAt:new Date().toISOString()});}); setText(''); api.list<Message>('messages',m=>m.conversationId===active).then(a=>setMsgs(a.sort((x,y)=>x.sentAt.localeCompare(y.sentAt)))); };
  return <><PageHead title={t('messages')} subtitle="Secure in-app conversations with your care team."/>
    <div className="grid" style={{gridTemplateColumns:'280px 1fr'}}><Card pad><div className="card-body">{convs.map(c=><button key={c.id} className={`nav-item ${active===c.id?'active':''}`} style={{color:'var(--ink)'}} onClick={()=>setActive(c.id)}><span className="avatar">{c.otherName.slice(0,2).toUpperCase()}</span><span><strong>{c.otherName}</strong><div style={{fontSize:11,color:'var(--muted)'}}>{t(c.role)}</div></span></button>)}{!convs.length&&<Empty/>}</div></Card>
      <Card pad={false}><div className="card-head"><h3>{convs.find(c=>c.id===active)?.otherName||'—'}</h3></div><div className="card-body"><div className="chat-log">{msgs.map(m=><div key={m.id} className={`msg ${m.senderId===session!.user.uid?'me':''}`}>{m.text}<div style={{fontSize:10,opacity:.6,marginTop:4}}>{new Date(m.sentAt).toLocaleTimeString()}</div></div>)}</div><div style={{display:'flex',gap:8,marginTop:12}}><input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message…" onKeyDown={e=>{if(e.key==='Enter')void send();}}/><button className="btn primary" onClick={()=>void send()}><Pill size={16}/> Send</button></div></div></Card></div>
  </>;
}

export function PatientNotifications() {
  const { session } = useAuth(); const { t } = useTranslation(); const [list,setList]=useState<Notification[]>([]);
  useEffect(()=>{ api.list<Notification>('notifications',n=>n.userId===session!.user.uid).then(a=>setList(a.sort((x,y)=>y.createdAt.localeCompare(x.createdAt)))); },[]);
  return <><PageHead title={t('notifications')} subtitle="Lab results, prescriptions and messages."/>
    <Card pad><div className="card-body">{list.map(n=><div key={n.id} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid var(--line)'}}><span className="avatar"><Bell size={16}/></span><div style={{flex:1}}><strong>{n.title}</strong><div>{n.body}</div><div style={{fontSize:11,color:'var(--muted)'}}>{new Date(n.createdAt).toLocaleString()}</div></div>{!n.read&&<Badge tone="blue">new</Badge>}</div>)}{!list.length&&<Empty/>}</div></Card></>;
}

export function PatientSettings() {
  const { session } = useAuth(); const { t } = useTranslation(); const {setUser}=useAuth(); const {toast}=useToast();
  const [form,setForm]=useState<any>({...session!.user});
  return <><PageHead title={t('profile')} subtitle={t('clinicalIdentity')}/>
    <div className="grid cols-2"><Card title={t('personalInformation')}><Field label={t('name')}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label={t('phoneNumber')}><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label={t('email')}><input className="input" value={form.email} disabled/></Field><button className="btn navy" onClick={async()=>{await api.mutate(db=>{const u=db.users.find(x=>x.uid===form.uid); if(u){u.name=form.name;u.phone=form.phone;}});setUser(form);toast(t('saved'));}}>{t('save')}</button></Card>
      <Card title={t('emergencyContact')}><Field label={t('name')}><input className="input" dir="rtl" value={form.emergencyContact?.name||''} onChange={e=>setForm({...form,emergencyContact:{...form.emergencyContact,name:e.target.value}})}/></Field><Field label={t('phoneNumber')}><input className="input" value={form.emergencyContact?.phone||''} onChange={e=>setForm({...form,emergencyContact:{...form.emergencyContact,phone:e.target.value}})}/></Field><Field label={t('relationship')}><input className="input" value={form.emergencyContact?.relationship||''} onChange={e=>setForm({...form,emergencyContact:{...form.emergencyContact,relationship:e.target.value}})}/></Field><button className="btn navy" onClick={()=>toast(t('saved'))}>{t('save')}</button></Card></div>
  </>;
}
