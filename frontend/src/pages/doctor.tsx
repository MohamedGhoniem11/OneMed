import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import {
  Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, Clock, FileText, FlaskConical,
  Image as ImageIcon, MessageSquare, Pill, Plus, Printer, QrCode, ScanLine, Search, Sparkles,
  Stethoscope, Trash2, Upload, Users,
} from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import * as api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Patient, MedicalRecord, Prescription, Medicine, Consent, AuditEntry, ChatTurn, Conversation, Message } from '../types';
import { Badge, Card, CopyButton, Empty, Field, IdentityStrip, Modal, PageHead, SectionTabs, SkeletonCards, Stat, StatusBadge, Tabs, useToast } from '../components/ui';

export function DoctorDashboard() {
  const { session } = useAuth(); const { t } = useTranslation(); const nav = useNavigate();
  const [patients,setPatients]=useState<Patient[]>([]); const [rx,setRx]=useState<Prescription[]>([]); const [q,setQ]=useState(''); const [loading,setLoading]=useState(true);
  useEffect(()=>{ Promise.all([api.searchPatients('').then(setPatients), api.list<Prescription>('prescriptions',x=>x.doctorId===session!.user.uid).then(setRx)]).finally(()=>setLoading(false)); },[]);
  const filtered = patients.filter(p=>`${p.name} ${p.nationalId} ${p.phone}`.toLowerCase().includes(q.toLowerCase()));
  return <>
    <PageHead title={`Good Morning, ${session!.user.name.split(' ').slice(-1)[0]}`} subtitle={`${t('dashboard')} - ${new Date().toLocaleDateString()}`} actions={<span className="badge green">● {t('systemOnline')}</span>}/>
    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}><input className="input" style={{maxWidth:400}} placeholder={`Search Patient by ${t('nationalId')}, NFC, or QR…`} value={q} onChange={e=>setQ(e.target.value)}/>
      <button className="btn danger" onClick={()=>window.open('/emergency/em-demo-mona','_blank')}>✚ {t('emergencyShortcut')}</button>
      <button className="btn outline" onClick={()=>nav('/app/doctor/qr')}><ScanLine size={16}/> {t('nfcScanner')}</button>
      <button className="btn outline" onClick={()=>nav('/app/doctor/qr')}><QrCode size={16}/> {t('qrGenerator')}</button>
      <Link className="btn navy" to="/app/doctor/prescriptions"><Plus size={16}/> {t('newConsultation')}</Link></div>
    {loading ? <SkeletonCards/> : <div className="grid cols-2"><Card title={t('recentPatients')} action={<Link className="btn sm" to="/app/doctor/patients">{t('viewAll')}</Link>} pad={false}>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('patient')}</th><th>{t('nationalId')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>
        {filtered.map(p=><tr key={p.id}><td><strong>{p.name}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{p.gender==='male'?'M':'F'} · {p.city}</div></td><td style={{fontFamily:'monospace',fontSize:12}}>{p.nationalId}</td><td><StatusBadge status={(p.chronicDiseases||[]).length>1?'in_progress':'waiting'}/></td><td><Link className="btn sm primary" to={`/app/doctor/patients/${p.id}`}>{t('view')}</Link></td></tr>)}
      </tbody></table>{!filtered.length&&<Empty/>}</div></Card>
      <div className="grid" style={{gap:16}}><Card title={t('quickStats')}><div className="grid cols-2"><Stat label={t('patients')} value={patients.length}/><Stat label={t('pending')} value={rx.filter(r=>r.extractionStatus!=='confirmed').length}/></div></Card>
      <Card title={t('pending')} pad={false}><div className="card-body">{rx.filter(r=>r.extractionStatus!=='confirmed').map(r=><div key={r.id} style={{padding:'8px 0',borderBottom:'1px solid var(--line)'}}><strong>{(r.medicines||[]).map(m=>m.name).join(', ')}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{r.patientName} · Review & sign</div><Link className="btn sm primary" to="/app/doctor/prescriptions">Review</Link></div>)}{rx.every(r=>r.extractionStatus==='confirmed')&&<Empty message="Nothing pending"/>}</div></Card>
      <Card title={t('aiAssistant')}><p style={{color:'var(--muted)'}}>{t('clinicalSummary')} with confidence and citations.</p><Link className="btn primary" to="/app/doctor/patients/user_patient_1"><Sparkles size={16}/> Open patient</Link></Card></div>
    </div>}
  </>;
}

