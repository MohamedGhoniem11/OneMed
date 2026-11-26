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

type LabRow = { test:string; value:string; unit:string; ref:string; confidence:number };
const ALLOWED_UPLOAD = /\.(pdf|png|jpe?g|webp|bmp|tiff?|csv|json|fhir|dcm|dicom|txt)$/i;
const MAX_UPLOAD = 50 * 1024 * 1024;

export function LabPortal({ initialTab = 'upload' }: { initialTab?: string }) {
  const { t, i18n } = useTranslation(); const {toast}=useToast(); const {session}=useAuth();
  const [tab,setTab]=useState(initialTab); const [patientId,setPatientId]=useState(''); const [patients,setPatients]=useState<Patient[]>([]);
  const [rows,setRows] = useState<LabRow[]>([]); const [rowErrors,setRowErrors]=useState<string[]>([]);
  const [history,setHistory]=useState<MedicalRecord[]>([]); const [file,setFile]=useState<File|null>(null); const [ingestedId,setIngestedId]=useState('');
  const [batch,setBatch]=useState(''); const [manual,setManual]=useState({test:'',value:'',unit:'',ref:''});
  const [pending,setPending]=useState<MedicalRecord[]>([]); const [busy,setBusy]=useState(false); const [reviewing,setReviewing]=useState<MedicalRecord|null>(null);
  const [archiveQuery,setArchiveQuery]=useState(''); const [archiveType,setArchiveType]=useState('all');
  const load=()=>Promise.all([api.listRecords().then(setHistory), api.pendingRecords().then(setPending)]);
  useEffect(()=>{ void api.searchPatients('').then(a=>{setPatients(a);setPatientId(a[0]?.id||'');}).catch(()=>{}); void load(); },[]);

  const err = (key:string, fallback:string) => t(key, { defaultValue: fallback });
  const parseRange = (ref:string) => {
    const parts = ref.split(/[-–]/).map(s=>Number(s.trim()));
    return parts.length===2 && parts.every(Number.isFinite) && parts[0] < parts[1] ? { low:parts[0], high:parts[1] } : null;
  };
  const validate = (items:LabRow[]) => {
    const problems:string[] = [];
    items.forEach((r,i)=>{
      if (r.test.trim().length < 2) problems.push(err('invalidTestName', `Row ${i+1}: enter a test name of at least 2 characters.`));
      else if (!Number.isFinite(Number(r.value)) || r.value.trim()==='') problems.push(`${r.test}: ${err('invalidNumericValue','value must be a number.')}`);
      else if (!r.unit.trim()) problems.push(`${r.test}: ${err('invalidUnit','unit is required (e.g. mg/dL).')}`);
      else if (r.ref.trim() && !parseRange(r.ref)) problems.push(`${r.test}: ${err('invalidReference','reference range must be "low - high" with low below high.')}`);
    });
    return problems;
  };
  const toValues = (items:LabRow[]) => items.map(r=>{
    const range = parseRange(r.ref); const value = Number(r.value);
    return { name:r.test.trim(), value, unit:r.unit.trim(), referenceLow:range?.low, referenceHigh:range?.high,
      flag: !range ? 'normal' : value < range.low ? 'low' : value > range.high ? 'high' : 'normal' };
  });
  const savePanel = async (title:string, items:LabRow[], recordId?:string) => {
    if (recordId) return api.reviewRecord(recordId, toValues(items), t('verifiedByLab'));
    return api.createManualRecord({ patientId, institutionId:session!.user.institutionId, type:'lab', title,
      observedAt:new Date().toISOString(), data:{ values: toValues(items) } });
  };
  const pickFile = (f:File|undefined) => {
    if (!f) return;
    if (!ALLOWED_UPLOAD.test(f.name)) { toast(err('unsupportedFile','Unsupported file type. Use PDF, image, CSV, JSON/FHIR or DICOM.'),true); return; }
    if (f.size > MAX_UPLOAD) { toast(err('fileTooLarge','File must be 50 MB or smaller.'),true); return; }
    setFile(f); setIngestedId(''); setRows([]); setRowErrors([]);
  };
  const upload = async () => {
    if (!patientId) return toast(t('fieldRequired'),true);
    if (!file) return toast(err('chooseFile','Choose a file first.'),true);
    setBusy(true);
    try {
      const result = await api.ingestRecord(file, patientId, session!.user.institutionId);
      const extracted = result.record?.values || result.record?.data?.values || result.values || [];
      setIngestedId(result.record?.id || '');
      setRows(extracted.map((v:any)=>({ test:v.name, value:String(v.value ?? ''), unit:v.unit||'',
        ref: v.referenceLow!=null && v.referenceHigh!=null ? `${v.referenceLow} - ${v.referenceHigh}` : '',
        confidence: result.record?.confidence ?? 100 })));
      setRowErrors([]); setFile(null); setTab('verify'); await load();
      toast(extracted.length ? t('saved') : err('noValuesExtracted','No values could be extracted. Enter them manually below.'), !extracted.length);
    } catch(e:any) { toast(e.message,true); } finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!patientId) return toast(t('fieldRequired'),true);
    if (!rows.length) return toast(t('addValuesOrFile'),true);
    const problems = validate(rows); setRowErrors(problems);
    if (problems.length) return toast(err('fixErrors','Fix the highlighted values before confirming.'),true);
    setBusy(true);
    try {
      await savePanel(ingestedId ? rows[0].test : t('uploadedLabPanel'), rows, ingestedId || undefined);
      setRows([]); setRowErrors([]); setIngestedId(''); await load(); setTab('records'); toast(t('saved'));
    } catch(e:any) { toast(e.message,true); } finally { setBusy(false); }
  };
  const importBatch = async () => {
    if (!patientId) return toast(t('fieldRequired'),true);
    const lines = batch.trim().split(/\r?\n/).filter(Boolean);
    const data = lines[0]?.toLowerCase().startsWith('patientid') ? lines.slice(1) : lines;
    const parsed:LabRow[] = []; const rejected:string[] = [];
    data.forEach((line,i)=>{
      try {
        let raw:any;
        if (line.trim().startsWith('{')) raw = JSON.parse(line);
        else { const [test,value,unit,ref=''] = line.split(',').map(s=>s.trim()); raw = {test,value,unit,ref}; }
        const row:LabRow = { test:String(raw.test||raw.name||''), value:String(raw.value??''),
          unit:String(raw.unit||''), ref:String(raw.ref||raw.reference||''), confidence:100 };
        const problems = validate([row]);
        if (problems.length) rejected.push(`Row ${i+1}: ${problems[0]}`); else parsed.push(row);
      } catch { rejected.push(`Row ${i+1}: invalid format`); }
    });
    if (!parsed.length) { setRowErrors(rejected); return toast(t('noValidRows'),true); }
    setBusy(true);
    try { await savePanel(t('batchImport'), parsed); setBatch(''); setRowErrors(rejected);
      toast(t('rowsImported', {count:parsed.length}), rejected.length>0); await load(); setTab('records');
    } catch(e:any) { toast(e.message,true); } finally { setBusy(false); }
  };
  const saveManual = async () => {
    const row:LabRow = {...manual, confidence:100}; const problems = validate([row]);
    if (problems.length) { setRowErrors(problems); return toast(problems[0],true); }
    setBusy(true);
    try { await savePanel(row.test, [row]); setManual({test:'',value:'',unit:'',ref:''}); setRowErrors([]);
      toast(t('saved')); await load(); setTab('records');
    } catch(e:any) { toast(e.message,true); } finally { setBusy(false); }
  };
  const review = async (rec:MedicalRecord, values:LabRow[]) => {
    const problems = validate(values); if (problems.length) { setRowErrors(problems); return toast(problems[0],true); }
    try { await api.reviewRecord(rec.id, toValues(values), t('verifiedByLab')); setReviewing(null);
      toast(t('saved')); await load(); } catch(e:any) { toast(e.message,true); }
  };
  const date = (v:any)=>v?new Intl.DateTimeFormat(i18n.language||'en',{dateStyle:'medium'}).format(new Date(v)):'-';
  const archive = history.filter(r=>(archiveType==='all'||r.type===archiveType)
    && (!archiveQuery||`${r.title} ${r.patientId}`.toLowerCase().includes(archiveQuery.toLowerCase())));
  const patientName = (id:string)=>patients.find(p=>p.id===id)?.name||id;

  return <><PageHead title={t('labIngestionTitle')} subtitle={t('labIngestionSubtitle')}/>
    <Tabs tabs={[
      {id:'upload',label:t('upload')},{id:'batch',label:t('batchImport')},{id:'manual',label:t('manualEntry')},
      {id:'verify',label:`${t('dataVerification')}${pending.length?` (${pending.length})`:''}`},
      {id:'records',label:t('records')},
    ]} active={tab} onChange={setTab}/>
    <div className="grid cols-2" style={{alignItems:'start'}}>
      <div className="grid" style={{gap:16}}>
        <Card title={t('targetPatient')}><Field label={t('patient')} error={!patientId?t('fieldRequired'):undefined}>
          <select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)}>
            <option value="">{t('noPatientSelected')}</option>
            {patients.map(p=><option key={p.id} value={p.id}>{p.name} · {p.nationalId}</option>)}
          </select></Field><p style={{fontSize:12,color:'var(--muted)'}}>{patientId?t('patientLinked'):t('noPatientSelected')}</p></Card>
        {tab==='upload' && <Card title={t('fileUpload')}><div onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();pickFile(e.dataTransfer.files?.[0]);}}
          style={{border:'2px dashed var(--line)',borderRadius:10,padding:24,textAlign:'center'}}>
          <Upload size={28}/><p><strong>{t('dragDrop')}</strong></p><p style={{fontSize:12,color:'var(--muted)'}}>{t('uploadHint')}</p>
          <label className="btn navy">{t('browseFiles')}<input type="file" hidden
            accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.json,.fhir,.dcm,.dicom,.txt" onChange={e=>pickFile(e.target.files?.[0])}/></label>
          {file && <div className="alert green" style={{marginTop:10,padding:8,fontSize:12}}>{file.name} · {(file.size/1024).toFixed(1)} KB</div>}
          </div><button className="btn primary" style={{marginTop:12,width:'100%'}} disabled={busy||!file} onClick={()=>void upload()}>
            {busy?t('creating'):t('upload')}</button></Card>}
        {tab==='batch' && <Card title={t('batchImport')}><Field label={t('batchImportLabel')} hint="test,value,unit,reference">
          <textarea className="input" rows={8} value={batch} onChange={e=>setBatch(e.target.value)}
            placeholder={'Hemoglobin,14.2,g/dL,13.8-17.2'}/></Field>
          <button className="btn navy" style={{width:'100%'}} disabled={busy||!batch.trim()} onClick={()=>void importBatch()}>{t('importBatch')}</button></Card>}
        {tab==='manual' && <Card title={t('manualEntry')}><Field label={t('testName')}><input className="input" value={manual.test} onChange={e=>setManual({...manual,test:e.target.value})}/></Field>
          <Field label={t('value')}><input className="input" inputMode="decimal" value={manual.value} onChange={e=>setManual({...manual,value:e.target.value})}/></Field>
          <Field label={t('unit')}><input className="input" value={manual.unit} onChange={e=>setManual({...manual,unit:e.target.value})}/></Field>
          <Field label={t('referenceRange')} hint="13.8 - 17.2"><input className="input" value={manual.ref} onChange={e=>setManual({...manual,ref:e.target.value})}/></Field>
          <button className="btn navy" style={{width:'100%'}} disabled={busy} onClick={()=>void saveManual()}>{t('saveEntry')}</button></Card>}
      </div>
      <Card title={t('dataVerification')} action={<Chip tone={rows.some(r=>r.confidence<80)?'amber':'green'}>{rows.filter(r=>r.confidence<80).length} {t('unverified')}</Chip>} pad={false}>
        <div className="card-body">
          {rowErrors.length>0 && <div className="alert red" role="alert">{rowErrors.map((e,i)=><div key={i}>{e}</div>)}</div>}
          {rows.length ? <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('value')}</th><th>{t('unit')}</th><th>{t('referenceRange')}</th><th>{t('confidenceLabel')}</th></tr></thead><tbody>
            {rows.map((r,i)=><VerificationRow key={i} test={r.test} value={r.value} unit={r.unit} reference={r.ref} confidence={r.confidence}
              onChange={v=>{setRows(a=>a.map((x,j)=>j===i?{...x,value:v,confidence:100}:x));setRowErrors([]);}}/>)}</tbody></table></div>
            : <Empty message={t('extractionHint')}/>}
          <div style={{display:'flex',gap:8,marginTop:12}}><button className="btn outline" onClick={()=>{setRows([]);setRowErrors([]);setIngestedId('');}}>{t('clearData')}</button>
            <button className="btn primary" disabled={busy||!rows.length} onClick={()=>void confirm()}><CheckCircle2 size={16}/> {t('confirmLinkPatient')}</button></div>
          {tab==='verify' && <div style={{marginTop:16}}><strong>{t('pendingReview')}</strong>
            {pending.length ? pending.map(r=><div key={r.id} style={{display:'flex',justifyContent:'space-between',gap:8,padding:'8px 0',borderBottom:'1px solid var(--line)'}}>
              <span>{r.title||r.type}<span style={{color:'var(--muted)',fontSize:12}}> · {patientName(r.patientId)} · {r.confidence}%</span></span>
              <button className="btn sm outline" onClick={()=>setReviewing(r)}>{t('reviewVerify')}</button></div>) : <Empty message={t('noRecords')}/>}
          </div>}
        </div></Card>
    </div>
    {tab==='records' && <Card title={t('records')} pad={false}>
      <div style={{padding:18,display:'flex',gap:8,flexWrap:'wrap'}}><input className="input" placeholder={t('search')} value={archiveQuery} onChange={e=>setArchiveQuery(e.target.value)}/>
        <select className="input" value={archiveType} onChange={e=>setArchiveType(e.target.value)}>{['all','lab','vital','imaging','visit','note'].map(x=><option key={x} value={x}>{t(x==='all'?'all':x)}</option>)}</select></div>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('patient')}</th><th>{t('name')}</th><th>{t('value')}</th><th>{t('confidenceLabel')}</th><th>{t('status')}</th></tr></thead><tbody>
        {archive.map(r=><tr key={r.id}><td>{date(r.date)}</td><td>{patientName(r.patientId)}</td><td><strong>{r.title}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{r.summary}</div></td>
          <td style={{fontSize:12}}>{(r.values||[]).slice(0,3).map((v:any)=>`${v.name} ${v.value}${v.unit}`).join(' · ')||'-'}</td>
          <td>{r.confidence!=null?`${r.confidence}%`:'-'}</td><td><StatusBadge status={r.status||'normal'}/></td></tr>)}</tbody></table>{!archive.length&&<Empty/>}</div>
    </Card>}
    {reviewing && <ReviewDialog record={reviewing} patients={patients} onClose={()=>setReviewing(null)} onSave={values=>void review(reviewing,values)}/>}
  </>;
}

