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
  const { t, i18n } = useTranslation(); const {toast}=useToast(); const {session}=useAuth();
  const [tab,setTab]=useState(initialTab); const [patientId,setPatientId]=useState(''); const [patients,setPatients]=useState<Patient[]>([]);
  const [rows,setRows] = useState<{test:string;value:string;unit:string;ref:string;confidence:number}[]>([]);
  const [history,setHistory]=useState<MedicalRecord[]>([]); const [file,setFile]=useState<File|null>(null);
  const [batch,setBatch]=useState(''); const [manual,setManual]=useState({test:'',value:'',unit:'',ref:''});
  const [pending,setPending]=useState<MedicalRecord[]>([]); const [busy,setBusy]=useState(false);
  const load=()=>Promise.all([api.listRecords(undefined,'lab').then(setHistory), api.pendingRecords().then(setPending)]);
  useEffect(()=>{ void api.searchPatients('').then(a=>{setPatients(a);setPatientId(a[0]?.id||'');}); void load(); },[]);
  const toValues=(items:typeof rows)=>items.map(r=>{
    const [lo,hi] = r.ref.split(/[-–]/).map(s=>Number(s.trim())); const value=Number(r.value);
    return {name:r.test,value,unit:r.unit,referenceLow:Number.isFinite(lo)?lo:0,referenceHigh:Number.isFinite(hi)?hi:999,
      flag:(value<lo?'low':value>hi?'high':'normal') as 'low'|'high'|'normal'};
  });
  const savePanel=async(title:string,items:typeof rows)=>{
    await api.createManualRecord({patientId, institutionId:session!.user.institutionId, type:'lab', title,
      observedAt:new Date().toISOString(), data:{values:toValues(items)}});
  };
  const confirm=async()=>{
    if(!patientId) return toast(t('fieldRequired'),true);
    setBusy(true);
    try {
      if(file) { const result=await api.ingestRecord(file,patientId,session!.user.institutionId); toast(result.record?.status==='needs_review'?t('uploadStoredLowConfidence'):t('saved')); }
      else if(rows.length) { await savePanel(t('uploadedLabPanel'),rows); toast(t('saved')); }
      else return toast(t('addValuesOrFile'),true);
      setFile(null); setRows([]); await load(); setTab('history');
    } catch(e:any) { toast(e.message,true); } finally { setBusy(false); }
  };
  const importBatch=async()=>{ if(!patientId) return toast(t('fieldRequired'),true); try{
    const lines=batch.trim().split(/\r?\n/).filter(Boolean); const data=lines[0]?.toLowerCase().startsWith('patientid')?lines.slice(1):lines;
    const parsed=data.map(l=>{const [name,value,unit,ref='']=l.split(',').map(s=>s.trim());return {test:name,value,unit,ref,confidence:100};}).filter(r=>r.test&&r.value);
    if(!parsed.length) return toast(t('noValidRows'),true);
    await savePanel(t('batchImport'),parsed); setBatch(''); toast(t('rowsImported', {count:parsed.length})); await load(); setTab('history');
  }catch(e:any){toast(e.message,true);} };
  const saveManual=async()=>{ if(!manual.test||!manual.value) return toast(t('fieldRequired'),true); try{ await savePanel(manual.test,[{...manual,confidence:100}]);setManual({test:'',value:'',unit:'',ref:''});toast(t('saved'));await load();setTab('history'); }catch(e:any){toast(e.message,true);} };
  const review=async(rec:MedicalRecord)=>{ try{ await api.reviewRecord(rec.id,rec.values||[],t('verifiedByLab'));toast(t('saved'));await load(); }catch(e:any){toast(e.message,true);} };
  const date=(v:any)=>v?new Intl.DateTimeFormat(i18n.language||'en',{dateStyle:'medium'}).format(new Date(v)):'-';
  return <><PageHead title={t('labIngestionTitle')} subtitle={t('labIngestionSubtitle')}/>
    <Tabs tabs={[{id:'upload',label:t('upload')},{id:'batch',label:t('batchImport')},{id:'manual',label:t('manualEntry')},{id:'history',label:t('records')}]} active={tab} onChange={setTab}/>
    <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(min(280px,100%),1fr))',gap:16}}>
      <div className="grid" style={{gap:16,alignContent:'start'}}>
        <Card title={t('targetPatient')}><Field label={t('patient')}><select className="input" value={patientId} onChange={e=>setPatientId(e.target.value)}>{patients.map(p=><option key={p.id} value={p.id}>{p.name} - {p.nationalId}</option>)}</select></Field><p style={{fontSize:12,color:'var(--muted)'}}>{patientId?t('patientLinked'):t('noPatientSelected')}</p></Card>
        <Card title={tab==='batch'?t('batchImport'):tab==='manual'?t('manualEntry'):t('fileUpload')}>
          {tab==='upload' && <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f){setFile(f);toast(t('selectedFile', {name:f.name}));}}} style={{border:'2px dashed var(--line)',borderRadius:10,padding:24,textAlign:'center'}}><Upload size={28}/><p><strong>{t('dragDrop')}</strong></p><p style={{fontSize:12,color:'var(--muted)'}}>{t('uploadHint')}</p><label className="btn navy"><Browse/> {t('browseFiles')}<input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.csv,.json" onChange={e=>{const f=e.target.files?.[0];if(f)setFile(f);}}/></label>{file && <div className="alert green" style={{marginTop:10,padding:8,fontSize:12}}>{file.name} · {(file.size/1024).toFixed(1)} KB</div>}</div>}
          {tab==='batch' && <><Field label={t('batchImportLabel')}><textarea className="input" rows={7} value={batch} onChange={e=>setBatch(e.target.value)} placeholder={'test,value,unit,reference\nHemoglobin,14.2,g/dL,13.8-17.2'}/></Field><button className="btn navy" style={{width:'100%'}} disabled={busy} onClick={()=>void importBatch()}>{t('importBatch')}</button></>}
          {tab==='manual' && <><Field label={t('testName')}><input className="input" value={manual.test} onChange={e=>setManual({...manual,test:e.target.value})}/></Field><Field label={t('value')}><input className="input" value={manual.value} onChange={e=>setManual({...manual,value:e.target.value})}/></Field><Field label={t('unit')}><input className="input" value={manual.unit} onChange={e=>setManual({...manual,unit:e.target.value})}/></Field><Field label={t('referenceRange')}><input className="input" value={manual.ref} onChange={e=>setManual({...manual,ref:e.target.value})}/></Field><button className="btn navy" style={{width:'100%'}} disabled={busy} onClick={()=>void saveManual()}>{t('saveEntry')}</button></>}
        </Card>
      </div>
      <Card title={t('dataVerification')} action={<Chip tone="amber">{rows.filter(r=>r.confidence<80).length} {t('unverified')}</Chip>} pad={false}><div className="card-body">
        {rows.length ? <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('value')}</th><th>{t('unit')}</th><th>{t('referenceRange')}</th><th>{t('confidenceLabel')}</th></tr></thead><tbody>{rows.map((r,i)=><VerificationRow key={i} test={r.test} value={r.value} unit={r.unit} reference={r.ref} confidence={r.confidence} onChange={(v)=>setRows(a=>a.map((x,j)=>j===i?{...x,value:v,confidence:100}:x))}/>)}</tbody></table></div> : <Empty message={t('extractionHint')}/>}
        <div style={{display:'flex',gap:8,marginTop:12}}><button className="btn outline" onClick={()=>setRows([])}>{t('clearData')}</button><button className="btn primary" disabled={busy||!file&&!rows.length} onClick={()=>void confirm()}><CheckCircle2 size={16}/> {t('confirmLinkPatient')}</button></div>
        {pending.length>0 && <div style={{marginTop:16}}><strong>{t('pendingReview')}</strong>{pending.slice(0,5).map(r=><div key={r.id} style={{display:'flex',justifyContent:'space-between',gap:8,padding:'8px 0',borderBottom:'1px solid var(--line)'}}><span>{r.title||r.type}</span><button className="btn sm outline" onClick={()=>void review(r)}>{t('reviewVerify')}</button></div>)}</div>}
      </div></Card>
    </div>
    {tab==='history' && <Card title={t('uploadHistory')} style={{marginTop:16}} pad={false}><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('patient')}</th><th>{t('date')}</th><th>{t('confidenceLabel')}</th><th>{t('status')}</th></tr></thead><tbody>{history.slice(0,10).map(r=><tr key={r.id}><td>{r.title}</td><td>{patients.find(p=>p.id===r.patientId)?.name||r.patientId}</td><td>{date(r.date)}</td><td>{r.confidence}%</td><td><StatusBadge status={r.status||'accessible'}/></td></tr>)}</tbody></table>{!history.length&&<Empty/>}</div></Card>}
  </>;
}
function Browse(){return <span/>;}

