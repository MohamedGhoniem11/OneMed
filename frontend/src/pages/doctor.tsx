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
import { Badge, Card, ConfirmDialog, CopyButton, Empty, Field, IdentityStrip, Modal, PageHead, SectionTabs, SkeletonCards, Stat, StatusBadge, Tabs, useToast } from '../components/ui';

export function DoctorDashboard() {
  const { session } = useAuth(); const { t } = useTranslation(); const nav = useNavigate(); const {toast}=useToast();
  const [patients,setPatients]=useState<Patient[]>([]); const [rx,setRx]=useState<Prescription[]>([]); const [q,setQ]=useState(''); const [loading,setLoading]=useState(true);
  useEffect(()=>{ Promise.all([api.searchPatients('').then(setPatients), api.list<Prescription>('prescriptions',x=>x.doctorId===session!.user.uid).then(setRx)]).catch((e:any)=>toast(e.message,true)).finally(()=>setLoading(false)); },[]);
  const filtered = patients.filter(p=>`${p.name} ${p.nationalId} ${p.phone}`.toLowerCase().includes(q.toLowerCase()));
  return <>
    <PageHead title={t('goodMorning', {name:session!.user.name.split(' ').slice(-1)[0]})} subtitle={`${t('dashboard')} - ${new Date().toLocaleDateString()}`} actions={<span className="badge green">● {t('systemOnline')}</span>}/>
    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}><input className="input" style={{maxWidth:400}} placeholder={t('searchPatientHint', {field:t('nationalId')})} value={q} onChange={e=>setQ(e.target.value)}/>
      <button className="btn danger" onClick={()=>void api.myEmergencyLink().then(p=>{if(p)window.open(p,'_blank');else toast(t('noEmergencyLink'),true);})}>✚ {t('emergencyShortcut')}</button>
      <button className="btn outline" onClick={()=>nav('/app/doctor/qr?tab=nfc')}><ScanLine size={16}/> {t('nfcScanner')}</button>
      <button className="btn outline" onClick={()=>nav('/app/doctor/qr?tab=qr')}><QrCode size={16}/> {t('qrGenerator')}</button>
      <Link className="btn navy" to="/app/doctor/prescriptions"><Plus size={16}/> {t('newConsultation')}</Link></div>
    {loading ? <SkeletonCards/> : <div className="grid cols-2"><Card title={t('recentPatients')} action={<Link className="btn sm" to="/app/doctor/patients">{t('viewAll')}</Link>} pad={false}>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('patient')}</th><th>{t('nationalId')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>
        {filtered.map(p=><tr key={p.id}><td><strong>{p.name}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{t(p.gender==='male'?'maleShort':'femaleShort')} · {p.city}</div></td><td style={{fontFamily:'monospace',fontSize:12}}>{p.nationalId}</td><td><StatusBadge status={(p.chronicDiseases||[]).length>1?'in_progress':'waiting'}/></td><td><Link className="btn sm primary" to={`/app/doctor/patients/${p.id}`}>{t('view')}</Link></td></tr>)}
      </tbody></table>{!filtered.length&&<Empty/>}</div></Card>
      <div className="grid" style={{gap:16}}><Card title={t('quickStats')}><div className="grid cols-2"><Stat label={t('patients')} value={patients.length}/><Stat label={t('pending')} value={rx.filter(r=>r.extractionStatus!=='confirmed').length}/></div></Card>
      <Card title={t('pending')} pad={false}><div className="card-body">{rx.filter(r=>r.extractionStatus!=='confirmed').map(r=><div key={r.id} style={{padding:'8px 0',borderBottom:'1px solid var(--line)'}}><strong>{(r.medicines||[]).map(m=>m.name).join(', ')}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{r.patientName} · {t('reviewAndSign')}</div><Link className="btn sm primary" to="/app/doctor/prescriptions">{t('review')}</Link></div>)}{rx.every(r=>r.extractionStatus==='confirmed')&&<Empty message={t('nothingPending')}/>}</div></Card>
      <Card title={t('aiAssistant')}><p style={{color:'var(--muted)'}}>{t('clinicalSummary')} {t('summarySuffix')}</p>{patients[0] ? <Link className="btn primary" to={`/app/doctor/patients/${patients[0].id}`}><Sparkles size={16}/> {t('view')}</Link> : <Empty message={t('noPatientAvailable')}/>}</Card></div>
    </div>}
  </>;
}