function ReviewDialog({record,patients,onClose,onSave}:{record:MedicalRecord;patients:Patient[];onClose:()=>void;onSave:(rows:LabRow[])=>void}) {
  const {t}=useTranslation();
  const [rows,setRows]=useState<LabRow[]>((record.values||[]).map((v:any)=>({ test:v.name, value:String(v.value??''), unit:v.unit||'',
    ref:v.referenceLow!=null&&v.referenceHigh!=null?`${v.referenceLow} - ${v.referenceHigh}`:'', confidence:100 })));
  return <Modal title={`${t('reviewVerify')}: ${record.title}`} onClose={onClose}
    footer={<><button className="btn outline" onClick={onClose}>{t('cancel')}</button><button className="btn primary" onClick={()=>onSave(rows)}>{t('confirm')}</button></>}>
    <p style={{color:'var(--muted)',fontSize:13}}>{patients.find(p=>p.id===record.patientId)?.name||record.patientId} · {record.confidence}%</p>
    <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('value')}</th><th>{t('unit')}</th><th>{t('referenceRange')}</th></tr></thead><tbody>
      {rows.map((r,i)=><tr key={i}><td>{r.test}</td><td><input className="input" inputMode="decimal" value={r.value} onChange={e=>setRows(a=>a.map((x,j)=>j===i?{...x,value:e.target.value}:x))}/></td>
        <td>{r.unit||'-'}</td><td>{r.ref||'-'}</td></tr>)}</tbody></table></div>
  </Modal>;
}