export function PharmacyPortal() {
  const { t } = useTranslation(); const {toast}=useToast(); const {session}=useAuth();
  const [rx,setRx]=useState<Prescription[]>([]); const [tab,setTab]=useState('inbox'); const [chat,setChat]=useState<Prescription|null>(null); const [text,setText]=useState(''); const [chatMsgs,setChatMsgs]=useState<any[]>([]); const [conversationId,setConversationId]=useState('');
  const steps:OrderStatus[]=['received','verifying','preparing','ready','handed_over','completed'];
  useEffect(()=>{ void api.pharmacyOrders().then(setRx); },[]);
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
  useEffect(()=>{void api.pharmacyProfile().then(setProfile);},[]);
  const save=async(patch:any)=>{ if(!profile?.id) return; try{ const updated=await api.updatePharmacyProfile(profile.id,patch); setProfile(updated); toast(t('saved')); }catch(e:any){ toast(e.message,true); } };
  return <><PageHead title={t('settings')} subtitle={t('pharmacySettingsSubtitle')}/>
    <div className="grid cols-2"><Card title={t('pharmacyDetails')}><Field label={t('name')}><input className="input" value={profile?.name||''} onChange={e=>setProfile({...profile,name:e.target.value})}/></Field><Field label={t('address')}><input className="input" value={profile?.address||''} onChange={e=>setProfile({...profile,address:e.target.value})}/></Field><Field label={t('whatsappNumber')}><input className="input" value={profile?.whatsapp||''} onChange={e=>setProfile({...profile,whatsapp:e.target.value})}/></Field><Field label={t('phoneNumber')}><input className="input" value={profile?.phone||''} onChange={e=>setProfile({...profile,phone:e.target.value})}/></Field><button className="btn primary" onClick={()=>void save({name:profile?.name,address:profile?.address,whatsapp:profile?.whatsapp,phone:profile?.phone})}>{t('save')}</button></Card>
      <Card title={t('gpsHours')}><Field label={t('latitude')}><input className="input" type="number" value={profile?.location?.lat??profile?.lat??''} onChange={e=>setProfile({...profile,location:{...profile?.location,lat:Number(e.target.value)}})}/></Field><Field label={t('longitude')}><input className="input" type="number" value={profile?.location?.lng??profile?.lng??''} onChange={e=>setProfile({...profile,location:{...profile?.location,lng:Number(e.target.value)}})}/></Field><Field label={t('operatingHours')}><input className="input" value={profile?.hours||profile?.openingHours||''} onChange={e=>setProfile({...profile,hours:e.target.value,openingHours:e.target.value})}/></Field><button className="btn outline" onClick={()=>void save({location:profile?.location,hours:profile?.hours,openingHours:profile?.hours})}><MapPin size={16}/> {t('updateLocation')}</button><p className="disclaimer" style={{marginTop:12}}>{t('distanceHint')}</p></Card></div></>;
}

