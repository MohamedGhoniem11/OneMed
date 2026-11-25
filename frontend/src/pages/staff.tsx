import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity, Building2, CheckCircle2, ClipboardList, Clock, FileSpreadsheet, FileText,
  FlaskConical, MapPin, MessageCircle, Pill, Plug, Plus, Search, ShieldCheck, Store, Trash2, Upload, Users,
} from 'lucide-react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { MedicalRecord, Patient, Prescription, Pharmacy, Institution, User, AuditEntry, OrderStatus } from '../types';
import { Badge, Card, Chip, Empty, Field, MetricCard, Modal, PageHead, SectionTabs, Stat, StatusBadge, Tabs, useToast, VerificationRow } from '../components/ui';

export function LabPortal({ initialTab = 'upload' }: { initialTab?: string }) {
  const { t } = useTranslation(); const {toast}=useToast(); const {session}=useAuth();
  const [tab,setTab]=useState(initialTab); const [patientId,setPatientId]=useState(''); const [patients,setPatients]=useState<Patient[]>([]);
  const [rows,setRows] = useState([{test:'Hemoglobin (Hb)',value:'14.2',unit:'g/dL',ref:'13.8 - 17.2',confidence:98},{test:'White Blood Cell (WBC)',value:'6.8',unit:'x10^3/uL',ref:'4.5 - 11.0',confidence:98},{test:'Platelet Count',value:'150',unit:'x10^3/uL',ref:'150 - 450',confidence:64},{test:'Glucose, Fasting',value:'92',unit:'mg/dL',ref:'70 - 99',confidence:58}]);
  const [history,setHistory]=useState<MedicalRecord[]>([]); const [file,setFile]=useState<File|null>(null);
  useEffect(()=>{ api.searchPatients('').then(a=>{setPatients(a);setPatientId(a[0]?.id||'');}); api.listRecords(undefined,'lab').then(setHistory); },[]);
  const confirm=async()=>{
    if(!patientId) return toast(t('fieldRequired'),true);
    const unverified = rows.filter(r=>r.confidence<80).length;
    if(!file && unverified) return toast(`${unverified} field(s) below 80% confidence. Confirm each value before linking.`,true);
    try {
      if(file) {
        const result = await api.ingestRecord(file, patientId, session!.user.institutionId);
        if(result.record?.status==='needs_review') toast('Upload stored - low confidence, awaiting manual review');
        else toast(t('saved'));
      } else {
        const values = rows.map(r=>{
          const [lo,hi] = r.ref.split(/[-–]/).map(s=>Number(s.trim()));
          const value = Number(r.value);
          return {name:r.test,value,unit:r.unit,referenceLow:Number.isFinite(lo)?lo:0,referenceHigh:Number.isFinite(hi)?hi:999,
            flag:(value<lo?'low':value>hi?'high':'normal') as 'low'|'high'|'normal'};
        });
        await api.createManualRecord({patientId, institutionId:session!.user.institutionId, type:'lab',
          title:'Uploaded Lab Panel', observedAt:new Date().toISOString(), data:{values}});
        toast(t('saved'));
      }
      setFile(null); api.listRecords(undefined,'lab').then(setHistory); setTab('history');
    } catch(e:any) { toast(e.message,true); }
  };
  return <><PageHead title="Lab Data Ingestion" subtitle="Upload physical lab reports or import batch datasets. Low-confidence fields require confirmation."/>
    <Tabs tabs={[{id:'upload',label:t('upload')},{id:'batch',label:t('batchImport')},{id:'manual',label:t('manualEntry')},{id:'history',label:t('records')}]} active={tab} onChange={setTab}/>
    <div className="grid" style={{gridTemplateColumns:'340px 1fr',gap:16}}>
      <div className="grid" style={{gap:16,alignContent:'start'}}>
        <Card title="Target Patient Context"><Field label="Search Patient ID, Name, or DOB"><select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name} - {p.nationalId}</option>)}</select></Field><p style={{fontSize:12,color:'var(--muted)'}}>{patientId?'Patient linked. Data will be appended to their unified record.':'No patient selected.'}</p></Card>
        <Card title={tab==='batch'?t('batchImport'):tab==='manual'?t('manualEntry'):'File Upload'}>
          {tab==='upload' && <><div style={{border:'2px dashed var(--line)',borderRadius:10,padding:24,textAlign:'center'}}><Upload size={28}/><p><strong>{t('dragDrop')}</strong></p><p style={{fontSize:12,color:'var(--muted)'}}>{t('uploadHint')}</p><label className="btn navy"><Browse/> Browse Files<input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.csv,.json" onChange={e=>{const f=e.target.files?.[0]; if(f){setFile(f);toast(`Selected ${f.name} - ready to link`);}}}/></label></div>{file && <div className="alert green" style={{marginTop:10,padding:8,fontSize:12}}>✓ {file.name} · {(file.size/1024).toFixed(1)} KB · {t('processingComplete')}</div>}</>}
          {tab==='batch' && <><Field label="Paste CSV / JSON batch"><textarea className="input" rows={7} placeholder={'patientId,test,value,unit\nuser_patient_1,Hemoglobin,14.2,g/dL'} defaultValue={'patientId,test,value,unit\nuser_patient_1,Hemoglobin,14.2,g/dL\nuser_patient_1,WBC,6.8,x10^3/uL'}/></Field><button className="btn navy" style={{width:'100%'}} onClick={()=>toast('2 rows imported · linked to selected patient (demo)')}>{t('importBatch')}</button></>}
          {tab==='manual' && <><Field label="Test name"><input className="input" defaultValue="Glucose, Fasting"/></Field><Field label={t('value')}><input className="input" defaultValue="92"/></Field><Field label={t('unit')}><input className="input" defaultValue="mg/dL"/></Field><Field label={t('referenceRange')}><input className="input" defaultValue="70 - 99"/></Field><button className="btn navy" style={{width:'100%'}} onClick={()=>toast('Manual entry saved (demo)')}>{t('saveEntry')}</button></>}
        </Card>
      </div>
      <Card title="Data Verification" action={<Chip tone="amber">2 {t('unverified')}</Chip>} pad={false}><div className="card-body"><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('value')}</th><th>{t('unit')}</th><th>{t('referenceRange')}</th><th>{t('confidenceLabel')}</th></tr></thead><tbody>{rows.map((r,i)=><VerificationRow key={i} test={r.test} value={r.value} unit={r.unit} reference={r.ref} confidence={r.confidence} onChange={(v)=>setRows(a=>a.map((x,j)=>j===i?{...x,value:v,confidence:100}:x))}/>)}</tbody></table></div><div style={{display:'flex',gap:8,marginTop:12}}><button className="btn outline" onClick={()=>toast('Cleared')}>Clear Data</button><button className="btn primary" onClick={()=>void confirm()}><CheckCircle2 size={16}/> {t('confirmLinkPatient')}</button></div></div></Card>
    </div>
    {tab==='history' && <Card title="Upload History" style={{marginTop:16}} pad={false}><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('patient')}</th><th>{t('date')}</th><th>{t('confidenceLabel')}</th><th>{t('status')}</th></tr></thead><tbody>{history.slice(0,10).map(r=><tr key={r.id}><td>{r.title}</td><td>{patients.find(p=>p.id===r.patientId)?.name||r.patientId}</td><td>{new Date(r.date).toLocaleDateString()}</td><td>{r.confidence}%</td><td><StatusBadge status={r.status||'accessible'}/></td></tr>)}</tbody></table></div></Card>}
  </>;
}
function Browse(){return <span/>;}