export function PharmacyPortal() {
  const { t } = useTranslation(); const {toast}=useToast(); const {session}=useAuth();
  const [rx,setRx]=useState<Prescription[]>([]); const [tab,setTab]=useState('inbox'); const [chat,setChat]=useState<Prescription|null>(null); const [text,setText]=useState(''); const [chatMsgs,setChatMsgs]=useState<any[]>([]); const [conversationId,setConversationId]=useState('');
  const steps:OrderStatus[]=['received','verifying','preparing','ready','handed_over','completed'];
  useEffect(()=>{ void api.pharmacyOrders().then(setRx).catch(()=>{}); },[]);
  const advance=async(r:Prescription)=>{ try{ const updated=await api.advanceOrder(r.id); setRx(a=>a.map(x=>x.id===r.id?{...x,orderStatus:updated.orderStatus}:x)); toast(`${r.patientName}: ${updated.orderStatus}`); }catch(e:any){ toast(e.message,true); } };
  const openChat=async(r:Prescription)=>{ setChat(r); setText('');
    try{ const c=await api.createConversation({patientId:r.patientId,otherUserId:session!.user.uid,otherName:session!.user.name,role:'pharmacy'}); setConversationId(c.id);
      const msgs=await api.listMessages(c.id); setChatMsgs(msgs);
    }catch(e:any){ toast(e.message,true); }
  };
  const sendChat=async()=>{ if(!text.trim()||!conversationId) return; try{ await api.sendMessage(conversationId,text); setChatMsgs(await api.listMessages(conversationId)); setText(''); }catch(e:any){ toast(e.message,true); } };
  return <><PageHead title={t('inbox')} subtitle={t('pharmacySubtitle')}/>
    <Tabs tabs={[{id:'inbox',label:t('inbox')},{id:'flow',label:t('fulfillmentFlow')}]} active={tab} onChange={setTab}/>
    {tab==='inbox'?<Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('patient')}</th><th>{t('doctor')}</th><th>{t('medicines')}</th><th>{t('orderStatus')}</th><th>{t('action')}</th></tr></thead><tbody>{rx.map(r=><tr key={r.id}><td><strong>{r.patientName}</strong></td><td>{r.doctorName}</td><td>{(r.medicines||[]).map(m=>`${m.name} ${m.dosage}`).join(', ')}</td><td><StatusBadge status={r.orderStatus||'received'}/></td><td><div style={{display:'flex',gap:4}}><button className="btn sm primary" onClick={()=>advance(r)}>{t('advance')}</button><button className="btn sm outline" onClick={()=>void openChat(r)}><MessageCircle size={14}/> {t('chat')}</button></div></td></tr>)}</tbody></table>{!rx.length&&<Empty/>}</div></Card>
    :<Card title={t('fulfillmentFlow')}><div className="grid cols-3">{steps.map((s,i)=><div key={s} className="card" style={{boxShadow:'none'}}><Badge tone="blue">{i+1}</Badge><h3 style={{marginTop:8}}>{t(s)}</h3><p style={{color:'var(--muted)',fontSize:12}}>{t('orderState')} {t(s)}</p></div>)}</div></Card>}
    {chat && <Modal title={`${t('messages')} - ${chat.patientName}`} onClose={()=>setChat(null)}>
      <div className="chat-log"><div className="msg me">{(chat.medicines||[]).map(m=>`${m.name} ${m.dosage} - ${m.frequency}`).join('\n')}</div>
        {chatMsgs.map(m=><div key={m.id} className={`msg ${m.senderId===session!.user.uid?'me':''}`}>{m.text}</div>)}</div>
      <div style={{display:'flex',gap:8,marginTop:12}}><input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder={t('messagePatient')} onKeyDown={e=>{if(e.key==='Enter')void sendChat();}}/><button className="btn primary" onClick={()=>void sendChat()}><SendIcon/></button></div>
    </Modal>}
  </>;
}
/** Send glyph mirrored when the document switches to RTL ([dir=rtl]). */
function SendIcon(){ const { i18n } = useTranslation(); return <span aria-hidden="true" style={{display:'inline-block',transform:i18n.language==='ar'?'scaleX(-1)':undefined}}>➤</span>; }