export function DoctorPatients() {
  const { t } = useTranslation(); const nav = useNavigate(); const [params] = useSearchParams();
  const [patients,setPatients]=useState<Patient[]>([]); const [q,setQ]=useState(params.get('q')||''); const [consents,setConsents]=useState<Consent[]>([]);
  useEffect(()=>{ api.searchPatients('').then(setPatients); api.list<Consent>('consents').then(setConsents); },[]);
  const allowed = patients.filter(p=>q===''||`${p.name} ${p.nationalId} ${p.phone}`.toLowerCase().includes(q.toLowerCase()));
  return <><PageHead title={t('patients')} subtitle="Search by name, National ID or phone. Access is consent-gated and logged."/>
    <Card pad><div className="card-body"><div style={{display:'flex',gap:8,marginBottom:12}}><input className="input" placeholder={`${t('search')} ${t('name')} / ${t('nationalId')} / ${t('phoneNumber')}`} value={q} onChange={e=>setQ(e.target.value)}/><button className="btn primary" onClick={()=>nav('/app/doctor/qr')}><ScanLine size={16}/> NFC / QR</button></div>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('nationalId')}</th><th>{t('bloodGroup')}</th><th>{t('allergies')}</th><th>{t('consents')}</th><th>{t('action')}</th></tr></thead><tbody>{allowed.map(p=><tr key={p.id}><td><strong>{p.name}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{p.dateOfBirth} · {p.phone}</div></td><td style={{fontFamily:'monospace',fontSize:12}}>{p.nationalId}</td><td><Badge tone="red">{p.bloodGroup}</Badge></td><td style={{color:'var(--red)'}}>{p.allergies.join(', ')||'-'}</td><td><Badge tone={consents.some(c=>c.patientId===p.id&&c.active)?'green':'gray'}>{consents.filter(c=>c.patientId===p.id&&c.active).length}</Badge></td><td><Link className="btn sm primary" to={`/app/doctor/patients/${p.id}`}>{t('view')}</Link></td></tr>)}</tbody></table>{!allowed.length&&<Empty/>}</div></div></Card>
  </>;
}