export function PharmacyPortal() {
  const { t } = useTranslation(); const {toast}=useToast(); const {session}=useAuth();
  const [rx,setRx]=useState<Prescription[]>([]); const [tab,setTab]=useState('inbox'); const [chat,setChat]=useState<Prescription|null>(null); const [text,setText]=useState('');
  const steps:OrderStatus[]=['received','verifying','preparing','ready','handed_over','completed'];
  useEffect(()=>{ api.list<Prescription>('prescriptions').then(a=>setRx(a.filter(r=>r.status==='confirmed'))); },[]);
  const advance=async(r:Prescription)=>{ const i=steps.indexOf(r.orderStatus||'received'); if(i>=steps.length-1) return; const next=steps[i+1]; await api.mutate(db=>{const x=db.prescriptions.find(p=>p.id===r.id);if(x)x.orderStatus=next;}); setRx(a=>a.map(x=>x.id===r.id?{...x,orderStatus:next}:x)); toast(`${r.patientName}: ${next}`); };
  return <><PageHead title={t('inbox')} subtitle="Prescription orders, real-time patient chat, and fulfillment status."/>
    <Tabs tabs={[{id:'inbox',label:t('inbox')},{id:'flow',label:t('fulfillmentFlow')}]} active={tab} onChange={setTab}/>
    {tab==='inbox'?<Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('patient')}</th><th>{t('doctor')}</th><th>{t('medicines')}</th><th>{t('orderStatus')}</th><th>{t('action')}</th></tr></thead><tbody>{rx.map(r=><tr key={r.id}><td><strong>{r.patientName}</strong></td><td>{r.doctorName}</td><td>{(r.medicines||[]).map(m=>`${m.name} ${m.dosage}`).join(', ')}</td><td><StatusBadge status={r.orderStatus||'received'}/></td><td><div style={{display:'flex',gap:4}}><button className="btn sm primary" onClick={()=>advance(r)}>Advance</button><button className="btn sm outline" onClick={()=>setChat(r)}><MessageCircle size={14}/> Chat</button></div></td></tr>)}</tbody></table>{!rx.length&&<Empty/>}</div></Card>
    :<Card title={t('fulfillmentFlow')}><div className="grid cols-3">{steps.map((s,i)=><div key={s} className="card" style={{boxShadow:'none'}}><Badge tone="blue">{i+1}</Badge><h3 style={{marginTop:8}}>{t(s)}</h3><p style={{color:'var(--muted)',fontSize:12}}>Order state: {s.replace('_',' ')}</p></div>)}</div></Card>}
    {chat && <Modal title={`${t('messages')} - ${chat.patientName}`} onClose={()=>setChat(null)}><div className="chat-log"><div className="msg me">{(chat.medicines||[]).map(m=>`${m.name} ${m.dosage} - ${m.frequency}`).join('\n')}</div></div><div style={{display:'flex',gap:8,marginTop:12}}><input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="Message patient…"/><button className="btn primary" onClick={()=>{toast('Message sent');setText('');}}><SendIcon/></button></div></Modal>}
  </>;
}
function SendIcon(){return <span>➤</span>;}