export function PharmacyProfile() {
  const { t } = useTranslation(); const {toast}=useToast(); const [profile,setProfile]=useState<any>(null);
  useEffect(()=>{void api.pharmacyProfile().then(setProfile).catch(()=>{});},[]);
  const save=async(patch:any)=>{ if(!profile?.id) return; try{ const updated=await api.updatePharmacyProfile(profile.id,patch); setProfile(updated); toast(t('saved')); }catch(e:any){ toast(e.message,true); } };
  return <><PageHead title={t('settings')} subtitle={t('pharmacySettingsSubtitle')}/>
    <div className="grid cols-2"><Card title={t('pharmacyDetails')}><Field label={t('name')}><input className="input" value={profile?.name||''} onChange={e=>setProfile({...profile,name:e.target.value})}/></Field><Field label={t('address')}><input className="input" value={profile?.address||''} onChange={e=>setProfile({...profile,address:e.target.value})}/></Field><Field label={t('whatsappNumber')}><input className="input" value={profile?.whatsapp||''} onChange={e=>setProfile({...profile,whatsapp:e.target.value})}/></Field><Field label={t('phoneNumber')}><input className="input" value={profile?.phone||''} onChange={e=>setProfile({...profile,phone:e.target.value})}/></Field><button className="btn primary" onClick={()=>void save({name:profile?.name,address:profile?.address,whatsapp:profile?.whatsapp,phone:profile?.phone})}>{t('save')}</button></Card>
      <Card title={t('gpsHours')}><Field label={t('latitude')}><input className="input" type="number" value={profile?.location?.lat??profile?.lat??''} onChange={e=>setProfile({...profile,location:{...profile?.location,lat:Number(e.target.value)}})}/></Field><Field label={t('longitude')}><input className="input" type="number" value={profile?.location?.lng??profile?.lng??''} onChange={e=>setProfile({...profile,location:{...profile?.location,lng:Number(e.target.value)}})}/></Field><Field label={t('operatingHours')}><input className="input" value={profile?.hours||profile?.openingHours||''} onChange={e=>setProfile({...profile,hours:e.target.value,openingHours:e.target.value})}/></Field><button className="btn outline" onClick={()=>void save({location:profile?.location,hours:profile?.hours,openingHours:profile?.hours})}><MapPin size={16}/> {t('updateLocation')}</button><p className="disclaimer" style={{marginTop:12}}>{t('distanceHint')}</p></Card></div></>;
}