export function HospitalAdmin() {
  const { t } = useTranslation(); const {session}=useAuth(); const {toast}=useToast();
  const [users,setUsers]=useState<User[]>([]); const [insts,setInsts]=useState<Institution[]>([]); const [records,setRecords]=useState<MedicalRecord[]>([]); const [credits,setCredits]=useState<any>(null);
  useEffect(()=>{void api.list<User>('users').then(setUsers);void api.list<Institution>('institutions').then(setInsts);void api.list<MedicalRecord>('records').then(setRecords);void api.creditBalance().then(setCredits).catch(()=>{});},[]);
  const contribution = Object.entries(records.reduce((acc:any,r:any)=>{const k=String(r.date||r.observedAt||'').slice(0,7)||'unknown';acc[k]=(acc[k]||0)+1;return acc;},{})).map(([m,n])=>({m,n}));
  return <><PageHead title={`${t('overview')} - ${t('hospitalAdmin')}`} subtitle={t('hospitalSubtitle')}/>
    <div className="grid cols-4"><Stat label={t('activeStaff')} value={users.filter(u=>u.institutionId==='inst_alexandria_main').length}/><Stat label={t('recordsUploaded')} value={records.length}/><Stat label={t('creditBalance')} value={credits?.balance??'-'}/><Stat label={t('premium')} value={<Badge tone="green">{t('active')}</Badge>}/></div>
    <div className="grid cols-2" style={{marginTop:16}}><Card title={t('institution')}><p><strong>{insts.find(i=>i.id==='inst_alexandria_main')?.name}</strong></p><p style={{color:'var(--muted)'}}>{insts.find(i=>i.id==='inst_alexandria_main')?.address}</p><Badge tone="green">{t('verified')}</Badge></Card>
      <Card title={t('dataContribution')} action={<button className="btn sm outline" onClick={()=>void api.downloadReport('population',{format:'pdf'}).then(()=>toast(t('saved'))).catch((e:any)=>toast(e.message,true))}>{t('exportPdf')}</button>}>{contribution.length?<ResponsiveContainer width="100%" height={180}><BarChart data={contribution}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="m"/><YAxis/><Tooltip/><Bar dataKey="n" fill="#006a61"/></BarChart></ResponsiveContainer>:<Empty message={t('noContributions')}/>}</Card></div>
  </>;
}
export function HospitalStaff() { const {t}=useTranslation(); const [users,setUsers]=useState<User[]>([]); useEffect(()=>{api.list<User>('users').then(setUsers);},[]); return <><PageHead title={t('staffManagement')} subtitle={t('hospitalStaffSubtitle')}/><Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('role')}</th><th>{t('status')}</th></tr></thead><tbody>{users.map(u=><tr key={u.uid}><td>{u.name}</td><td>{u.email}</td><td><Badge>{t(u.role==='lab_staff'?'labStaff':u.role)}</Badge></td><td><StatusBadge status={u.status||'active'}/></td></tr>)}</tbody></table></div></Card></>; }
export function HospitalConnections() { const {t}=useTranslation(); const {toast}=useToast(); return <><PageHead title={t('connections')} subtitle={t('connectionsSubtitle')}/><div className="grid cols-2"><Card title={t('fhirIntegration')}><Badge tone="green">{t('connected')}</Badge><p style={{color:'var(--muted)',fontSize:12}} translate="no">https://api.hospital.example/interconnect-fhir-r4</p><button className="btn sm outline" onClick={()=>toast(t('configurationOpened'))}>{t('configure')}</button></Card><Card title={t('legacyLabDrop')}><Badge tone="amber">{t('warning')}</Badge><p style={{fontSize:12,color:'var(--muted)'}}>{t('csvSyncFailed')}</p><button className="btn sm outline" onClick={()=>toast(t('reviewingConnection'))}>{t('review')}</button></Card></div><button className="btn primary" style={{marginTop:12}} onClick={()=>toast(t('newWebhookCreated'))}><Plus size={16}/> {t('addConnection')}</button></>; }
export function HospitalAnalytics(){ const {t}=useTranslation(); const {toast}=useToast(); const [stats,setStats]=useState<any>(null);
  useEffect(()=>{void api.populationAnalytics().then(setStats).catch(()=>{});},[]);
  const visits=Object.entries(stats?.visitsByMonth||{}).map(([m,v])=>({m,v}));
  return <><PageHead title={t('population')} subtitle={t('populationSubtitle')} actions={<button className="btn outline" onClick={()=>void api.downloadReport('population',{format:'pdf'}).then(()=>toast(t('saved'))).catch((e:any)=>toast(e.message,true))}>{t('exportPdf')}</button>}/>
    <div className="grid cols-4"><Stat label={t('patients')} value={stats?.totalPatients??'-'}/><Stat label={t('records')} value={stats?.totalRecords??'-'}/><Stat label={t('cities')} value={Object.keys(stats?.patientsByCity||{}).length}/><Stat label={t('conditions')} value={Object.keys(stats?.conditionCounts||{}).length}/></div>
    <Card style={{marginTop:16}}><ResponsiveContainer width="100%" height={260}><BarChart data={visits.length?visits:[{m:t('noData'),v:0}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="m"/><YAxis/><Tooltip/><Bar dataKey="v" fill="#002657"/></BarChart></ResponsiveContainer><p className="disclaimer">{t('aggregateDisclaimer')}</p></Card></>; }

export function AdminOverview() {
  const { t }=useTranslation(); const {toast}=useToast(); const [users,setUsers]=useState<User[]>([]); const [insts,setInsts]=useState<Institution[]>([]); const [pharms,setPharms]=useState<Pharmacy[]>([]); const [audit,setAudit]=useState<AuditEntry[]>([]);
  useEffect(()=>{void api.list<User>('users').then(setUsers);void api.list<Institution>('institutions').then(setInsts);void api.list<Pharmacy>('pharmacies').then(setPharms);void api.auditEntries().then(setAudit);},[]);
  return <><PageHead title={t('overview')} subtitle={t('systemConfig')}/>
    <div className="grid cols-4"><Stat label={t('activeStaff')} value={users.length}/><Stat label={t('institutions')} value={insts.length}/><Stat label={t('pharmacies')} value={pharms.length}/><Stat label={t('uptime')} value="99.5%"/></div>
    <div className="grid cols-2" style={{marginTop:16}}><Card title={t('auditFeed')} pad={false}><div className="card-body">{audit.slice(0,6).map((a:any)=><div key={a.id} style={{padding:'8px 0',borderBottom:'1px solid var(--line)'}}><Badge tone="blue">{a.action}</Badge><div style={{fontSize:12}}>{a.actorName||a.actorId||'-'} · {new Date(a.createdAt||a.timestamp).toLocaleString()}</div></div>)}{!audit.length&&<Empty/>}</div></Card>
      <Card title={t('systemHealth')}><div className="grid cols-2"><Stat label="Firestore" value={<Badge tone="green">OK</Badge>}/><Stat label={t('hashChain')} value={<Badge tone="green">{t('valid')}</Badge>}/></div><p style={{color:'var(--muted)',fontSize:12,marginTop:12}}>{t('securityActive')}</p></Card></div>
    <Card title={t('connections')} style={{marginTop:16}} action={<button className="btn sm outline" onClick={()=>toast(t('newWebhookCreatedDemo'))}>+ {t('addConnection')}</button>} pad={false}><div className="card-body"><div className="grid cols-2">
      <div className="card" style={{boxShadow:'none'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong>{t('fhirHisIntegration')}</strong><StatusBadge status="connected"/></div><p style={{color:'var(--muted)',fontSize:12}} translate="no">https://api.hospital.example/interconnect-fhir-r4<br/>{t('lastSync')}</p><button className="btn sm outline" onClick={()=>toast(t('configurationOpenedDemo'))}>{t('configure')}</button></div>
      <div className="card" style={{boxShadow:'none'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong>{t('legacyLabDropCsv')}</strong><StatusBadge status="warning"/></div><p style={{color:'var(--muted)',fontSize:12}}>{t('syncFailedReview')}</p><button className="btn sm outline" onClick={()=>toast(t('reviewingConnectionDemo'))}>{t('review')}</button></div>
    </div></div></Card></>;
}
export function AdminUsers() { const {t}=useTranslation(); const {toast}=useToast(); const [users,setUsers]=useState<User[]>([]); const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [form,setForm]=useState({name:'',email:'',password:'',role:'lab_staff' as any,phone:''});
  useEffect(()=>{api.list<User>('users').then(setUsers);},[]);
  const create=async()=>{ if(!form.password) return toast(t('temporaryPasswordRequired'),true); setBusy(true); try{ await api.createStaffAccount({name:form.name,email:form.email,password:form.password,role:form.role,phone:form.phone,emergencyContact:{name:'-',relationship:'-',phone:'0100000000'}});setOpen(false);setForm({name:'',email:'',password:'',role:'lab_staff' as any,phone:''});api.list<User>('users').then(setUsers);toast(t('staffAccountCreated')); }catch(e:any){toast(e.message,true);} finally{setBusy(false);} };
  return <><PageHead title={t('staffManagement')} subtitle={t('systemConfig')} actions={<button className="btn primary" onClick={()=>setOpen(true)}><Plus size={16}/> {t('addUser')}</button>}/><Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('role')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>{users.map(u=><tr key={u.uid}><td>{u.name}</td><td>{u.email}</td><td><Badge>{t(u.role==='lab_staff'?'labStaff':u.role)}</Badge></td><td><StatusBadge status={u.status||'active'}/></td><td><button className="btn sm outline" onClick={()=>toast(t('roleManagementOpened'))}>{t('edit')}</button></td></tr>)}</tbody></table></div></Card>
    {open && <Modal title={t('addUser')} onClose={()=>setOpen(false)} footer={<><button className="btn outline" onClick={()=>setOpen(false)}>{t('cancel')}</button><button className="btn primary" disabled={busy} onClick={()=>void create()}>{busy?t('creating'):t('submit')}</button></>}><Field label={t('name')}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label={t('email')}><input className="input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label={t('phoneNumber')}><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label={t('password')}><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field><Field label={t('role')}><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value as any})}>{['lab_staff','pharmacy','hospital_admin','admin'].map(r=><option key={r} value={r}>{t(r==='lab_staff'?'labStaff':r==='hospital_admin'?'hospitalAdmin':r)}</option>)}</select></Field></Modal>}
  </>; }
export function AdminInstitutions(){ const {t}=useTranslation(); const {toast}=useToast(); const [list,setList]=useState<Institution[]>([]); useEffect(()=>{api.list<Institution>('institutions').then(setList);},[]);
  const verify=(x:Institution)=>{void api.verifyInstitution(x.id).then(()=>{api.list<Institution>('institutions').then(setList);toast(t('verifyLicense'));}).catch((e:any)=>toast(e.message,true));};
  return <><PageHead title={t('institutions')} subtitle={t('institutionsSubtitle')}/><Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('type')}</th><th>{t('license')}</th><th>{t('city')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>{list.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.type}</td><td style={{fontFamily:'monospace'}}>{x.licenseNumber}</td><td>{x.city}</td><td><StatusBadge status={x.verified?'verified':'pending_verification'}/></td><td>{!x.verified&&<button className="btn sm primary" onClick={()=>verify(x)}><ShieldCheck size={14}/> {t('verifyLicense')}</button>}</td></tr>)}</tbody></table></div></Card></>; }
export function AdminPharmacies(){ const {t}=useTranslation(); const {toast}=useToast(); const [list,setList]=useState<Pharmacy[]>([]); useEffect(()=>{api.list<Pharmacy>('pharmacies').then(setList);},[]);
  const approve=(x:Pharmacy)=>{void api.approvePharmacy(x.id).then(()=>{api.list<Pharmacy>('pharmacies').then(setList);toast(t('pharmacyApproved'));}).catch((e:any)=>toast(e.message,true));};
  return <><PageHead title={t('pharmacies')} subtitle={t('pharmaciesSubtitle')}/><Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('city')}</th><th translate="no">WhatsApp</th><th>{t('status')}</th><th>{t('fee')}</th><th>{t('action')}</th></tr></thead><tbody>{list.map(x=><tr key={x.id}><td><Store size={14}/> {x.name}</td><td>{x.city}</td><td translate="no">{x.whatsapp}</td><td><StatusBadge status={x.status}/></td><td>{x.monthlyFee} EGP</td><td>{x.status==='pending'&&<button className="btn sm primary" onClick={()=>approve(x)}>{t('approve')}</button>}</td></tr>)}</tbody></table></div></Card></>; }
export function AdminAudit(){ const {t}=useTranslation(); const {toast}=useToast(); const [list,setList]=useState<any[]>([]); const [check,setCheck]=useState<any>(null);
  useEffect(()=>{void api.auditEntries().then(setList);},[]);
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