export function PatientViewer() {
  const { id='' } = useParams(); const { t, i18n } = useTranslation(); const { session } = useAuth(); const {toast}=useToast();
  const [patient,setPatient]=useState<Patient|null>(null); const [records,setRecords]=useState<MedicalRecord[]>([]); const [type,setType]=useState('all');
  const [summary,setSummary]=useState<{text:string;confidence:string;sources:string[]}|null>(null);
  const [aiOpen,setAiOpen]=useState(false); const [chat,setChat]=useState<ChatTurn[]>([]); const [msg,setMsg]=useState('');
  const [override,setOverride]=useState(false); const [reason,setReason]=useState(''); const [overrideResult,setOverrideResult]=useState<any>(null);
  useEffect(()=>{ api.getPatient(id).then(setPatient); api.listRecords(id).then(a=>setRecords(a.sort((x,y)=>String(y.date).localeCompare(String(x.date))))); },[id]);
  const filtered = records.filter(r=>type==='all'||r.type===type);
  const send = async () => { if(!msg.trim()) return; setChat(c=>[...c,{role:'user',text:msg}]); setMsg(''); const r=await api.chatbot(msg,patient||undefined); setChat(c=>[...c,r]); };
  const series = records.filter(r=>r.values?.some(v=>v.name==='HbA1c')).map(r=>({date:new Date(r.date).toLocaleDateString('en',{month:'short'}),value:r.values!.find(v=>v.name==='HbA1c')!.value}));
  return <>
    <div className="page-head no-print"><div><IdentityStrip name={patient?.name||'…'} id={patient?.nationalId} blood={patient?.bloodGroup} allergies={patient?.allergies} meta={<>{patient?.dateOfBirth} · {patient?.gender==='male'?'Male':'Female'} · 45 yrs · 82 kg / 178 cm</>}/></div>
      <div className="no-print"><button className="btn outline" onClick={()=>window.print()}><Printer size={16}/> {t('printRecord')}</button><Link className="btn primary" to="/app/doctor/prescriptions"><Plus size={16}/> {t('newConsultation')}</Link></div></div>
    <div className="print-only"><h1>{patient?.name}</h1><p>ID: {patient?.nationalId} · Blood: {patient?.bloodGroup}</p></div>
    {patient?.allergies.length ? <div className="alert red"><AlertTriangle size={18}/> <strong>{t('criticalAllergies')}:</strong> {patient.allergies.join(', ')} <Badge tone="red">CRITICAL</Badge></div> : null}
    {override && <div className="alert amber"><strong>Emergency override active.</strong> Reason: {reason}. Access is logged and time-limited.</div>}
    <div className="grid cols-2">
      <Card title={t('clinicalTimeline')} action={<div className="tabs" style={{border:0,margin:0}}>{['all','lab','prescription','imaging','note','vitals'].map(x=><button key={x} className={`tab ${type===x?'active':''}`} onClick={()=>setType(x)}>{t(x)}</button>)}</div>} pad={false}>
        <div className="card-body"><div className="timeline">{filtered.map(r=><div className="timeline-item" key={r.id}><Badge tone={r.type==='lab'?'blue':r.type==='imaging'?'blue':r.type==='prescription'?'green':'gray'}>{t(r.type)}</Badge> <strong>{r.title}</strong>
          <div style={{fontSize:12,color:'var(--muted)'}}>{r.institution} · {new Date(r.date).toLocaleString()}</div>
          {r.values?.map(v=><div key={v.name} style={{fontSize:13,marginTop:4}}>{v.name}: <strong style={{color:v.flag==='high'?'var(--red)':'inherit'}}>{v.value} {v.unit}</strong> <span style={{color:'var(--muted)'}}>({v.referenceLow}-{v.referenceHigh})</span></div>)}
          {r.summary && <p style={{fontSize:13,margin:'4px 0'}}>{r.summary}</p>}</div>)}</div>{!filtered.length&&<Empty/>}
          {filtered.length>0 && <p style={{color:'var(--muted)',fontSize:12,textAlign:'center',paddingTop:8}}>- {t('historyFooter')} -</p>}</div>
      </Card>
      <div className="grid" style={{gap:16}}>
        <Card title={t('activeMedications')}><p>Metformin 500mg - PO BID with meals<br/>Lisinopril 10mg - PO QD<br/>Atorvastatin 20mg - PO QHS (refill needed)</p></Card>
        <Card title={t('latestVitals')}><div className="grid cols-2"><Stat label="Blood Pressure" value="128/82 mmHg"/><Stat label={t('heartRate')} value="74 bpm"/><Stat label={t('temperature')} value="37.1 °C"/><Stat label={t('spo2')} value="98 %"/></div></Card>
        <Card title={t('emergencyContact')}><div style={{display:'flex',justifyContent:'space-between'}}><div><strong>{patient?.emergencyContact?.name||'Not recorded'}</strong><div style={{color:'var(--muted)'}}>{patient?.emergencyContact?.relationship||'-'}</div></div>{patient?.emergencyContact?.phone && <a className="btn sm outline" href={`tel:${patient.emergencyContact.phone}`}>{t('call')}</a>}</div></Card>
        <Card title={t('clinicalSummary')} action={<button className="btn sm primary" onClick={async()=>{const s=await api.clinicalSummary(id);setSummary(s);toast(t('saved'));}}><Sparkles size={14}/> {t('generate')}</button>}>
          {summary?<><p style={{whiteSpace:'pre-wrap'}}>{summary.text}</p><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><Badge tone={summary.confidence==='High'?'green':'amber'}>{summary.confidence}</Badge>{summary.sources.map(s=><Badge key={s} tone="blue">{s}</Badge>)}</div><p className="disclaimer" style={{marginTop:10}}>{t('aiDisclaimer')}</p></>:<p style={{color:'var(--muted)'}}>{t('generate')} {t('clinicalSummary').toLowerCase()}…</p>}
        </Card>
        <Card title={t('analytics')}><ResponsiveContainer width="100%" height={180}><LineChart data={series}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[4,9]}/><Tooltip/><ReferenceArea y1={4} y2={5.6} fill="#e7f7ef" fillOpacity={.6}/><Line type="monotone" dataKey="value" stroke="#006a61"/></LineChart></ResponsiveContainer></Card>
      </div>
    </div>
    {overrideResult && <div className="alert amber"><strong>Emergency override active until {new Date(overrideResult.expiresAt).toLocaleTimeString()}</strong><div>Blood group: {overrideResult.critical?.bloodGroup||'-'} · Allergies: {overrideResult.critical?.allergies?.join(', ')||'none'}</div></div>}
    <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn outline" onClick={()=>setAiOpen(true)}><Bot size={16}/> {t('aiAssistant')}</button><button className="btn outline" onClick={()=>setOverride(true)}>Emergency override</button></div>
    {aiOpen && <Modal title={t('aiAssistant')} onClose={()=>setAiOpen(false)}><div className="alert blue">{t('aiDisclaimer')}</div><div className="chat-log">{chat.map((c,i)=><div key={i} className={`msg ${c.role==='user'?'me':''}`}>{c.text}{c.sources?.length&&<div style={{fontSize:11,marginTop:6}}>{c.sources.join(' · ')}</div>}</div>)}</div><div style={{display:'flex',gap:8,marginTop:10}}><input className="input" value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Ask about this patient…" onKeyDown={e=>{if(e.key==='Enter')void send();}}/><button className="btn primary" onClick={()=>void send()}>Send</button></div></Modal>}
    {override && <Modal title="Emergency override" onClose={()=>setOverride(false)} footer={<><button className="btn outline" onClick={()=>setOverride(false)}>{t('cancel')}</button><button className="btn danger" onClick={async()=>{ if(reason.trim().length<10) return toast('A written justification of at least 10 characters is required',true); try { const r=await api.emergencyOverride(id,reason); setOverrideResult(r); toast('Override logged with justification'); setOverride(false); setReason(''); } catch(e:any) { toast(e.message,true); } }}>{t('confirm')}</button></>}><Field label="Written justification"><textarea className="input" rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Describe the emergency and why access is required"/></Field><p className="disclaimer">Access is time-limited and recorded in the audit log with your user ID, patient ID, timestamp and IP.</p></Modal>}
  </>;
}

export function DoctorPrescriptions() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast();
  const [tab,setTab]=useState('list'); const [rx,setRx]=useState<Prescription[]>([]); const [patients,setPatients]=useState<Patient[]>([]);
  const [image,setImage]=useState<string|null>(null); const [items,setItems]=useState<Medicine[]>([]); const [confidence,setConfidence]=useState(0); const [patientId,setPatientId]=useState(''); const [busy,setBusy]=useState(false); const [link,setLink]=useState(''); const [draftId,setDraftId]=useState('');
  const [zoom,setZoom]=useState(1); const [rotate,setRotate]=useState(0);
  useEffect(()=>{ api.list<Prescription>('prescriptions').then(a=>setRx(a.filter(r=>r.doctorId===session!.user.uid))); api.searchPatients('').then(a=>{setPatients(a);setPatientId(a[0]?.id||'');}); },[]);
  const file = async (f:File|undefined)=>{
    if(!f) return;
    const r=new FileReader(); r.onload=()=>setImage(String(r.result)); r.readAsDataURL(f);
    setBusy(true);
    try {
      const result=await api.extractPrescription(f);
      setItems((result.items||[]).map((m:any)=>({name:m.name||'',dosage:m.dosage||'',frequency:m.frequency||'',duration:m.duration||'',confidence:m.confidence??undefined})));
      setConfidence(result.ocrConfidence||0);
      if(!patientId) return toast('Select a patient first',true);
      const draft=await api.createPrescription({patientId,diagnosis:'Prescription review',items:result.items||[]});
      setDraftId(draft.id);
      toast(result.warnings?.length?result.warnings[0]:'Medicines extracted. Review before confirming.');
    } catch(e:any){ toast(e.message,true); } finally { setBusy(false); }
  };
  const update=(i:number,k:keyof Medicine,v:string)=>setItems(a=>a.map((m,j)=>j===i?{...m,[k]:v}:m));
  const confirm=async()=>{
    if(!patientId||!items.length) return toast('Select a patient and extract medicines',true);
    setBusy(true);
    try {
      let id=draftId;
      if(!id){ const draft=await api.createPrescription({patientId,diagnosis:'Prescription review',items}); id=draft.id; }
      const confirmed=await api.confirmPrescription(id,items);
      setRx(a=>[confirmed,...a]);
      setLink(`${location.origin}/f/${confirmed.linkToken||''}`);
      setDraftId(''); setBusy(false); toast(t('saved')); setTab('list');
    } catch(e:any){ setBusy(false); toast(e.message,true); }
  };
  return <><PageHead title={t('prescriptions')} subtitle="AI-assisted extraction with mandatory doctor confirmation." actions={<button className="btn primary" onClick={()=>setTab('review')}><Upload size={16}/> New extraction</button>}/>
    <Tabs tabs={[{id:'list',label:t('prescriptions')},{id:'review',label:'Extraction Review'}]} active={tab} onChange={setTab}/>
    {tab==='list'?<Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('patient')}</th><th>{t('extractedMedicines')}</th><th>{t('confidenceLabel')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>{rx.map(r=><tr key={r.id}><td>{new Date(r.date).toLocaleDateString()}</td><td>{r.patientName}</td><td>{r.medicines.map(m=>m.name).join(', ')}</td><td><Badge tone={r.confidence>=90?'green':'amber'}>{r.confidence}%</Badge></td><td><StatusBadge status={r.extractionStatus}/></td><td><div style={{display:'flex',gap:4}}>{r.fulfillmentLink&&<Link className="btn sm" to={r.fulfillmentLink}>{t('view')}</Link>}</div></td></tr>)}</tbody></table>{!rx.length&&<Empty/>}</div></Card>
    :<><div className="grid" style={{gridTemplateColumns:'1fr 1.3fr',gap:16}}>
      <Card title={t('sourceDocument')} action={<div style={{display:'flex',gap:4}}><button className="btn sm outline" onClick={()=>setZoom(z=>Math.min(2.5,z+0.25))} aria-label="Zoom in">＋</button><button className="btn sm outline" onClick={()=>setZoom(z=>Math.max(.5,z-0.25))} aria-label="Zoom out">−</button><button className="btn sm outline" onClick={()=>setRotate(r=>(r+90)%360)} aria-label="Rotate">⟳</button></div>}><label className="btn outline" style={{width:'100%'}}><ImageIcon size={16}/> Upload prescription image<input type="file" accept="image/*" hidden onChange={e=>file(e.target.files?.[0])}/></label>
        <div style={{marginTop:14,minHeight:260,background:'#f7f9fc',border:'1px dashed var(--line)',borderRadius:8,display:'grid',placeItems:'center',overflow:'hidden'}}>{image?<img src={image} alt="Uploaded prescription" style={{maxWidth:'100%',maxHeight:340,transform:`scale(${zoom}) rotate(${rotate}deg)`,transition:'transform .2s'}}/>:<div className="empty"><Upload size={30}/><p>Upload a prescription image or PDF</p></div>}</div>
        <Field label={t('patient')}><select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      </Card>
      <Card title={t('extractedMedicines')} action={<Badge tone={confidence>=90?'green':'amber'}>{t('highConfidence')} ({confidence}%)</Badge>} pad={false}>
        <div className="card-body"><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('medicine')}</th><th>{t('dosage')}</th><th>{t('frequency')}</th><th>{t('duration')}</th><th/></tr></thead><tbody>{items.map((m,i)=><tr key={i}><td><input className="input" value={m.name} onChange={e=>update(i,'name',e.target.value)}/></td><td><input className="input" value={m.dosage} onChange={e=>update(i,'dosage',e.target.value)}/></td><td><input className="input" value={m.frequency} onChange={e=>update(i,'frequency',e.target.value)}/></td><td><input className="input" value={m.duration} onChange={e=>update(i,'duration',e.target.value)}/></td><td><button className="btn sm danger" onClick={()=>setItems(a=>a.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>
        <button className="btn sm" style={{marginTop:8}} onClick={()=>setItems(a=>[...a,{name:'',dosage:'',frequency:'',duration:''}])}><Plus size={14}/> {t('addMedication')}</button>
        <p className="disclaimer" style={{marginTop:12}}>AI-extracted from OCR text. Errors may occur; the doctor is responsible for verifying every field before a link is generated. No drug-interaction checking in this version.</p>
        <div style={{display:'flex',gap:8,marginTop:12}}><button className="btn outline" onClick={()=>setItems([])}>{t('edit')}</button><button className="btn primary" onClick={()=>void confirm()} disabled={busy||!items.length}>{t('confirmGenerateLink')}</button></div>
        {link && <div className="alert green" style={{marginTop:12}}><CheckCircle2 size={16}/> {link}<br/><Link to={`/f/${link.split('/f/')[1]}`}>Open fulfillment page</Link> <CopyButton value={link} label="Copy link"/></div>}
      </div></Card>
    </div></>}
  </>;
}

export function DoctorQrTools() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast(); const nav=useNavigate();
  const [tab,setTab]=useState('nfc'); const [qr,setQr]=useState(''); const [seconds,setSeconds]=useState(900); const [token,setToken]=useState('');
  const [patients,setPatients]=useState<Patient[]>([]); const [patientId,setPatientId]=useState('');
  useEffect(()=>{ api.searchPatients('').then(a=>{setPatients(a);setPatientId(a[0]?.id||'');}); },[]);
  useEffect(()=>{ if(!qr) return; const t=setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000); return ()=>clearInterval(t); },[qr]);
  const generate=async()=>{
    if(!patientId) return toast('Select a patient first',true);
    try {
      const r=await api.generateConnectionQr(patientId,['records','prescriptions'],'Consultation');
      setToken(r.token); QRCode.toDataURL(r.url).then(setQr);
      setSeconds(Math.max(1,Math.round((new Date(r.expiresAt).getTime()-Date.now())/1000)));
      toast('Connection QR generated - valid 15 minutes');
    } catch(e:any){ toast(e.message,true); }
  };
  const nfcSupported = 'NDEFReader' in window;
  const readNfc = async ()=>{
    if(!nfcSupported) return toast('Web NFC not supported in this browser - use the QR fallback',true);
    try {
      const reader = new (window as any).NDEFReader();
      const result = await new Promise<any>((resolve,reject)=>{
        reader.onreading = (event:any)=>resolve(event);
        reader.scan().catch(reject);
      });
      const raw = new TextDecoder().decode(result.message?.records?.[0]?.data || new Uint8Array());
      const resolved = await api.resolveNfc(raw);
      toast('NFC patient resolved'); nav(`/app/doctor/patients/${resolved.patientId}`);
    } catch(e:any){ toast(e.message,true); }
  };
  return <><PageHead title={t('scannerTools')} subtitle="Patient identification and time-limited consent connections."/>
    <Tabs tabs={[{id:'nfc',label:t('nfcScanner')},{id:'qr',label:t('qrGenerator')}]} active={tab} onChange={setTab}/>
    {tab==='nfc'?<div className="grid cols-2"><Card title={t('nfcScanner')}><div className="empty" style={{padding:50}}><ScanLine size={40}/><p>{t('readPatientId')}</p><button className="btn primary" onClick={()=>void readNfc()}>Start NFC scan</button><p className="disclaimer">Web NFC works on Chrome for Android; QR is the fallback for iOS.</p></div></Card><Card title="Supported tags"><p>NTAG 424 DNA wristbands/cards issue a signed token resolved by the backend to a patient profile.</p><Badge tone={nfcSupported?'green':'amber'}>{nfcSupported?'Web NFC available':'Web NFC unavailable - QR fallback'}</Badge></Card></div>
    :<div className="grid cols-2"><Card title={t('connectionQr')}><Field label={t('patient')}><select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}</select></Field><button className="btn primary" onClick={()=>void generate()}><QrCode size={16}/> Generate QR</button>
      {qr && <div style={{textAlign:'center',marginTop:14}}><img src={qr} alt="Connection QR" style={{width:210,height:210}}/><div style={{fontFamily:'monospace',fontSize:12}}>{token}</div><div className={`alert ${seconds>0?'blue':'red'}`} style={{marginTop:10}}><Clock size={16}/> {seconds>0?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} remaining`:'EXPIRED'}</div><a className="btn outline" href={qr} download="onemed-connection-qr.png"><DownloadIcon/> {t('downloadQr')}</a></div>}</Card>
      <Card title={t('consents')}><p style={{color:'var(--muted)'}}>Patient scans the QR, reviews the scope, and grants consent. The grant is audit logged and expires with the QR.</p><div className="alert blue">Scope: records, prescriptions · 15-minute TTL · logged with IP and timestamp</div></Card></div>}
  </>;
}
function DownloadIcon(){return <span>⬇</span>;}

export function DoctorMessages() {
  const {t}=useTranslation(); const {session}=useAuth(); const {toast}=useToast();
  const [convs,setConvs]=useState<Conversation[]>([]); const [active,setActive]=useState<string|null>(null);
  const [msgs,setMsgs]=useState<Message[]>([]); const [text,setText]=useState('');
  useEffect(()=>{ void api.listConversations().then(a=>{setConvs(a);setActive(a[0]?.id||null);}); },[]);
  useEffect(()=>{ if(active) void api.listMessages(active).then(setMsgs); },[active]);
  const send=async()=>{ if(!text.trim()||!active) return; await api.sendMessage(active,text); setText(''); setMsgs(await api.listMessages(active)); toast(t('saved')); };
  return <><PageHead title={t('messages')} subtitle="Secure conversations with patients and pharmacies."/>
    <div className="grid" style={{gridTemplateColumns:'280px 1fr'}}>
      <Card pad><div className="card-body">{convs.map(c=><button key={c.id} className={`nav-item ${active===c.id?'active':''}`} style={{color:'var(--ink)'}} onClick={()=>setActive(c.id)}><span className="avatar">{c.otherName.slice(0,2).toUpperCase()}</span><span><strong>{c.otherName}</strong><div style={{fontSize:11,color:'var(--muted)'}}>{t(c.role==='lab_staff'?'labStaff':c.role)}</div></span></button>)}{!convs.length&&<Empty message="No conversations yet. Open a patient record to start one."/>}</div></Card>
      <Card pad={false}><div className="card-head"><h3>{convs.find(c=>c.id===active)?.otherName||'-'}</h3></div><div className="card-body"><div className="chat-log">{msgs.map(m=><div key={m.id} className={`msg ${m.senderId===session!.user.uid?'me':''}`}>{m.text}<div style={{fontSize:10,opacity:.6,marginTop:4}}>{new Date(m.sentAt).toLocaleTimeString()}</div></div>)}</div><div style={{display:'flex',gap:8,marginTop:12}}><input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message..." onKeyDown={e=>{if(e.key==='Enter')void send();}}/><button className="btn primary" onClick={()=>void send()}>Send</button></div></div></Card>
    </div></>;
}

export function DoctorReports() {
  const { t } = useTranslation(); const {toast}=useToast(); const {session}=useAuth();
  const [type,setType]=useState('clinical'); const [patient,setPatient]=useState('user_patient_1'); const [patients,setPatients]=useState<Patient[]>([]); const [out,setOut]=useState('');
  useEffect(()=>{api.searchPatients('').then(setPatients);},[]);
  const generate=async()=>{
    const p=await api.getPatient(patient);
    const header = `${t('reports')}: ${type.toUpperCase()}\n${t('generated')}: ${new Date().toLocaleString()}\n`;
    let body = '';
    if(type==='audit'||type==='population') {
      const entries=await api.list<AuditEntry>('audit');
      body = type==='audit'
        ? `Access events: ${entries.length}\n${entries.slice(0,12).map(e=>`${new Date(e.timestamp).toLocaleString()} | ${e.actorName} | ${e.action} | ${e.resource}`).join('\n')}\nHash chain: append-only SHA-256 verification available in admin audit.`
        : `De-identified population summary (no patient identifiers)\n${(await api.searchPatients('')).map(x=>`${x.city} | ${x.chronicDiseases.join(', ')||'none'}`).join('\n')}`;
    } else {
      const records=(await api.listRecords(patient)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      const s=await api.clinicalSummary(patient);
      body = `Patient: ${p?.name||'-'}\nNational ID: ${p?.nationalId||'-'}\nBlood group: ${p?.bloodGroup||'-'}\n\n`;
      body += type==='clinical' ? s.text
        : records.map(r=>`${new Date(r.date).toLocaleDateString()} | ${r.type.toUpperCase()} | ${r.title} | ${r.institution}\n  ${r.summary||''}\n  ${(r.values||[]).map(v=>`${v.name}: ${v.value} ${v.unit} (${v.referenceLow}-${v.referenceHigh})${v.flag&&v.flag!=='normal'?` [${v.flag.toUpperCase()}]`:''}`).join('\n  ')}`).join('\n\n');
      if(type==='clinical') body += `\n\nConfidence: ${s.confidence}\nSources: ${s.sources.join(', ')}\n${t('aiDisclaimer')}`;
    }
    setOut(`${header}\n${body}`);
    await api.mutate(db=>{db.audit.push({id:`a_${Date.now()}`,actor:session!.user.uid,actorName:session!.user.name,action:'report_generated',resource:`report:${type}`,patientId:type==='audit'||type==='population'?undefined:patient,timestamp:new Date().toISOString(),ip:'127.0.0.1',hash:'',previousHash:''});});
    toast(t('reportGenerated'));
  };
  const download=(fmt:string)=>{ const blob=new Blob([out],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`onemed-${type}-report.${fmt}`; a.click(); };
  return <><PageHead title={t('reports')} subtitle="Generate, print and export clinical documents."/><div className="grid cols-2"><Card title="Generate report"><Field label="Report type"><select className="input" value={type} onChange={e=>setType(e.target.value)}><option value="history">Patient Medical History</option><option value="lab">Lab Results</option><option value="clinical">Clinical Summary</option><option value="audit">Audit & Compliance</option><option value="population">Population Health</option></select></Field><Field label={t('patient')}><select className="input" value={patient} onChange={e=>setPatient(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><button className="btn primary" onClick={()=>void generate()}>{t('generate')}</button><p className="disclaimer" style={{marginTop:12}}>{t('reportExpires')}</p></Card>
    <Card title="Output"><pre style={{whiteSpace:'pre-wrap',fontSize:12,maxHeight:320,overflow:'auto'}}>{out||'-'}</pre><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button className="btn sm outline" onClick={()=>download('txt')}>{t('download')} TXT</button><button className="btn sm outline" onClick={()=>window.print()}>{t('exportPdf')}</button><button className="btn sm outline" onClick={async()=>{const recs=await api.listRecords(patient);const bundle={resourceType:'Bundle',type:'collection',entry:recs.map(r=>({resource:r.type==='lab'?{resourceType:'DiagnosticReport',status:'final',code:{text:r.title},effectiveDateTime:r.date,result:(r.values||[]).map(v=>({resourceType:'Observation',status:'final',code:{text:v.name},valueQuantity:{value:v.value,unit:v.unit},referenceRange:[{low:{value:v.referenceLow},high:{value:v.referenceHigh}}]}))}:{resourceType:'DocumentReference',status:'current',type:{text:r.type},date:r.date,description:r.title,content:[{attachment:{title:r.institution}}]}}))};const b=new Blob([JSON.stringify(bundle,null,2)],{type:'application/fhir+json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='onemed-fhir-bundle.json';a.click();}}>{t('exportFhir')}</button></div></Card></div></>;
}

export function DoctorSettings() { const {session}=useAuth(); const {t}=useTranslation(); return <><PageHead title={t('settings')} subtitle={t('clinicalIdentity')}/><Card><dl style={{lineHeight:2}}><dt style={{color:'var(--muted)'}}>{t('name')}</dt><dd>{session!.user.name}</dd><dt style={{color:'var(--muted)'}}>{t('email')}</dt><dd>{session!.user.email}</dd><dt style={{color:'var(--muted)'}}>MFA</dt><dd>{session!.user.mfaEnabled?<Badge tone="green">Enabled</Badge>:<Badge tone="amber">Not enabled</Badge>}</dd></dl></Card></>; }