export function HospitalAdmin() {
  const { t } = useTranslation(); const {session}=useAuth(); const {toast}=useToast();
  const [users,setUsers]=useState<User[]>([]); const [insts,setInsts]=useState<Institution[]>([]);
  const [records,setRecords]=useState<MedicalRecord[]>([]); const [credits,setCredits]=useState<any>(null);
  const myInstitution = insts.find(i=>i.id===session!.user.institutionId);
  useEffect(()=>{
    void api.list<User>('users').then(setUsers).catch(()=>{});
    void api.list<Institution>('institutions').then(setInsts).catch(()=>{});
    void api.listRecords().then(setRecords).catch(()=>{});
    void api.creditBalance().then(setCredits).catch(()=>{});
  },[]);
  const contribution = Object.entries(records.reduce((acc:any,r:any)=>{const k=String(r.date||'').slice(0,7);if(k)acc[k]=(acc[k]||0)+1;return acc;},{})).map(([m,n])=>({m,n}));
  return <><PageHead title={`${t('overview')} - ${t('hospitalAdmin')}`} subtitle={t('hospitalSubtitle')}/>
    <div className="grid cols-4"><Stat label={t('activeStaff')} value={users.filter(u=>u.status==='active').length}/><Stat label={t('recordsUploaded')} value={records.length}/><Stat label={t('creditBalance')} value={credits?.balance??'-'}/><Stat label={t('institution')} value={<Badge tone={myInstitution?.verified?'green':'amber'}>{myInstitution?.verified?t('verified'):t('pendingVerification')}</Badge>}/></div>
    <div className="grid cols-2" style={{marginTop:16}}><Card title={t('institution')}><p><strong>{myInstitution?.name||t('noneRecorded')}</strong></p><p style={{color:'var(--muted)'}}>{myInstitution?.address||'-'}</p><p style={{fontSize:12,color:'var(--muted)'}}>{myInstitution?.contactEmail||'-'}</p></Card>
      <Card title={t('dataContribution')} action={<Link className="btn sm outline" to="/app/hospital/analytics">{t('viewAll')}</Link>}>
        {contribution.length?<ResponsiveContainer width="100%" height={180}><BarChart data={contribution}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="m"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="n" fill="#006a61"/></BarChart></ResponsiveContainer>:<Empty message={t('noContributions')}/>}
      </Card></div>
    <Card title={t('exportPdf')} style={{marginTop:16}}><p style={{color:'var(--muted)',fontSize:13}}>{t('reportsIntro')}</p><button className="btn outline" onClick={()=>void api.downloadReport('population',{format:'pdf',institutionId:session!.user.institutionId}).then(()=>toast(t('saved'))).catch((e:any)=>toast(e.message,true))}>{t('exportPdf')}</button></Card>
  </>;
}
export function HospitalStaff() { const {t}=useTranslation(); const {session}=useAuth(); const [users,setUsers]=useState<User[]>([]); const [q,setQ]=useState('');
  useEffect(()=>{void api.list<User>('users').then(setUsers).catch(()=>{});},[]);
  const visible=users.filter(u=>`${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q.toLowerCase()));
  return <><PageHead title={t('staffManagement')} subtitle={t('hospitalStaffSubtitle')}/><Card pad><div style={{padding:18}}><input className="input" placeholder={t('search')} value={q} onChange={e=>setQ(e.target.value)}/></div>
    <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('role')}</th><th>{t('institution')}</th><th>{t('status')}</th></tr></thead><tbody>
      {visible.map(u=><tr key={u.uid}><td>{u.name}</td><td>{u.email}</td><td><Badge>{t(u.role==='lab_staff'?'labStaff':u.role)}</Badge></td><td>{u.institutionId||session!.user.institutionId||'-'}</td><td><StatusBadge status={u.status||'active'}/></td></tr>)}</tbody></table>{!visible.length&&<Empty/>}</div></Card></>; }
export function HospitalConnections() { const {t}=useTranslation(); const {session}=useAuth(); const [insts,setInsts]=useState<Institution[]>([]); const [detail,setDetail]=useState<Institution|null>(null);
  useEffect(()=>{void api.list<Institution>('institutions').then(setInsts).catch(()=>{});},[]);
  const mine=insts.filter(i=>i.id===session!.user.institutionId||i.type==='laboratory');
  return <><PageHead title={t('connections')} subtitle={t('connectionsSubtitle')}/>
    <div className="grid cols-2">{mine.map(i=><Card key={i.id} title={i.name} action={<StatusBadge status={i.verified?'connected':'pending_verification'}/>}>
      <p style={{fontSize:13}}>{i.type} · {i.city}</p><p style={{fontSize:12,color:'var(--muted)'}} translate="no">{i.contactEmail||'-'} · {i.contactPhone||'-'}</p>
      <button className="btn sm outline" onClick={()=>setDetail(i)}>{t('review')}</button></Card>)}</div>
    {!mine.length&&<Empty message={t('noRecords')}/>}
    <p className="disclaimer" style={{marginTop:12}}>{t('connectionRequestHint',{defaultValue:'To add or edit an integration, contact the system administrator.'})}</p>
    {detail && <Modal title={detail.name} onClose={()=>setDetail(null)} footer={<button className="btn outline" onClick={()=>setDetail(null)}>{t('close')}</button>}>
      <dl style={{lineHeight:2}}><dt style={{color:'var(--muted)'}}>{t('license')}</dt><dd translate="no">{detail.licenseNumber||'-'}</dd>
        <dt style={{color:'var(--muted)'}}>{t('address')}</dt><dd>{detail.address||'-'}</dd>
        <dt style={{color:'var(--muted)'}}>{t('status')}</dt><dd><StatusBadge status={detail.verified?'connected':'pending_verification'}/></dd></dl>
    </Modal>}
  </>; }
export function HospitalAnalytics(){ const {t}=useTranslation(); const {toast}=useToast(); const [stats,setStats]=useState<any>(null);
  useEffect(()=>{void api.populationAnalytics().then(setStats).catch(()=>{});},[]);
  const visits=Object.entries(stats?.visitsByMonth||{}).map(([m,v])=>({m,v}));
  return <><PageHead title={t('population')} subtitle={t('populationSubtitle')} actions={<button className="btn outline" onClick={()=>void api.downloadReport('population',{format:'pdf'}).then(()=>toast(t('saved'))).catch((e:any)=>toast(e.message,true))}>{t('exportPdf')}</button>}/>
    <div className="grid cols-4"><Stat label={t('patients')} value={stats?.totalPatients??'-'}/><Stat label={t('records')} value={stats?.totalRecords??'-'}/><Stat label={t('cities')} value={Object.keys(stats?.patientsByCity||{}).length}/><Stat label={t('conditions')} value={Object.keys(stats?.conditionCounts||{}).length}/></div>
    <Card style={{marginTop:16}}><ResponsiveContainer width="100%" height={260}><BarChart data={visits.length?visits:[{m:t('noData'),v:0}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="m"/><YAxis/><Tooltip/><Bar dataKey="v" fill="#002657"/></BarChart></ResponsiveContainer><p className="disclaimer">{t('aggregateDisclaimer')}</p></Card></>; }

export function AdminOverview() {
  const { t }=useTranslation(); const [users,setUsers]=useState<User[]>([]); const [insts,setInsts]=useState<Institution[]>([]);
  const [pharms,setPharms]=useState<Pharmacy[]>([]); const [audit,setAudit]=useState<AuditEntry[]>([]); const [chain,setChain]=useState<any>(null);
  useEffect(()=>{
    void api.list<User>('users').then(setUsers).catch(()=>{});
    void api.list<Institution>('institutions').then(setInsts).catch(()=>{});
    void api.list<Pharmacy>('pharmacies').then(setPharms).catch(()=>{});
    void api.auditEntries().then(setAudit).catch(()=>{});
    void api.verifyAuditChain().then(setChain).catch(()=>{});
  },[]);
  return <><PageHead title={t('overview')} subtitle={t('systemConfig')}/>
    <div className="grid cols-4"><Stat label={t('activeStaff')} value={users.filter(u=>u.status==='active').length}/><Stat label={t('institutions')} value={insts.length}/><Stat label={t('pharmacies')} value={pharms.length}/><Stat label={t('audit')} value={audit.length}/></div>
    <div className="grid cols-2" style={{marginTop:16}}><Card title={t('auditFeed')} pad={false}><div className="card-body">{audit.slice(0,6).map((a:any)=><div key={a.id} style={{padding:'8px 0',borderBottom:'1px solid var(--line)'}}><Badge tone="blue">{a.action}</Badge><div style={{fontSize:12}}>{a.actorName||a.actorId||'-'} · {new Date(a.createdAt||a.timestamp).toLocaleString()}</div></div>)}{!audit.length&&<Empty/>}</div></Card>
      <Card title={t('systemHealth')}><div className="grid cols-2"><Stat label={t('hashChain')} value={<Badge tone={chain?.valid===false?'red':'green'}>{chain?.valid===false?t('invalidChain',{defaultValue:'Invalid'}):t('valid')}</Badge>}/>
        <Stat label={t('audit')} value={chain?.count??'-'}/></div><p style={{color:'var(--muted)',fontSize:12,marginTop:12}}>{t('securityActive')}</p>
        <Link className="btn sm outline" to="/app/admin/audit" style={{marginTop:8}}>{t('viewAll')}</Link></Card></div>
    <Card title={t('connections')} style={{marginTop:16}} action={<Link className="btn sm outline" to="/app/admin/institutions">+ {t('institutions')}</Link>} pad={false}><div className="card-body"><div className="grid cols-2">
      {insts.map(i=><div className="card" style={{boxShadow:'none'}} key={i.id}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong>{i.name}</strong><StatusBadge status={i.verified?'connected':'pending_verification'}/></div>
        <p style={{color:'var(--muted)',fontSize:12}}>{i.type} · {i.city} · {i.licenseNumber}</p></div>)}
      {!insts.length&&<Empty/>}
    </div></div></Card></>;
}
export function AdminUsers() {
  const {t}=useTranslation(); const {toast}=useToast(); const [users,setUsers]=useState<User[]>([]);
  const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [errors,setErrors]=useState<string[]>([]);
  const [form,setForm]=useState({name:'',email:'',password:'',role:'lab_staff' as any,phone:''});
  const [editing,setEditing]=useState<User|null>(null); const [editForm,setEditForm]=useState({name:'',phone:'',role:''});
  const [q,setQ]=useState('');
  const load=()=>api.list<User>('users').then(setUsers).catch(()=>{});
  useEffect(()=>{void load();},[]);
  const create=async()=>{
    const problems:string[]=[];
    if(form.name.trim().length<2) problems.push(t('fieldRequired'));
    if(!/^\S+@\S+\.\S+$/.test(form.email)) problems.push(t('invalidEmail'));
    if(!/^01\d{9}$/.test(form.phone)) problems.push(t('invalidPhone'));
    if(form.password.length<8) problems.push(t('passwordShort'));
    setErrors(problems); if(problems.length) return;
    setBusy(true);
    try { await api.createStaffAccount({name:form.name,email:form.email,password:form.password,role:form.role,phone:form.phone,emergencyContact:{name:'-',relationship:'-',phone:'0100000000'}});
      setOpen(false); setErrors([]); setForm({name:'',email:'',password:'',role:'lab_staff' as any,phone:''}); void load(); toast(t('staffAccountCreated'));
    } catch(e:any) { toast(e.message,true); } finally { setBusy(false); }
  };
  const openEditor=(u:User)=>{ setEditing(u); setEditForm({name:u.name||'',phone:u.phone||'',role:u.role||''}); setErrors([]); };
  const saveEditor=async()=>{
    if(!editing) return; const problems:string[]=[];
    if(editForm.name.trim().length<2) problems.push(t('fieldRequired'));
    if(editForm.phone && !/^01\d{9}$/.test(editForm.phone)) problems.push(t('invalidPhone'));
    setErrors(problems); if(problems.length) return;
    setBusy(true);
    try {
      if(editForm.name!==editing.name || editForm.phone!==editing.phone) await api.updateUserAdmin(editing.uid,{name:editForm.name,phone:editForm.phone});
      if(editForm.role!==editing.role) await api.setUserRoleAdmin(editing.uid,editForm.role);
      setEditing(null); void load(); toast(t('saved'));
    } catch(e:any) { toast(e.message,true); } finally { setBusy(false); }
  };
  const visible=users.filter(u=>`${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q.toLowerCase()));
  return <><PageHead title={t('staffManagement')} subtitle={t('systemConfig')} actions={<button className="btn primary" onClick={()=>{setErrors([]);setOpen(true);}}><Plus size={16}/> {t('addUser')}</button>}/>
    <Card pad><div style={{padding:18}}><input className="input" placeholder={t('search')} value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('role')}</th><th>{t('institution')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>
        {visible.map(u=><tr key={u.uid}><td>{u.name}</td><td>{u.email}</td><td><Badge>{t(u.role==='lab_staff'?'labStaff':u.role)}</Badge></td><td>{u.institutionId||'-'}</td><td><StatusBadge status={u.status||'active'}/></td>
          <td><button className="btn sm outline" onClick={()=>openEditor(u)}>{t('edit')}</button></td></tr>)}</tbody></table>{!visible.length&&<Empty/>}</div></Card>
    {open && <Modal title={t('addUser')} onClose={()=>setOpen(false)} footer={<><button className="btn outline" onClick={()=>setOpen(false)}>{t('cancel')}</button><button className="btn primary" disabled={busy} onClick={()=>void create()}>{busy?t('creating'):t('submit')}</button></>}>
      {errors.length>0 && <div className="alert red" role="alert">{errors.map((e,i)=><div key={i}>{e}</div>)}</div>}
      <Field label={t('name')} error={errors.includes(t('fieldRequired'))?t('fieldRequired'):undefined}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
      <Field label={t('email')}><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
      <Field label={t('phoneNumber')}><input className="input" inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
      <Field label={t('password')}><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field>
      <Field label={t('role')}><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value as any})}>{['lab_staff','pharmacy','hospital_admin','admin'].map(r=><option key={r} value={r}>{t(r==='lab_staff'?'labStaff':r==='hospital_admin'?'hospitalAdmin':r)}</option>)}</select></Field></Modal>}
    {editing && <Modal title={`${t('edit')}: ${editing.name}`} onClose={()=>setEditing(null)} footer={<><button className="btn outline" onClick={()=>setEditing(null)}>{t('cancel')}</button><button className="btn primary" disabled={busy} onClick={()=>void saveEditor()}>{t('save')}</button></>}>
      {errors.length>0 && <div className="alert red" role="alert">{errors.map((e,i)=><div key={i}>{e}</div>)}</div>}
      <Field label={t('name')}><input className="input" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/></Field>
      <Field label={t('phoneNumber')}><input className="input" inputMode="tel" value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})}/></Field>
      <Field label={t('role')}><select className="input" value={editForm.role} onChange={e=>setEditForm({...editForm,role:e.target.value})}>
        {['patient','doctor','lab_staff','pharmacy','hospital_admin','admin'].map(r=><option key={r} value={r}>{t(r==='lab_staff'?'labStaff':r==='hospital_admin'?'hospitalAdmin':r)}</option>)}</select></Field>
      <p className="disclaimer">{t('roleChangeHint',{defaultValue:'Role changes take effect the next time this user signs in.'})}</p></Modal>}
  </>; }