export function DoctorPatients() {
  const { t } = useTranslation(); const nav = useNavigate(); const [params] = useSearchParams(); const {toast}=useToast();
  const [patients,setPatients]=useState<Patient[]>([]); const [q,setQ]=useState(params.get('q')||''); const [consents,setConsents]=useState<Consent[]>([]);
  useEffect(()=>{ api.searchPatients('').then(setPatients).catch((e:any)=>toast(e.message,true)); api.list<Consent>('consents').then(setConsents).catch(()=>{}); },[]);
  const allowed = patients.filter(p=>q===''||`${p.name} ${p.nationalId} ${p.phone}`.toLowerCase().includes(q.toLowerCase()));
  return <><PageHead title={t('patients')} subtitle={t('patientsSubtitle')}/>
    <Card pad><div className="card-body"><div style={{display:'flex',gap:8,marginBottom:12}}><input className="input" placeholder={`${t('search')} ${t('name')} / ${t('nationalId')} / ${t('phoneNumber')}`} value={q} onChange={e=>setQ(e.target.value)}/><button className="btn primary" onClick={()=>nav('/app/doctor/qr')}><ScanLine size={16}/> NFC / QR</button></div>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('nationalId')}</th><th>{t('bloodGroup')}</th><th>{t('allergies')}</th><th>{t('consents')}</th><th>{t('action')}</th></tr></thead><tbody>{allowed.map(p=><tr key={p.id}><td><strong>{p.name}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{p.dateOfBirth} · {p.phone}</div></td><td style={{fontFamily:'monospace',fontSize:12}}>{p.nationalId}</td><td><Badge tone="red">{p.bloodGroup}</Badge></td><td style={{color:'var(--red)'}}>{p.allergies.join(', ')||'-'}</td><td><Badge tone={consents.some(c=>c.patientId===p.id&&c.active)?'green':'gray'}>{consents.filter(c=>c.patientId===p.id&&c.active).length}</Badge></td><td><Link className="btn sm primary" to={`/app/doctor/patients/${p.id}`}>{t('view')}</Link></td></tr>)}</tbody></table>{!allowed.length&&<Empty/>}</div></div></Card>
  </>;
}