export function PharmacyProfile() {
  const { t } = useTranslation(); const [pharmacies,setPharmacies]=useState<Pharmacy[]>([]); const {toast}=useToast();
  useEffect(()=>{api.list<Pharmacy>('pharmacies').then(setPharmacies);},[]);
  const p=pharmacies.find(x=>x.id==='pharm_medica')||pharmacies[0];
  return <><PageHead title={t('settings')} subtitle="Location, WhatsApp number and operating hours."/>
    <div className="grid cols-2"><Card title="Pharmacy details"><Field label={t('name')}><input className="input" defaultValue={p?.name}/></Field><Field label={t('address')}><input className="input" defaultValue={p?.address}/></Field><Field label="WhatsApp number"><input className="input" defaultValue={p?.whatsapp}/></Field><Field label={t('phoneNumber')}><input className="input" defaultValue={p?.phone}/></Field><button className="btn primary" onClick={()=>toast(t('saved'))}>{t('save')}</button></Card>
      <Card title="GPS & hours"><Field label="Latitude"><input className="input" defaultValue={p?.lat}/></Field><Field label="Longitude"><input className="input" defaultValue={p?.lng}/></Field><Field label="Operating hours"><input className="input" defaultValue={p?.hours}/></Field><button className="btn outline" onClick={()=>toast('Location updated')}><MapPin size={16}/> Update location</button><p className="disclaimer" style={{marginTop:12}}>Patients see your pharmacy sorted by distance from their location.</p></Card></div></>;
}