export function AdminInstitutions(){
  const {t}=useTranslation(); const {toast}=useToast(); const [list,setList]=useState<Institution[]>([]);
  const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [errors,setErrors]=useState<string[]>([]);
  const [form,setForm]=useState({name:'',type:'hospital',licenseNumber:'',city:'',address:'',contactEmail:'',contactPhone:''});
  const load=()=>api.list<Institution>('institutions').then(setList).catch(()=>{});
  useEffect(()=>{void load();},[]);
  const verify=(x:Institution)=>{void api.verifyInstitution(x.id).then(()=>{void load();toast(t('verifyLicense'));}).catch((e:any)=>toast(e.message,true));};
  const create=async()=>{
    const problems:string[]=[];
    if(form.name.trim().length<2) problems.push(t('fieldRequired'));
    if(!form.licenseNumber.trim()) problems.push(t('license'));
    if(!/^\S+@\S+\.\S+$/.test(form.contactEmail)) problems.push(t('invalidEmail'));
    setErrors(problems); if(problems.length) return;
    setBusy(true);
    try { await api.createInstitution({...form,verified:false,active:true}); setOpen(false); setErrors([]);
      setForm({name:'',type:'hospital',licenseNumber:'',city:'',address:'',contactEmail:'',contactPhone:''});
      void load(); toast(t('saved'));
    } catch(e:any) { toast(e.message,true); } finally { setBusy(false); }
  };
  return <><PageHead title={t('institutions')} subtitle={t('institutionsSubtitle')} actions={<button className="btn primary" onClick={()=>{setErrors([]);setOpen(true);}}><Plus size={16}/> {t('addInstitution',{defaultValue:'Add institution'})}</button>}/>
    <Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('type')}</th><th>{t('license')}</th><th>{t('city')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>
      {list.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.type}</td><td style={{fontFamily:'monospace'}}>{x.licenseNumber}</td><td>{x.city}</td><td><StatusBadge status={x.verified?'verified':'pending_verification'}/></td>
        <td>{!x.verified&&<button className="btn sm primary" onClick={()=>verify(x)}><ShieldCheck size={14}/> {t('verifyLicense')}</button>}</td></tr>)}</tbody></table>{!list.length&&<Empty/>}</div></Card>
    {open && <Modal title={t('addInstitution',{defaultValue:'Add institution'})} onClose={()=>setOpen(false)} footer={<><button className="btn outline" onClick={()=>setOpen(false)}>{t('cancel')}</button><button className="btn primary" disabled={busy} onClick={()=>void create()}>{t('submit')}</button></>}>
      {errors.length>0 && <div className="alert red" role="alert">{errors.map((e,i)=><div key={i}>{e}</div>)}</div>}
      <Field label={t('name')}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
      <Field label={t('type')}><select className="input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{['hospital','laboratory','clinic'].map(x=><option key={x} value={x}>{x}</option>)}</select></Field>
      <Field label={t('license')}><input className="input" value={form.licenseNumber} onChange={e=>setForm({...form,licenseNumber:e.target.value})}/></Field>
      <Field label={t('city')}><input className="input" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field>
      <Field label={t('address')}><input className="input" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field>
      <Field label={t('contactEmail',{defaultValue:'Contact email'})}><input className="input" type="email" value={form.contactEmail} onChange={e=>setForm({...form,contactEmail:e.target.value})}/></Field>
      <Field label={t('contactPhone',{defaultValue:'Contact phone'})}><input className="input" inputMode="tel" value={form.contactPhone} onChange={e=>setForm({...form,contactPhone:e.target.value})}/></Field>
    </Modal>}
  </>; }