export function PatientViewer() {
  const { id='' } = useParams(); const { t, i18n } = useTranslation(); const { session } = useAuth(); const {toast}=useToast();
  const [patient,setPatient]=useState<Patient|null>(null); const [records,setRecords]=useState<MedicalRecord[]>([]); const [meds,setMeds]=useState<any[]>([]); const [type,setType]=useState('all');
  const [summary,setSummary]=useState<{text:string;confidence:string;sources:string[]}|null>(null);
  const [aiOpen,setAiOpen]=useState(false); const [chat,setChat]=useState<ChatTurn[]>([]); const [msg,setMsg]=useState('');
  const [override,setOverride]=useState(false); const [reason,setReason]=useState(''); const [overrideResult,setOverrideResult]=useState<any>(null);
  useEffect(()=>{ api.getPatient(id).then(setPatient).catch(()=>{}); api.listRecords(id).then(a=>setRecords(a.sort((x,y)=>String(y.date).localeCompare(String(x.date))))).catch((e:any)=>toast(e.message,true)); api.list<any>('prescriptions',p=>p.patientId===id).then(a=>setMeds(a.flatMap(p=>p.medicines||p.items||[]))).catch(()=>{}); },[id]);
  const latestValue = (name:string) => [...records].reverse().flatMap(r=>r.values||[]).find(v=>v.name===name);
  const contact = () => (patient as any)?.emergencyContact || (patient as any)?.emergencyContacts?.[0] || null;
  const fmt = (v:any) => v ? new Intl.DateTimeFormat(i18n.language||'en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)) : '-';
  const filtered = records.filter(r=>type==='all'||r.type===type);
  const send = async () => { if(!msg.trim()) return; const question=msg; setChat(c=>[...c,{role:'user',text:question}]); setMsg('');
    try { const r=await api.doctorChat(id,question,i18n.language); setChat(c=>[...c,r]); }
    catch(e:any){ setChat(c=>[...c,{role:'assistant',text:e.message||t('assistantUnavailable')}]); } };
  const series = records.filter(r=>r.values?.some(v=>v.name==='HbA1c')).map(r=>({date:new Intl.DateTimeFormat(i18n.language||'en',{month:'short'}).format(new Date(r.date)),value:r.values!.find(v=>v.name==='HbA1c')!.value}));
  return <>
    <div className="page-head no-print"><div><IdentityStrip name={patient?.name||'…'} id={patient?.nationalId} blood={patient?.bloodGroup} allergies={patient?.allergies} meta={<>{patient?.dateOfBirth||'-'} · {t(patient?.gender==='male'?'male':'female')}</>}/></div>
      <div className="no-print"><button className="btn outline" onClick={()=>window.print()}><Printer size={16}/> {t('printRecord')}</button><Link className="btn primary" to="/app/doctor/prescriptions"><Plus size={16}/> {t('newConsultation')}</Link></div></div>
    <div className="print-only"><h1>{patient?.name}</h1><p>{t('idLabel')} {patient?.nationalId} · {t('bloodLabel')} {patient?.bloodGroup}</p></div>
    {patient?.allergies?.length ? <div className="alert red"><AlertTriangle size={18}/> <strong>{t('criticalAllergies')}:</strong> {patient.allergies.join(', ')} <Badge tone="red">{t('criticalBadge')}</Badge></div> : null}
    {override && <div className="alert amber">{t('overrideActiveNotice', {reason})}</div>}
    <div className="grid cols-2">
      <Card title={t('clinicalTimeline')} action={<div className="tabs" style={{border:0,margin:0}}>{['all','lab','prescription','imaging','note','vitals'].map(x=><button key={x} className={`tab ${type===x?'active':''}`} onClick={()=>setType(x)}>{t(x)}</button>)}</div>} pad={false}>
        <div className="card-body"><div className="timeline">{filtered.map(r=><div className="timeline-item" key={r.id}><Badge tone={r.type==='lab'?'blue':r.type==='imaging'?'blue':r.type==='prescription'?'green':'gray'}>{t(r.type)}</Badge> <strong>{r.title}</strong>
          <div style={{fontSize:12,color:'var(--muted)'}}>{r.institution} · {fmt(r.date)}</div>
          {r.values?.map(v=><div key={v.name} style={{fontSize:13,marginTop:4}}>{v.name}: <strong style={{color:v.flag==='high'?'var(--red)':'inherit'}}>{v.value} {v.unit}</strong> <span style={{color:'var(--muted)'}}>({v.referenceLow}-{v.referenceHigh})</span></div>)}
          {r.summary && <p style={{fontSize:13,margin:'4px 0'}}>{r.summary}</p>}</div>)}</div>{!filtered.length&&<Empty/>}
          {filtered.length>0 && <p style={{color:'var(--muted)',fontSize:12,textAlign:'center',paddingTop:8}}>- {t('historyFooter')} -</p>}</div>
      </Card>
      <div className="grid" style={{gap:16}}>
        <Card title={t('activeMedications')}>{(meds.length ? meds : (((patient as any)?.activeMedications||[]) as string[]).map((name:string)=>({name}))).length ? (meds.length ? meds : (((patient as any)?.activeMedications||[]) as string[]).map((name:string)=>({name}))).map((m:any,i:number)=><div key={i} style={{fontSize:13,padding:'4px 0'}}>{m.name}{m.dosage?` ${m.dosage}`:''}{m.frequency?` · ${m.frequency}`:''}</div>) : <Empty message={t('noMedications')}/>}</Card>
        <Card title={t('latestVitals')}><div className="grid cols-2"><Stat label={t('bloodPressure')} value={latestValue('Systolic')?`${latestValue('Systolic')?.value}/${latestValue('Diastolic')?.value||'-'}`:'-'} /><Stat label={t('heartRate')} value={latestValue('Heart Rate')?`${latestValue('Heart Rate')?.value}`:'-'} /><Stat label={t('temperature')} value={latestValue('Temperature')?`${latestValue('Temperature')?.value}`:'-'} /><Stat label={t('spo2')} value={latestValue('SpO2')?`${latestValue('SpO2')?.value}`:'-'} /></div></Card>
        <Card title={t('emergencyContact')}><div style={{display:'flex',justifyContent:'space-between'}}><div><strong>{contact()?.name||t('notRecorded')}</strong><div style={{color:'var(--muted)'}}>{contact()?.relationship||'-'}</div></div>{contact()?.phone && <a className="btn sm outline" href={`tel:${contact().phone}`}>{t('call')}</a>}</div></Card>
        <Card title={t('clinicalSummary')} action={<button className="btn sm primary" onClick={async()=>{const s=await api.clinicalSummary(id);setSummary(s);toast(t('saved'));}}><Sparkles size={14}/> {t('generate')}</button>}>
          {summary?<><p style={{whiteSpace:'pre-wrap'}}>{summary.text}</p><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><Badge tone={summary.confidence==='High'?'green':'amber'}>{t(summary.confidence==='Knowledge Gap'?'knowledgeGapShort':String(summary.confidence).toLowerCase())}</Badge>{summary.sources.map(s=><Badge key={s} tone="blue">{s}</Badge>)}</div><p className="disclaimer" style={{marginTop:10}}>{t('aiDisclaimer')}</p></>:<p style={{color:'var(--muted)'}}>{t('generate')} {t('clinicalSummary').toLowerCase()}…</p>}
        </Card>
        <Card title={t('analytics')}><ResponsiveContainer width="100%" height={180}><LineChart data={series}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[4,9]}/><Tooltip/><ReferenceArea y1={4} y2={5.6} fill="#e7f7ef" fillOpacity={.6}/><Line type="monotone" dataKey="value" stroke="#006a61"/></LineChart></ResponsiveContainer></Card>
      </div>
    </div>
    {overrideResult && <div className="alert amber"><strong>{t('overrideActiveUntil', {time:new Date(overrideResult.expiresAt).toLocaleTimeString()})}</strong><div>{t('bloodGroup')}: {overrideResult.critical?.bloodGroup||'-'} · {t('allergies')}: {overrideResult.critical?.allergies?.join(', ')||t('none')}</div></div>}
    <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn outline" onClick={()=>setAiOpen(true)}><Bot size={16}/> {t('aiAssistant')}</button><button className="btn outline" onClick={()=>setOverride(true)}>{t('emergencyOverride')}</button></div>
    {aiOpen && <Modal title={t('aiAssistant')} onClose={()=>setAiOpen(false)}><div className="alert blue">{t('aiDisclaimer')}</div>
      <div className="disclaimer" style={{marginBottom:8}}>{t('scopedTo', {name:patient?.name||t('thisPatient')})}</div>
      <div className="chat-log" aria-live="polite">{chat.map((c,i)=><div key={i} className={`msg ${c.role==='user'?'me':''}`}><div style={{whiteSpace:'pre-wrap'}}>{c.text}</div>{c.confidence&&<div style={{marginTop:6}}><Badge tone={c.confidence==='High'?'green':c.confidence==='Knowledge Gap'?'gray':'amber'}>{t(c.confidence==='Knowledge Gap'?'knowledgeGapShort':String(c.confidence).toLowerCase())}</Badge></div>}{(c.sources||[]).length>0&&<div style={{fontSize:11,marginTop:6,opacity:.75}}>{(c.sources||[]).join(' · ')}</div>}{c.role==='assistant'&&<button className="btn sm outline" style={{marginTop:8}} onClick={()=>void api.reportIssue({kind:'doctor_chat',message:t('reportIssueReason'),source:(c.sources||[]).join(', ')||'doctor-chat'}).then(()=>toast(t('issueLogged'))).catch((e:any)=>toast(e.message,true))}>{t('reportIssue')}</button>}</div>)}</div>
      <div style={{display:'flex',gap:8,marginTop:10}}><input className="input" aria-label={t('askAboutPatient')} value={msg} onChange={e=>setMsg(e.target.value)} placeholder={t('askAboutPatient')} onKeyDown={e=>{if(e.key==='Enter')void send();}}/><button className="btn primary" disabled={!msg.trim()} onClick={()=>void send()}>{t('send')}</button></div></Modal>}
    {override && <Modal title={t('emergencyOverride')} onClose={()=>setOverride(false)} footer={<><button className="btn outline" onClick={()=>setOverride(false)}>{t('cancel')}</button><button className="btn danger" onClick={async()=>{ if(reason.trim().length<10) return toast(t('justificationRequired'),true); try { const r=await api.emergencyOverride(id,reason); setOverrideResult(r); toast(t('overrideLogged')); setOverride(false); setReason(''); } catch(e:any) { toast(e.message,true); } }}>{t('confirm')}</button></>}><Field label={t('writtenJustification')}><textarea className="input" rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('justificationPlaceholder')}/></Field><p className="disclaimer">{t('overrideDisclaimer')}</p></Modal>}
  </>;
}