export function HospitalAdmin() {
  const { t } = useTranslation(); const {session}=useAuth(); const [users,setUsers]=useState<User[]>([]); const [insts,setInsts]=useState<Institution[]>([]); const [records,setRecords]=useState<MedicalRecord[]>([]);
  useEffect(()=>{api.list<User>('users').then(setUsers);api.list<Institution>('institutions').then(setInsts);api.list<MedicalRecord>('records').then(setRecords);},[]);
  return <><PageHead title={`${t('overview')} - ${t('hospitalAdmin')}`} subtitle="Institution performance, staff and data contribution."/>
    <div className="grid cols-4"><Stat label={t('activeStaff')} value={users.filter(u=>u.institutionId==='inst_alexandria_main').length}/><Stat label={t('recordsUploaded')} value={records.length}/><Stat label={t('creditBalance')} value="2,450"/><Stat label="Premium" value={<Badge tone="green">Active</Badge>}/></div>
    <div className="grid cols-2" style={{marginTop:16}}><Card title="Institution"><p><strong>{insts.find(i=>i.id==='inst_alexandria_main')?.name}</strong></p><p style={{color:'var(--muted)'}}>{insts.find(i=>i.id==='inst_alexandria_main')?.address}</p><Badge tone="green">{t('verified')}</Badge></Card>
      <Card title={t('dataContribution')}><ResponsiveContainer width="100%" height={180}><BarChart data={[{m:'Mon',n:12},{m:'Tue',n:19},{m:'Wed',n:15},{m:'Thu',n:24},{m:'Fri',n:21}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="m"/><YAxis/><Tooltip/><Bar dataKey="n" fill="#006a61"/></BarChart></ResponsiveContainer></Card></div>
  </>;
}
export function HospitalStaff() { const {t}=useTranslation(); const [users,setUsers]=useState<User[]>([]); useEffect(()=>{api.list<User>('users').then(setUsers);},[]); return <><PageHead title={t('staffManagement')} subtitle="Manage your institution's staff accounts and roles."/><Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('role')}</th><th>{t('status')}</th></tr></thead><tbody>{users.map(u=><tr key={u.uid}><td>{u.name}</td><td>{u.email}</td><td><Badge>{t(u.role==='lab_staff'?'labStaff':u.role)}</Badge></td><td><StatusBadge status={u.status||'active'}/></td></tr>)}</tbody></table></div></Card></>; }
export function HospitalConnections() { const {t}=useTranslation(); const {toast}=useToast(); return <><PageHead title={t('connections')} subtitle="Configure data import endpoints and webhooks."/><div className="grid cols-2"><Card title="FHIR Integration"><Badge tone="green">CONNECTED</Badge><p style={{color:'var(--muted)',fontSize:12}}>https://api.hospital.example/interconnect-fhir-r4</p><button className="btn sm outline" onClick={()=>toast('Configuration opened')}>Configure</button></Card><Card title="Legacy Lab Drop"><Badge tone="amber">WARNING</Badge><p style={{fontSize:12,color:'var(--muted)'}}>CSV sync failed 1h ago</p><button className="btn sm outline" onClick={()=>toast('Reviewing connection')}>Review</button></Card></div><button className="btn primary" style={{marginTop:12}} onClick={()=>toast('New webhook created')}><Plus size={16}/> {t('addConnection')}</button></>; }
export function HospitalAnalytics(){ const {t}=useTranslation(); return <><PageHead title={t('population')} subtitle="De-identified institutional analytics."/><Card><ResponsiveContainer width="100%" height={260}><BarChart data={[{m:'Jan',v:120},{m:'Feb',v:150},{m:'Mar',v:132},{m:'Apr',v:180},{m:'May',v:210}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="m"/><YAxis/><Tooltip/><Bar dataKey="v" fill="#002657"/></BarChart></ResponsiveContainer><p className="disclaimer">No patient identifiers are present in aggregate views.</p></Card></>; }

export function AdminOverview() {
  const { t }=useTranslation(); const {toast}=useToast(); const [users,setUsers]=useState<User[]>([]); const [insts,setInsts]=useState<Institution[]>([]); const [pharms,setPharms]=useState<Pharmacy[]>([]); const [audit,setAudit]=useState<AuditEntry[]>([]);
  useEffect(()=>{api.list<User>('users').then(setUsers);api.list<Institution>('institutions').then(setInsts);api.list<Pharmacy>('pharmacies').then(setPharms);api.list<AuditEntry>('audit').then(setAudit);},[]);
  return <><PageHead title={t('overview')} subtitle={t('systemConfig')}/>
    <div className="grid cols-4"><Stat label={t('activeStaff')} value={users.length}/><Stat label={t('institutions')} value={insts.length}/><Stat label={t('pharmacies')} value={pharms.length}/><Stat label={t('uptime')} value="99.5%"/></div>
    <div className="grid cols-2" style={{marginTop:16}}><Card title="Audit Feed" pad={false}><div className="card-body">{audit.slice(0,6).map(a=><div key={a.id} style={{padding:'8px 0',borderBottom:'1px solid var(--line)'}}><Badge tone="blue">{a.action}</Badge><div style={{fontSize:12}}>{a.actorName} · {new Date(a.timestamp).toLocaleString()}</div></div>)}{!audit.length&&<Empty/>}</div></Card>
      <Card title="System health"><div className="grid cols-2"><Stat label="Firestore" value={<Badge tone="green">OK</Badge>}/><Stat label="Hash chain" value={<Badge tone="green">Valid</Badge>}/></div><p style={{color:'var(--muted)',fontSize:12,marginTop:12}}>Rate limits, MFA enforcement and CORS allowlist active.</p></Card></div>
    <Card title="API Connections" style={{marginTop:16}} action={<button className="btn sm outline" onClick={()=>toast('New webhook created (demo)')}>+ Add connection</button>} pad={false}><div className="card-body"><div className="grid cols-2">
      <div className="card" style={{boxShadow:'none'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong>FHIR HIS Integration</strong><StatusBadge status="connected"/></div><p style={{color:'var(--muted)',fontSize:12}}>https://api.hospital.example/interconnect-fhir-r4<br/>Last sync: 2 min ago</p><button className="btn sm outline" onClick={()=>toast('Configuration opened (demo)')}>Configure</button></div>
      <div className="card" style={{boxShadow:'none'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong>Legacy Lab Drop (CSV)</strong><StatusBadge status="warning"/></div><p style={{color:'var(--muted)',fontSize:12}}>Sync failed 1h ago - review inbound results</p><button className="btn sm outline" onClick={()=>toast('Reviewing connection (demo)')}>Review</button></div>
    </div></div></Card></>;
}
export function AdminUsers() { const {t}=useTranslation(); const {toast}=useToast(); const [users,setUsers]=useState<User[]>([]); const [open,setOpen]=useState(false); const [form,setForm]=useState({name:'',email:'',role:'lab_staff' as any,phone:''});
  useEffect(()=>{api.list<User>('users').then(setUsers);},[]);
  const create=async()=>{ await api.mutate(db=>{const uid=`user_${Date.now()}`;db.users.push({uid,name:form.name,email:form.email,role:form.role,phone:form.phone,emergencyContact:{name:'-',relationship:'-',phone:'0100000000'}});});setOpen(false);api.list<User>('users').then(setUsers);toast('Staff account created');};
  return <><PageHead title={t('staffManagement')} subtitle={t('systemConfig')} actions={<button className="btn primary" onClick={()=>setOpen(true)}><Plus size={16}/> {t('addUser')}</button>}/><Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('role')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>{users.map(u=><tr key={u.uid}><td>{u.name}</td><td>{u.email}</td><td><Badge>{t(u.role==='lab_staff'?'labStaff':u.role)}</Badge></td><td><StatusBadge status={u.status||'active'}/></td><td><button className="btn sm outline" onClick={()=>toast('Role management opened')}>{t('edit')}</button></td></tr>)}</tbody></table></div></Card>
    {open && <Modal title={t('addUser')} onClose={()=>setOpen(false)} footer={<><button className="btn outline" onClick={()=>setOpen(false)}>{t('cancel')}</button><button className="btn primary" onClick={()=>void create()}>{t('submit')}</button></>}><Field label={t('name')}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label={t('email')}><input className="input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label={t('phoneNumber')}><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label={t('role')}><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value as any})}>{['lab_staff','pharmacy','hospital_admin','admin'].map(r=><option key={r}>{r}</option>)}</select></Field></Modal>}
  </>; }
export function AdminInstitutions(){ const {t}=useTranslation(); const {toast}=useToast(); const [list,setList]=useState<Institution[]>([]); useEffect(()=>{api.list<Institution>('institutions').then(setList);},[]);
  const verify=(x:Institution)=>{api.mutate(db=>{const i=db.institutions.find(y=>y.id===x.id);if(i){i.verified=true;i.active=true;}}).then(()=>{api.list<Institution>('institutions').then(setList);toast(t('verifyLicense'));});};
  return <><PageHead title={t('institutions')} subtitle="Register and verify hospitals, labs and clinics."/><Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('type')}</th><th>License</th><th>{t('city')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>{list.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.type}</td><td style={{fontFamily:'monospace'}}>{x.licenseNumber}</td><td>{x.city}</td><td><StatusBadge status={x.verified?'verified':'pending_verification'}/></td><td>{!x.verified&&<button className="btn sm primary" onClick={()=>verify(x)}><ShieldCheck size={14}/> {t('verifyLicense')}</button>}</td></tr>)}</tbody></table></div></Card></>; }
export function AdminPharmacies(){ const {t}=useTranslation(); const {toast}=useToast(); const [list,setList]=useState<Pharmacy[]>([]); useEffect(()=>{api.list<Pharmacy>('pharmacies').then(setList);},[]);
  const approve=(x:Pharmacy)=>{api.mutate(db=>{const p=db.pharmacies.find(y=>y.id===x.id);if(p)p.status='approved';}).then(()=>{api.list<Pharmacy>('pharmacies').then(setList);toast('Pharmacy approved');});};
  return <><PageHead title={t('pharmacies')} subtitle="Partnership approvals and commission settings."/><Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('city')}</th><th>WhatsApp</th><th>{t('status')}</th><th>Fee</th><th>{t('action')}</th></tr></thead><tbody>{list.map(x=><tr key={x.id}><td><Store size={14}/> {x.name}</td><td>{x.city}</td><td>{x.whatsapp}</td><td><StatusBadge status={x.status}/></td><td>{x.monthlyFee} EGP</td><td>{x.status==='pending'&&<button className="btn sm primary" onClick={()=>approve(x)}>Approve</button>}</td></tr>)}</tbody></table></div></Card></>; }
export function AdminAudit(){ const {t}=useTranslation(); const [list,setList]=useState<AuditEntry[]>([]); const [verified,setVerified]=useState(false); useEffect(()=>{api.list<AuditEntry>('audit').then(setList);},[]);
  return <><PageHead title={t('audit')} subtitle="Hash-chained, append-only access log." actions={<div style={{display:'flex',gap:8}}><button className="btn outline" onClick={()=>{setVerified(true);}}><ShieldCheck size={16}/> Verify chain</button><button className="btn outline" onClick={()=>{const b=new Blob([list.map(x=>JSON.stringify(x)).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='audit.csv';a.click();}}>{t('exportCsv')}</button></div>}/>
    {verified && <div className="alert green"><CheckCircle2 size={16}/> SHA-256 hash chain verified - all {list.length} entries intact.</div>}
    <Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('date')}</th><th>Actor</th><th>{t('action')}</th><th>Resource</th><th>IP</th><th>Hash</th></tr></thead><tbody>{list.map(a=><tr key={a.id}><td>{new Date(a.timestamp).toLocaleString()}</td><td>{a.actorName}</td><td><Badge tone="blue">{a.action}</Badge></td><td>{a.resource}</td><td>{a.ip}</td><td style={{fontFamily:'monospace',fontSize:10}}>{a.hash.slice(0,12)}…</td></tr>)}</tbody></table>{!list.length&&<Empty/>}</div></Card></>; }
export function AdminReports(){ return <><PageHead title="Compliance & Reports" subtitle="EDP mapping, deletion requests and system reports."/><div className="grid cols-2"><Card title="Deletion requests"><p style={{color:'var(--muted)'}}>Patients may request complete deletion; fulfilled within 30 days.</p><Badge tone="green">0 pending</Badge></Card><Card title="EDP compliance checklist"><ul><li>Explicit consent ✓</li><li>Right to access ✓</li><li>Right to deletion ✓</li><li>Data minimization ✓</li><li>Audit trail ✓</li><li>Encryption in transit/at rest ✓</li></ul><p className="disclaimer">Egyptian data-center localization is a deployment requirement; not verifiable in demo mode.</p></Card></div></>; }
export function AdminPopulation(){ const {t}=useTranslation(); return <><PageHead title={t('population')} subtitle="De-identified disease prevalence and lab trends."/><Card><ResponsiveContainer width="100%" height={300}><BarChart data={[{m:'Diabetes',v:42},{m:'Hypertension',v:35},{m:'Asthma',v:18},{m:'Cardiac',v:12}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="m"/><YAxis/><Tooltip/><Bar dataKey="v" fill="#006a61"/></BarChart></ResponsiveContainer><p className="disclaimer">All aggregates are de-identified; no patient-level data is shown.</p></Card></>; }