export function AdminPharmacies(){ const {t}=useTranslation(); const {toast}=useToast(); const [list,setList]=useState<Pharmacy[]>([]); useEffect(()=>{api.list<Pharmacy>('pharmacies').then(setList).catch(()=>{});},[]);
  const approve=(x:Pharmacy)=>{void api.approvePharmacy(x.id).then(()=>{api.list<Pharmacy>('pharmacies').then(setList).catch(()=>{});toast(t('pharmacyApproved'));}).catch((e:any)=>toast(e.message,true));};
  return <><PageHead title={t('pharmacies')} subtitle={t('pharmaciesSubtitle')}/><Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('city')}</th><th translate="no">WhatsApp</th><th>{t('status')}</th><th>{t('fee')}</th><th>{t('action')}</th></tr></thead><tbody>{list.map(x=><tr key={x.id}><td><Store size={14}/> {x.name}</td><td>{x.city}</td><td translate="no">{x.whatsapp}</td><td><StatusBadge status={x.status}/></td><td>{x.monthlyFee} EGP</td><td>{x.status==='pending'&&<button className="btn sm primary" onClick={()=>approve(x)}>{t('approve')}</button>}</td></tr>)}</tbody></table></div></Card></>; }
export function AdminAudit(){ const {t}=useTranslation(); const {toast}=useToast(); const [list,setList]=useState<any[]>([]); const [check,setCheck]=useState<any>(null);
  useEffect(()=>{void api.auditEntries().then(setList).catch(()=>{});},[]);
  const verify=async()=>{try{const v=await api.verifyAuditChain();setCheck(v);toast(v.valid?t('hashChainValidShort'):t('hashChainBrokenShort'),!v.valid);}catch(e:any){toast(e.message,true);}};
  return <><PageHead title={t('audit')} subtitle={t('auditSubtitle')} actions={<div style={{display:'flex',gap:8}}><button className="btn outline" onClick={()=>void verify()}><ShieldCheck size={16}/> {t('verifyChain')}</button><button className="btn outline" onClick={()=>void api.downloadReport('audit',{format:'csv'}).catch((e:any)=>toast(e.message,true))}>{t('exportCsv')}</button><button className="btn outline" onClick={()=>void api.downloadReport('audit',{format:'pdf'}).catch((e:any)=>toast(e.message,true))}>{t('exportPdf')}</button></div>}/>
    {check && <div className={check.valid?'alert green':'alert red'}><CheckCircle2 size={16}/> {check.valid?t('hashChainValid', {count:check.count}):t('hashChainBroken', {reason:check.reason, time:check.brokenAt})}</div>}
    <Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('actor')}</th><th>{t('action')}</th><th>{t('resource')}</th><th translate="no">IP</th><th translate="no">Hash</th></tr></thead><tbody>{list.map(a=><tr key={a.id}><td>{new Date(a.createdAt||a.timestamp).toLocaleString()}</td><td>{a.actorName||a.actorId||'-'}</td><td><Badge tone="blue">{a.action}</Badge></td><td>{a.resource||`${a.resourceType||''}/${a.resourceId||''}`}</td><td>{a.ip}</td><td style={{fontFamily:'monospace',fontSize:10}}>{String(a.hash||'').slice(0,12)}…</td></tr>)}</tbody></table>{!list.length&&<Empty/>}</div></Card></>; }