export function DoctorPrescriptions() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast();
  const [tab,setTab]=useState('list'); const [rx,setRx]=useState<Prescription[]>([]); const [patients,setPatients]=useState<Patient[]>([]);
  const [image,setImage]=useState<string|null>(null); const [items,setItems]=useState<Medicine[]>([]); const [confidence,setConfidence]=useState(0); const [patientId,setPatientId]=useState(''); const [busy,setBusy]=useState(false); const [link,setLink]=useState(''); const [draftId,setDraftId]=useState('');
  const [zoom,setZoom]=useState(1); const [rotate,setRotate]=useState(0); const [removing,setRemoving]=useState<Prescription|null>(null);
  useEffect(()=>{ api.list<Prescription>('prescriptions').then(a=>setRx(a.filter(r=>r.doctorId===session!.user.uid))).catch((e:any)=>toast(e.message,true)); api.searchPatients('').then(a=>{setPatients(a);setPatientId(a[0]?.id||'');}).catch(()=>{}); },[]);
  const file = async (f:File|undefined)=>{
    if(!f) return;
    const r=new FileReader(); r.onload=()=>setImage(String(r.result)); r.readAsDataURL(f);
    setBusy(true);
    try {
      const result=await api.extractPrescription(f);
      setItems((result.items||[]).map((m:any)=>({name:m.name||'',dosage:m.dosage||'',frequency:m.frequency||'',duration:m.duration||'',confidence:m.confidence??undefined})));
      setConfidence(result.ocrConfidence||0);
      if(!patientId) return toast(t('selectPatientFirst'),true);
      const draft=await api.createPrescription({patientId,diagnosis:t('prescriptionReviewDiagnosis'),items:result.items||[]});
      setDraftId(draft.id);
      toast(result.warnings?.length?result.warnings[0]:t('medicinesExtracted'));
    } catch(e:any){ toast(e.message,true); } finally { setBusy(false); }
  };
  const update=(i:number,k:keyof Medicine,v:string)=>setItems(a=>a.map((m,j)=>j===i?{...m,[k]:v}:m));
  const confirm=async()=>{
    if(!patientId||!items.length) return toast(t('selectPatientAndMedicines'),true);
    setBusy(true);
    try {
      let id=draftId;
      if(!id){ const draft=await api.createPrescription({patientId,diagnosis:t('prescriptionReviewDiagnosis'),items}); id=draft.id; }
      const confirmed=await api.confirmPrescription(id,items);
      setRx(a=>[confirmed,...a]);
      setLink(`${location.origin}/f/${confirmed.linkToken||''}`);
      setDraftId(''); setBusy(false); toast(t('saved')); setTab('list');
    } catch(e:any){ setBusy(false); toast(e.message,true); }
  };
  return <><PageHead title={t('prescriptions')} subtitle={t('prescriptionsSubtitleDoctor')} actions={<button className="btn primary" onClick={()=>setTab('review')}><Upload size={16}/> {t('newExtraction')}</button>}/>
    <Tabs tabs={[{id:'list',label:t('prescriptions')},{id:'review',label:t('extractionReview')}]} active={tab} onChange={setTab}/>
    {tab==='list'?<Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('patient')}</th><th>{t('extractedMedicines')}</th><th>{t('confidenceLabel')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>{rx.map(r=><tr key={r.id}><td>{new Date(r.date).toLocaleDateString()}</td><td>{r.patientName}</td><td>{r.medicines.map(m=>m.name).join(', ')}</td><td><Badge tone={r.confidence>=90?'green':'amber'}>{r.confidence}%</Badge></td><td><StatusBadge status={r.extractionStatus}/></td><td><div style={{display:'flex',gap:4}}>{r.fulfillmentLink&&<Link className="btn sm" to={r.fulfillmentLink}>{t('view')}</Link>}
          {r.status!=='confirmed'&&<button className="btn sm outline" aria-label={`${t('delete')} ${t('prescriptions')}`} onClick={()=>setRemoving(r)}><Trash2 size={14}/></button>}</div></td></tr>)}</tbody></table>{!rx.length&&<Empty/>}</div></Card>
    :<><div className="grid" style={{gridTemplateColumns:'minmax(0,1fr) minmax(0,1.3fr)',gap:16}}>
      <Card title={t('sourceDocument')} action={<div style={{display:'flex',gap:4}}><button className="btn sm outline" onClick={()=>setZoom(z=>Math.min(2.5,z+0.25))} aria-label={t('zoomIn')}>＋</button><button className="btn sm outline" onClick={()=>setZoom(z=>Math.max(.5,z-0.25))} aria-label={t('zoomOut')}>−</button><button className="btn sm outline" onClick={()=>setRotate(r=>(r+90)%360)} aria-label={t('rotate')}>⟳</button></div>}><label className="btn outline" style={{width:'100%'}}><ImageIcon size={16}/> {t('uploadPrescription')}<input type="file" accept="image/*" hidden onChange={e=>file(e.target.files?.[0])}/></label>
        <div style={{marginTop:14,minHeight:260,background:'#f7f9fc',border:'1px dashed var(--line)',borderRadius:8,display:'grid',placeItems:'center',overflow:'hidden'}}>{image?<img src={image} alt={t('uploadedPrescriptionAlt')} style={{maxWidth:'100%',maxHeight:340,transform:`scale(${zoom}) rotate(${rotate}deg)`,transition:'transform .2s'}}/>:<div className="empty"><Upload size={30}/><p>{t('uploadPrompt')}</p></div>}</div>
        <Field label={t('patient')}><select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      </Card>
      <Card title={t('extractedMedicines')} action={<Badge tone={confidence>=90?'green':'amber'}>{t('highConfidence')} ({confidence}%)</Badge>} pad={false}>
        <div className="card-body"><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('medicine')}</th><th>{t('dosage')}</th><th>{t('frequency')}</th><th>{t('duration')}</th><th/></tr></thead><tbody>{items.map((m,i)=><tr key={i}><td><input className="input" value={m.name} onChange={e=>update(i,'name',e.target.value)}/></td><td><input className="input" value={m.dosage} onChange={e=>update(i,'dosage',e.target.value)}/></td><td><input className="input" value={m.frequency} onChange={e=>update(i,'frequency',e.target.value)}/></td><td><input className="input" value={m.duration} onChange={e=>update(i,'duration',e.target.value)}/></td><td><button className="btn sm danger" onClick={()=>setItems(a=>a.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>
        <button className="btn sm" style={{marginTop:8}} onClick={()=>setItems(a=>[...a,{name:'',dosage:'',frequency:'',duration:''}])}><Plus size={14}/> {t('addMedication')}</button>
        <p className="disclaimer" style={{marginTop:12}}>{t('extractionDisclaimer')}</p>
        <div style={{display:'flex',gap:8,marginTop:12}}><button className="btn outline" onClick={()=>{if(window.confirm(t('clear'))){setItems([]);setImage(null);}}}>{t('clear')}</button><button className="btn primary" onClick={()=>void confirm()} disabled={busy||!items.length}>{t('confirmGenerateLink')}</button></div>
        {link && <div className="alert green" style={{marginTop:12}}><CheckCircle2 size={16}/> {link}<br/><Link to={`/f/${link.split('/f/')[1]}`}>{t('openFulfillment')}</Link> <CopyButton value={link} label={t('copyLink')}/></div>}
      </div></Card>
    </div></>}
    {removing && <ConfirmDialog title={t('delete')} message={t('discardPrescriptionConfirm',{defaultValue:'Discard this unconfirmed extraction draft? Confirmed prescriptions are never removed.'})}
      onClose={()=>setRemoving(null)} onConfirm={()=>void (async()=>{try{await api.discardPrescription(removing.id);setRx(a=>a.map(x=>x.id===removing.id?{...x,status:'cancelled',extractionStatus:'cancelled'}:x));setRemoving(null);toast(t('saved'));}catch(e:any){toast(e.message,true);}})()}/>}
  </>;
}

export function DoctorQrTools() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast(); const nav=useNavigate();
  const [params] = useSearchParams();
  const [tab,setTab]=useState(params.get('tab')==='qr'?'qr':'nfc'); const [qr,setQr]=useState(''); const [seconds,setSeconds]=useState(900); const [token,setToken]=useState('');
  const [patients,setPatients]=useState<Patient[]>([]); const [patientId,setPatientId]=useState('');
  useEffect(()=>{ api.searchPatients('').then(a=>{setPatients(a);setPatientId(a[0]?.id||'');}).catch(()=>{}); },[]);
  useEffect(()=>{ if(!qr) return; const t=setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000); return ()=>clearInterval(t); },[qr]);
  const generate=async()=>{
    if(!patientId) return toast(t('selectPatientFirst'),true);
    try {
      const r=await api.generateConnectionQr(patientId,['records','prescriptions'],t('consultation'));
      setToken(r.token); QRCode.toDataURL(r.url).then(setQr);
      setSeconds(Math.max(1,Math.round((new Date(r.expiresAt).getTime()-Date.now())/1000)));
      toast(t('connectionQrGenerated'));
    } catch(e:any){ toast(e.message,true); }
  };
  const nfcSupported = 'NDEFReader' in window;
  const readNfc = async ()=>{
    if(!nfcSupported) return toast(t('webNfcUnsupported'),true);
    try {
      const reader = new (window as any).NDEFReader();
      const result = await new Promise<any>((resolve,reject)=>{
        reader.onreading = (event:any)=>resolve(event);
        reader.scan().catch(reject);
      });
      const raw = new TextDecoder().decode(result.message?.records?.[0]?.data || new Uint8Array());
      const resolved = await api.resolveNfc(raw);
      toast(t('nfcPatientResolved')); nav(`/app/doctor/patients/${resolved.patientId}`);
    } catch(e:any){ toast(e.message,true); }
  };
  return <><PageHead title={t('scannerTools')} subtitle={t('scannerSubtitle')}/>
    <Tabs tabs={[{id:'nfc',label:t('nfcScanner')},{id:'qr',label:t('qrGenerator')}]} active={tab} onChange={setTab}/>
    {tab==='nfc'?<div className="grid cols-2"><Card title={t('nfcScanner')}><div className="empty" style={{padding:50}}><ScanLine size={40}/><p>{t('readPatientId')}</p><button className="btn primary" onClick={()=>void readNfc()}>{t('startNfcScan')}</button><p className="disclaimer">{t('nfcChromeHint')}</p></div></Card><Card title={t('supportedTags')}><p>{t('supportedTagsDesc')}</p><Badge tone={nfcSupported?'green':'amber'}>{nfcSupported?t('webNfcAvailable'):t('webNfcUnavailable')}</Badge></Card></div>
    :<div className="grid cols-2"><Card title={t('connectionQr')}><Field label={t('patient')}><select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}</select></Field><button className="btn primary" onClick={()=>void generate()}><QrCode size={16}/> {t('generateQr')}</button>
      {qr && <div style={{textAlign:'center',marginTop:14}}><img src={qr} alt={t('connectionQrAlt')} style={{width:210,height:210}}/><div style={{fontFamily:'monospace',fontSize:12}} translate="no">{token}</div><div className={`alert ${seconds>0?'blue':'red'}`} style={{marginTop:10}}><Clock size={16}/> {seconds>0?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} ${t('remaining')}`:t('expired')}</div><a className="btn outline" href={qr} download="onemed-connection-qr.png"><DownloadIcon/> {t('downloadQr')}</a></div>}</Card>
      <Card title={t('consents')}><p style={{color:'var(--muted)'}}>{t('qrConsentHint')}</p><div className="alert blue">{t('scopeDetail')}</div></Card></div>}
  </>;
}
function DownloadIcon(){return <span>⬇</span>;}

export function DoctorMessages() {
  const {t}=useTranslation(); const {session}=useAuth(); const {toast}=useToast();
  const [convs,setConvs]=useState<Conversation[]>([]); const [active,setActive]=useState<string|null>(null);
  const [msgs,setMsgs]=useState<Message[]>([]); const [text,setText]=useState(''); const [removing,setRemoving]=useState<Conversation|null>(null);
  useEffect(()=>{ void api.listConversations().then(a=>{setConvs(a);setActive(a[0]?.id||null);}).catch((e:any)=>toast(e.message,true)); },[]);
  useEffect(()=>{ if(active) void api.listMessages(active).then(setMsgs).catch((e:any)=>toast(e.message,true)); },[active]);
  const send=async()=>{ if(!text.trim()||!active) return; await api.sendMessage(active,text); setText(''); setMsgs(await api.listMessages(active)); toast(t('saved')); };
  return <><PageHead title={t('messages')} subtitle={t('messagesSubtitleDoctor')}/>
    <div className="grid" style={{gridTemplateColumns:'minmax(0,280px) minmax(0,1fr)'}}>
      <Card pad><div className="card-body">{convs.map(c=><div key={c.id} style={{display:'flex',alignItems:'center',gap:4}}>
        <button className={`nav-item ${active===c.id?'active':''}`} style={{color:'var(--ink)',flex:1}} onClick={()=>setActive(c.id)}><span className="avatar">{c.otherName.slice(0,2).toUpperCase()}</span><span><strong>{c.otherName}</strong><div style={{fontSize:11,color:'var(--muted)'}}>{t(c.role==='lab_staff'?'labStaff':c.role)}</div></span></button>
        <button className="btn sm outline" aria-label={`${t('delete')} ${c.otherName}`} onClick={()=>setRemoving(c)}><Trash2 size={14}/></button></div>)}{!convs.length&&<Empty message={t('noConversationsYet')}/>}</div></Card>
      <Card pad={false}><div className="card-head"><h3>{convs.find(c=>c.id===active)?.otherName||'-'}</h3></div><div className="card-body"><div className="chat-log">{msgs.map(m=><div key={m.id} className={`msg ${m.senderId===session!.user.uid?'me':''}`}>{m.text}<div style={{fontSize:10,opacity:.6,marginTop:4}}>{new Date(m.sentAt).toLocaleTimeString()}</div></div>)}</div><div style={{display:'flex',gap:8,marginTop:12}}><input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder={t('typeMessage')} onKeyDown={e=>{if(e.key==='Enter')void send();}}/><button className="btn primary" onClick={()=>void send()}>{t('send')}</button></div></div></Card>
    </div>
    {removing && <ConfirmDialog title={t('delete')} message={t('removeConversationConfirm',{defaultValue:`Delete the conversation with ${removing.otherName} and its messages?`})}
      onClose={()=>setRemoving(null)} onConfirm={()=>void (async()=>{try{await api.deleteConversation(removing.id);setConvs(a=>a.filter(c=>c.id!==removing.id));if(active===removing.id){setActive(null);setMsgs([]);}setRemoving(null);toast(t('saved'));}catch(e:any){toast(e.message,true);}})()}/>}
  </>;
}

export function DoctorReports() {
  const { t } = useTranslation(); const {toast}=useToast(); const {session}=useAuth();
  const [type,setType]=useState('history'); const [patient,setPatient]=useState(''); const [patients,setPatients]=useState<Patient[]>([]);
  const [out,setOut]=useState(''); const [busy,setBusy]=useState(false);
  const isAdmin = session?.user.role==='admin' || session?.user.role==='hospital_admin';
  useEffect(()=>{ void api.searchPatients('').then(a=>{setPatients(a);setPatient(p=>p||a[0]?.id||'');}).catch(()=>{}); },[]);
  const preview=async()=>{ setBusy(true); try{ setOut(await api.reportText(type,{patientId:patient})); }catch(e:any){ toast(e.message,true); } finally{ setBusy(false); } };
  const download=async(fmt:string)=>{ try{ await api.downloadReport(type,{patientId:patient,format:fmt}); toast(t('reportGenerated')); }catch(e:any){ toast(e.message,true); } };
  const needsPatient = !['audit','population'].includes(type);
  return <><PageHead title={t('reports')} subtitle={t('reportsSubtitle')}/><div className="grid cols-2"><Card title={t('generateReport')}>
    <Field label={t('reportType')}><select className="input" value={type} onChange={e=>{setType(e.target.value);setOut('');}}>
      <option value="history">{t('reportOptionHistory')}</option>
      <option value="labs">{t('reportOptionLabs')}</option>
      <option value="clinical-summary">{t('reportOptionClinical')}</option>
      {isAdmin && <option value="audit">{t('reportOptionAudit')}</option>}
      {isAdmin && <option value="population">{t('reportOptionPopulation')}</option>}
    </select></Field>
    {needsPatient && <Field label={t('patient')}><select className="input" value={patient} onChange={e=>setPatient(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
    <button className="btn primary" onClick={()=>void preview()} disabled={busy||(needsPatient&&!patient)}>{t('generatePreview')}</button>
    <p className="disclaimer" style={{marginTop:12}}>{t('reportExpires')}</p>
  </Card>
  <Card title={t('output')}><pre style={{whiteSpace:'pre-wrap',fontSize:12,maxHeight:320,overflow:'auto'}}>{out||t('previewHint')}</pre>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:12}}>
      <button className="btn sm outline" onClick={()=>void download('pdf')} disabled={needsPatient&&!patient}>{t('exportPdf')}</button>
      <button className="btn sm outline" onClick={()=>void download('csv')} disabled={needsPatient&&!patient}>{t('download')} CSV</button>
      <button className="btn sm outline" onClick={()=>void download('json')} disabled={needsPatient&&!patient}>{t('download')} JSON</button>
      {['history','labs'].includes(type)&&<button className="btn sm outline" onClick={()=>void download('fhir')} disabled={!patient}>{t('exportFhir')}</button>}
    </div>
  </Card></div></>;
}

export function DoctorSettings() { const {session}=useAuth(); const {t}=useTranslation(); return <><PageHead title={t('settings')} subtitle={t('clinicalIdentity')}/><Card><dl style={{lineHeight:2}}><dt style={{color:'var(--muted)'}}>{t('name')}</dt><dd>{session!.user.name}</dd><dt style={{color:'var(--muted)'}}>{t('email')}</dt><dd>{session!.user.email}</dd><dt style={{color:'var(--muted)'}} translate="no">MFA</dt><dd>{session!.user.mfaEnabled?<Badge tone="green">{t('enabled')}</Badge>:<Badge tone="amber">{t('notEnabled')}</Badge>}</dd></dl></Card></>; }

/** Doctor-facing analytics: full ranges, abnormal flags and cross-test context (§3.5.4). */
export function DoctorAnalytics() {
  const { t, i18n } = useTranslation(); const {toast}=useToast();
  const [patients,setPatients]=useState<Patient[]>([]); const [pid,setPid]=useState('');
  const [data,setData]=useState<any>(null); const [summary,setSummary]=useState<any>(null); const [loading,setLoading]=useState(false);
  useEffect(()=>{void api.searchPatients('').then(a=>{setPatients(a);setPid(a[0]?.id||'');}).catch(()=>{});},[]);
  useEffect(()=>{ if(!pid) return; setLoading(true);
    void Promise.all([api.patientAnalytics(pid),api.clinicalSummary(pid)]).then(([a,s])=>{setData(a);setSummary(s);setLoading(false);}).catch((e:any)=>{toast(e.message,true);setLoading(false);});
  },[pid]);
  const ind = data?.indicators||{};
  const labs = (data?.labTrends||[]).filter((x:any)=>x.HbA1c!=null).map((x:any)=>({date:x.date,value:x.HbA1c,low:4,high:5.6}));
  const bp = data?.bloodPressure||[];
  const tone=(v:any)=>v?.flag==='high'?'red':v?.flag==='low'?'amber':'green';
  return <>
    <PageHead title={t('clinicalAnalytics')} subtitle={t('clinicalAnalyticsSubtitle')} actions={<Link className="btn outline" to={`/app/doctor/patients/${pid}`}>{t('openPatientRecord')}</Link>}/>
    <Card><Field label={t('patient')}><select className="input" value={pid} onChange={e=>setPid(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></Card>
    {loading && <SkeletonCards/>}
    {data && <>
      <div className="grid cols-4" style={{marginTop:16}}>{Object.entries(ind).filter(([,v])=>v).map(([name,v]:any)=><Card key={name} title={name}><div style={{fontSize:24,fontWeight:700}}>{v.value}<small style={{fontSize:12,color:'var(--muted)'}}> {v.unit||''}</small></div><div style={{fontSize:12,color:'var(--muted)'}}>{t('rangeLabel')} {v.low??'-'} – {v.high??'-'}</div><Badge tone={tone(v)}>{t(v.flag||'normal')}</Badge></Card>)}</div>
      <div className="grid cols-2" style={{marginTop:16}}>
        <Card title={t('hba1cTrend')}><ResponsiveContainer width="100%" height={220}><LineChart data={labs}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[4,9]}/><Tooltip/><ReferenceArea y1={4} y2={5.6} fill="#e7f7ef" fillOpacity={.7}/><Line type="monotone" dataKey="value" stroke="#d99219" strokeWidth={2.5}/></LineChart></ResponsiveContainer></Card>
        <Card title={t('bpZones')}><ResponsiveContainer width="100%" height={220}><LineChart data={bp}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[50,170]}/><Tooltip/><Legend/><ReferenceArea y1={90} y2={120} fill="#e7f6f3" fillOpacity={.5}/><Line type="monotone" dataKey="systolic" stroke="#002657" strokeWidth={2.5}/><Line type="monotone" dataKey="diastolic" stroke="#0f9d6e" strokeWidth={2.5}/></LineChart></ResponsiveContainer></Card>
      </div>
      <Card title={t('aiClinicalSummary')} style={{marginTop:16}} action={<button className="btn sm outline" onClick={()=>void api.downloadReport('history',{patientId:pid,format:'pdf'}).catch((e:any)=>toast(e.message,true))}>{t('exportPdf')}</button>}>
        <p style={{whiteSpace:'pre-wrap'}}>{summary?.text||'-'}</p><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{summary?.sources?.map((s:string)=><Badge key={s} tone="blue">{s}</Badge>)}</div><p className="disclaimer">{t('aiDisclaimer')}</p>
      </Card>
      <Card title={t('flaggedResults')} style={{marginTop:16}}><div className="grid cols-3">{(data?.lipidPanel||[]).map((v:any)=><Stat key={v.name} label={`${v.name} (${v.unit||''})`} value={v.value??'-'} sub={`${v.low??'-'} – ${v.high??'-'}`}/>)}</div></Card>
    </>}
  </>;
}