export function AdminReports(){ const {t}=useTranslation(); const {toast}=useToast();
  const dl=(type:string,fmt:string)=>void api.downloadReport(type,{format:fmt}).then(()=>toast(t('saved'))).catch((e:any)=>toast(e.message,true));
  return <><PageHead title={t('complianceReports')} subtitle={t('complianceReportsSubtitle')}/><div className="grid cols-2"><Card title={t('complianceDownloads')}><p style={{color:'var(--muted)'}}>{t('complianceDownloadsHint')}</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button className="btn sm primary" onClick={()=>dl('audit','pdf')}>{t('exportPdf')} - {t('audit')}</button><button className="btn sm outline" onClick={()=>dl('audit','csv')}>{t('exportCsv')}</button><button className="btn sm outline" onClick={()=>dl('population','json')}>{t('download')} {t('population')} JSON</button></div></Card>
  <Card title={t('edpChecklist')}><ul><li>{t('consentExplicit')}</li><li>{t('rightAccess')}</li><li>{t('rightDeletion')}</li><li>{t('dataMinimization')}</li><li>{t('auditTrail')}</li><li>{t('encryptionTransit')}</li></ul><p className="disclaimer">{t('localizationNote')}</p></Card></div></>; }
export function AdminPopulation(){ const {t}=useTranslation(); const {toast}=useToast(); const [stats,setStats]=useState<any>(null);
  useEffect(()=>{void api.populationAnalytics().then(setStats).catch(()=>{});},[]);
  const conditions=Object.entries(stats?.conditionCounts||{}).map(([m,v])=>({m,v}));
  return <><PageHead title={t('population')} subtitle={t('populationDiseaseSubtitle')} actions={<button className="btn outline" onClick={()=>void api.downloadReport('population',{format:'csv'}).then(()=>toast(t('saved'))).catch((e:any)=>toast(e.message,true))}>{t('exportCsv')}</button>}/><Card>
    <ResponsiveContainer width="100%" height={300}><BarChart data={conditions.length?conditions:[{m:t('noData'),v:0}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="m"/><YAxis/><Tooltip/><Bar dataKey="v" fill="#006a61"/></BarChart></ResponsiveContainer>
    <p className="disclaimer">{t('aggregateDisclaimer2', {count:stats?.totalPatients??0})}</p></Card></>; }
