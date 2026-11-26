import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import {
  Activity, AlertTriangle, BarChart3, Bell, CalendarDays, Download, FileText, HeartPulse,
  Pill, QrCode, Settings, ShieldCheck, Trash2, TrendingUp, CheckCircle2, Clock,
} from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Legend, BarChart, Bar, RadialBarChart, RadialBar, Cell,
} from 'recharts';
import * as api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Patient, MedicalRecord, Prescription, Consent, EmergencyProfile, Notification, Conversation, Message, AuditEntry, Institution } from '../types';
import { Badge, Card, Chip, CopyButton, Empty, Field, IdentityStrip, MetricCard, Modal, PageHead, SectionTabs, SkeletonCards, Stat, StatusBadge, Tabs, useToast } from '../components/ui';

const RECORD_COLORS:Record<string,string> = { lab:'blue', imaging:'purple', prescription:'green', note:'gray', visit:'blue', vitals:'teal' };

/** Forward arrow mirrored when the document switches to RTL ([dir=rtl]). */
function ForwardArrow() {
  const { i18n } = useTranslation();
  return <span aria-hidden="true" style={{ display:'inline-block', transform: i18n.language === 'ar' ? 'scaleX(-1)' : undefined }}>→</span>;
}

export function PatientDashboard() {
  const { session } = useAuth(); const { t } = useTranslation(); const nav = useNavigate();
  const [patient,setPatient] = useState<Patient|null>(null); const [records,setRecords] = useState<MedicalRecord[]>([]); const [rx,setRx] = useState<Prescription[]>([]); const [score,setScore]=useState<number|null>(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{ Promise.all([
    api.getPatient(session!.user.uid).then(setPatient),
    api.listRecords(session!.user.uid).then(a=>setRecords(a.sort((x,y)=>String(y.date).localeCompare(String(x.date))))),
    api.list<Prescription>('prescriptions',r=>r.patientId===session!.user.uid).then(setRx),
    api.patientAnalytics(session!.user.uid).then(a=>setScore(a.healthScore)).catch(()=>{}),
  ]).catch(()=>{}).finally(()=>setLoading(false)); },[]);
  return <>
    <PageHead title={`${t('welcomeBack')}, ${patient?.name.split(' ')[0]||session?.user.name.split(' ')[0]}`} subtitle={`${t('dashboard')} - ${new Date().toLocaleDateString()}`} actions={<Link className="btn primary" to="/app/patient/analytics"><BarChart3 size={16}/> {t('analytics')}</Link>}/>
    {loading ? <SkeletonCards/> : <><div className="grid cols-4">
      <Stat label={t('records')} value={records.length} sub={`${records.filter(r=>r.type==='lab').length} ${t('lab')}`}/>
      <Stat label={t('activeMedications')} value={rx.reduce((a,r)=>a+(r.medicines||[]).length,0)}/>
      <Stat label={t('bloodGroup')} value={patient?.bloodGroup||'-'}/>
      <Stat label={t('healthScore')} value={<span style={{color:'var(--green)'}}>{score===null?'-':`${score}%`}</span>} sub={t('comprehensiveHealth')}/>
    </div>
    <div className="grid cols-2" style={{marginTop:16}}>
      <Card title={t('clinicalTimeline')} action={<Link className="btn sm outline" to="/app/patient/records">{t('viewAll')}</Link>} pad={false}>
        <div className="card-body"><div className="timeline">{records.slice(0,5).map(r=><div className="timeline-item" key={r.id}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8}}><div><Badge tone={RECORD_COLORS[r.type] as any}>{t(r.type)}</Badge> <strong style={{marginInlineStart:6}}>{r.title}</strong><div style={{color:'var(--muted)',fontSize:12}}>{r.institution} · {new Date(r.date).toLocaleDateString()}</div></div><Link className="btn sm" to={`/app/patient/records?record=${r.id}`}>{t('view')}</Link></div>
        </div>)}</div>{!records.length && <Empty/>}</div>
      </Card>
      <div className="grid" style={{gap:16}}>
        <Card title={t('criticalAllergies')}><div className="alert red"><AlertTriangle size={16}/> {(patient?.allergies||[]).join(', ')||'-'}</div>
          <div style={{marginTop:10,fontSize:13}}><strong>{t('chronicConditions')}:</strong> {(patient?.chronicDiseases||[]).join(', ')||'-'}</div></Card>
        <Card title={t('prescriptions')}>{rx.map(r=><div key={r.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--line)'}}><div><strong>{(r.medicines||[]).map(m=>m.name).join(', ')}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{r.doctorName} · {new Date(r.date).toLocaleDateString()}</div></div><StatusBadge status={r.orderStatus||r.status}/></div>)}{!rx.length&&<Empty/>}</Card>
        <Card title={t('emergencyQr')}><p style={{color:'var(--muted)'}}>{t('wearableIntro')}</p><Link className="btn primary" to="/app/patient/emergency"><QrCode size={16}/> {t('configure')}</Link></Card>
      </div>
    </div></>}
  </>;
}

export function PatientRecords() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast();
  const [params,setParams]=useSearchParams(); const [records,setRecords] = useState<MedicalRecord[]>([]); const [institutions,setInstitutions]=useState<Institution[]>([]);
  const [type,setType] = useState('all'); const [q,setQ] = useState('');
  useEffect(()=>{ api.listRecords(session!.user.uid).then(a=>setRecords(a.sort((x,y)=>String(y.date).localeCompare(String(x.date))))).catch((e:any)=>toast(e.message,true));
    void api.list<Institution>('institutions').then(setInstitutions).catch(()=>{}); },[]);
  const filtered = records.filter(r=>(type==='all'||r.type===type) && (!q||`${r.title} ${r.institution}`.toLowerCase().includes(q.toLowerCase())));
  const selected = records.find(r=>r.id===params.get('record'))||null;
  return <><PageHead title={t('records')} subtitle={t('clinicalTimeline')} actions={<button className="btn outline" onClick={()=>window.print()}><Download size={16}/> {t('printRecord')}</button>}/>
    <Card pad><div style={{padding:18,display:'flex',gap:10,flexWrap:'wrap'}}><input className="input" style={{maxWidth:260}} placeholder={t('search')} value={q} onChange={e=>setQ(e.target.value)}/><div className="tabs" style={{border:0,margin:0}}>{['all','lab','imaging','prescription','note','visit','vitals'].map(x=><button key={x} className={`tab ${type===x?'active':''}`} onClick={()=>setType(x)}>{t(x)}</button>)}</div></div>
      <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('type')}</th><th>{t('name')}</th><th>{t('institution')}</th><th>{t('confidenceLabel')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>
        {filtered.map(r=><tr key={r.id}><td>{new Date(r.date).toLocaleDateString()}</td><td><Badge tone={RECORD_COLORS[r.type] as any}>{t(r.type)}</Badge></td><td><strong>{r.title}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{r.summary}</div></td><td>{institutions.find(i=>i.id===r.institution)?.name||r.institution||'-'}</td><td>{r.confidence?`${r.confidence}%`:'-'}</td><td><StatusBadge status={r.status||'accessible'}/></td>
          <td><button className="btn sm outline" onClick={()=>setParams({record:r.id})}>{t('view')}</button></td></tr>)}
      </tbody></table>{!filtered.length&&<Empty/>}</div>
    </Card>
    {selected && <Modal title={selected.title} onClose={()=>setParams({})} footer={<button className="btn outline" onClick={()=>setParams({})}>{t('close')}</button>}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}><Badge tone={RECORD_COLORS[selected.type] as any}>{t(selected.type)}</Badge><StatusBadge status={selected.status||'accessible'}/>
        {selected.confidence!=null&&<Badge tone="blue">{selected.confidence}%</Badge>}</div>
      <p style={{color:'var(--muted)'}}>{new Date(selected.date).toLocaleString()} · {institutions.find(i=>i.id===selected.institution)?.name||selected.institution||'-'}</p>
      {selected.summary&&<p>{selected.summary}</p>}
      {selected.values?.length ? <div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('value')}</th><th>{t('referenceRange')}</th><th>{t('status')}</th></tr></thead><tbody>
        {selected.values.map(v=><tr key={v.name}><td>{v.name}</td><td><strong>{v.value} {v.unit}</strong></td><td>{v.referenceLow!=null?`${v.referenceLow} - ${v.referenceHigh}`:'-'}</td><td><Badge tone={v.flag==='high'?'red':v.flag==='low'?'amber':'green'}>{t(v.flag||'normal')}</Badge></td></tr>)}</tbody></table></div> : <Empty message={t('noRecords')}/>}
    </Modal>}
  </>;
}

export function PatientAnalytics() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast();
  const pid = session!.user.uid;
  const [analytics,setAnalytics]=useState<any>(null);
  const [imaging,setImaging]=useState<MedicalRecord[]>([]);
  const [showRanges,setShowRanges]=useState(false);
  const [view,setView] = useState('analytics');
  useEffect(()=>{ void api.patientAnalytics(pid).then(setAnalytics).catch(()=>{}); void api.listRecords(pid,'imaging').then(setImaging).catch(()=>{}); },[pid]);
  const ind:any = analytics?.indicators || {};
  const bp = analytics?.bloodPressure || [];
  const a1c = (analytics?.labTrends||[]).filter((x:any)=>x.HbA1c!=null).map((x:any)=>({date:x.date,value:x.HbA1c}));
  const lipids:any[] = analytics?.lipidPanel || [];
  const meds:any[] = analytics?.medications || [];
  const toneOf = (v:any)=>v?.flag==='high'?'red':v?.flag==='low'?'amber':'green';
  const visits = Object.entries(analytics?.visits||{}).map(([month,count])=>({month,count:Number(count)}));
  const comparison = (analytics?.labTrends||[]).map((x:any)=>({date:x.date,HbA1c:x.HbA1c,Glucose:x.Glucose||x['Glucose, Fasting'],Creatinine:x.Creatinine}));
  const plainTrend = (ind.hba1c?.flag==='high'||ind.systolic?.flag==='high') ? t('trendWatch') : t('trendStable');
  const dl = async(type:string,format:string)=>{ try{ await api.downloadReport(type,{patientId:pid,format}); toast(t('saved')); }catch(e:any){ toast(e.message,true); } };
  return <><PageHead title={t('patientAnalytics')} subtitle={plainTrend} actions={<><button className="btn outline" onClick={()=>setShowRanges(v=>!v)}>{showRanges?t('hideRanges'):t('showRanges')}</button><button className="btn outline" onClick={()=>void dl('history','pdf')}><Download size={16}/> {t('exportPdf')}</button></>}/>
    <SectionTabs tabs={[{id:'overview',label:t('overview')},{id:'analytics',label:t('analytics')},{id:'reports',label:t('reports')}]} active={view} onChange={setView}/>
    {view==='reports' ? <Card title={t('yourHealthReports')}><p style={{color:'var(--muted)'}}>{t('reportsIntro')}</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn primary" onClick={()=>void dl('history','pdf')}>{t('exportPdf')} - {t('history')}</button>
        <button className="btn outline" onClick={()=>void dl('history','fhir')}>{t('exportFhir')}</button>
        <button className="btn outline" onClick={()=>void dl('labs','pdf')}>{t('labResultsPdf')}</button>
        <button className="btn outline" onClick={()=>void dl('clinical-summary','text')}>{t('clinicalSummary')}</button>
      </div>
      <p className="disclaimer" style={{marginTop:12}}>{t('reportExpires')}</p></Card> : <>
    <div className="grid cols-4">
      <MetricCard label={t('healthScore')} value={`${analytics?.healthScore??'-'}${analytics?'%':''}`} trend={t('flagged', {count:analytics?.abnormalCount??0})} tone={(analytics?.healthScore||0)>=80?'green':'amber'} bar={analytics?.healthScore||0} sub={t('indicatorsInRange')} icon={<Activity size={16}/>}/>
      <MetricCard label="HbA1c" value={ind.hba1c?.value??'-'} unit={ind.hba1c?.unit||'%'} tone={toneOf(ind.hba1c)} bar={Math.min(100,(ind.hba1c?.value||0)*12)} icon={<HeartPulse size={16}/>}/>
      <MetricCard label={t('bloodPressure')} value={ind.systolic?.value?`${ind.systolic.value}/${ind.diastolic?.value??'-'}`:'-'} unit="mmHg" tone={toneOf(ind.systolic)} bar={Math.min(100,(ind.systolic?.value||0)/1.8)} icon={<Activity size={16}/>}/>
      <MetricCard label="LDL" value={ind.ldl?.value??'-'} unit={ind.ldl?.unit||'mg/dL'} tone={toneOf(ind.ldl)} bar={Math.min(100,(ind.ldl?.value||0)/2)} sub={t('ldlDescription')} icon={<AlertTriangle size={16}/>}/>
    </div>
    {view==='overview' ? <Card title={t('atAGlance')} style={{marginTop:16}}>
      <p style={{color:'var(--muted)'}}>{t('atAGlanceIntro')}</p>
      <div className="grid cols-3" style={{marginTop:12}}>
        <div className="alert red"><strong>{t('allergies')}</strong><div>{(analytics?.allergies||[]).join(', ')||t('noneRecorded')}</div></div>
        <div className="alert amber"><strong>{t('abnormalResults')}</strong><div>{t('flaggedAcross', {flagged:analytics?.abnormalCount??0, total:analytics?.recordCount??0})}</div></div>
        <div className="alert green"><strong>{t('conditions')}</strong><div>{(analytics?.conditions||[]).join(', ')||t('noneRecorded')}</div></div>
      </div>
    </Card> : <div className="grid cols-2" style={{marginTop:16}}>
      <Card title={t('bloodPressure')}><ResponsiveContainer width="100%" height={240}><LineChart data={bp}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[50,170]}/><Tooltip/><Legend/><ReferenceArea y1={90} y2={120} fill="#e7f6f3" fillOpacity={.5}/><Line type="monotone" dataKey="systolic" stroke="#002657" strokeWidth={2.5}/><Line type="monotone" dataKey="diastolic" stroke="#0f9d6e" strokeWidth={2.5}/></LineChart></ResponsiveContainer></Card>
      <Card title={t('labTrends') + ' - HbA1c'}><ResponsiveContainer width="100%" height={240}><LineChart data={a1c}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis domain={[4,9]}/><Tooltip/><Legend/><ReferenceArea y1={4} y2={5.6} fill="#e7f7ef" fillOpacity={.7}/><Line type="monotone" dataKey="value" stroke="#d99219" strokeWidth={2.5}/></LineChart></ResponsiveContainer></Card>
    </div>}
    <Card title={t('lipidPanel')} style={{marginTop:16}}>
      {lipids.length?lipids.map((v:any)=><div className="lipid-row" key={v.name}><span className="lipid-name">{v.name}</span><span className="lipid-track"><i className="lipid-fill" style={{width:`${Math.min(100,(v.value||0)/3)}%`,background:toneOf(v)==='red'?'var(--red)':toneOf(v)==='green'?'var(--green)':'var(--amber)'}}/></span><span className="lipid-val">{v.value??'-'} {v.unit||''}</span></div>):<Empty message={t('noLipidResults')}/>}
    </Card>
    <Card title={t('medicationTimeline')} style={{marginTop:16}}><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('medicine')}</th><th>{t('dosage')}</th><th>{t('status')}</th></tr></thead><tbody>{meds.map((m:any,i:number)=><tr key={i}><td>{m.name}</td><td>{m.dosage||m.dose||'-'}</td><td><Badge tone={m.status==='confirmed'?'green':'amber'}>{t(m.status||'recorded')}</Badge></td></tr>)}</tbody></table>{!meds.length&&<Empty/>}</div></Card>
    <div className="grid cols-2" style={{marginTop:16}}>
      <Card title={t('visitFrequency')}><ResponsiveContainer width="100%" height={220}><BarChart data={visits}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#006a61"/></BarChart></ResponsiveContainer>{!visits.length&&<Empty message={t('noRecords')}/>}</Card>
      <Card title={t('testComparison')}><ResponsiveContainer width="100%" height={220}><BarChart data={comparison}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Bar dataKey="HbA1c" fill="#d99219"/>{showRanges&&<><Bar dataKey="Glucose" fill="#006a61"/><Bar dataKey="Creatinine" fill="#0f9d6e"/></>}</BarChart></ResponsiveContainer>{!comparison.length&&<Empty message={t('noRecords')}/>}</Card>
    </div>
    <Card title={t('healthScore')} style={{marginTop:16}}><div style={{display:'flex',alignItems:'center',gap:24}}><ResponsiveContainer width={180} height={180}><RadialBarChart innerRadius="70%" outerRadius="100%" data={[{name:t('healthScore'),value:analytics?.healthScore||0,fill:'#0f9d6e'}]} startAngle={90} endAngle={-270}><RadialBar dataKey="value" cornerRadius={8}/><Cell fill="#e7f6f3"/></RadialBarChart></ResponsiveContainer><div><strong style={{fontSize:32}}>{analytics?.healthScore??'-'}%</strong><p style={{color:'var(--muted)'}}>{t('indicatorsInRange')}</p><a href="https://www.who.int/news-room/fact-sheets/detail/diabetes" target="_blank" rel="noreferrer" className="btn sm outline">{t('education')}</a></div></div></Card>
    <Card title={t('imagingTimeline')} style={{marginTop:16}}>{imaging.length?<div className="timeline">{imaging.map(r=><div key={r.id} className="timeline-item"><Badge tone="blue">{r.type}</Badge> <strong>{r.title}</strong><div style={{fontSize:12,color:'var(--muted)'}}>{new Date(r.date).toLocaleDateString()}</div></div>)}</div>:<Empty message={t('noImaging')}/>}</Card>
    <Card title={t('conditionSummary')} style={{marginTop:16}}><div className="grid cols-4">{[...(analytics?.conditions||[]), `HbA1c ${ind.hba1c?.value??'-'}`, `BP ${ind.systolic?.value??'-'}/${ind.diastolic?.value??'-'}`].map((label,i)=><div key={i} className="alert" style={{background:'#fff',padding:12}}><Badge tone={i>=(analytics?.conditions||[]).length?toneOf(i===(analytics?.conditions||[]).length?ind.hba1c:ind.systolic) as any:'red'}>{label}</Badge></div>)}</div></Card>
    </>}
  </>;
}

export function PatientPrescriptions() {
  const { session } = useAuth(); const { t } = useTranslation(); const [rx,setRx] = useState<Prescription[]>([]); const {toast}=useToast();
  useEffect(()=>{ api.list<Prescription>('prescriptions',r=>r.patientId===session!.user.uid).then(setRx).catch((e:any)=>toast(e.message,true)); },[]);
  return <><PageHead title={t('prescriptions')} subtitle={t('prescriptionsSubtitle')}/>
    <Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('date')}</th><th>{t('doctor')}</th><th>{t('extractedMedicines')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>
      {rx.map(r=><tr key={r.id}><td>{new Date(r.date).toLocaleDateString()}</td><td>{r.doctorName}</td><td>{(r.medicines||[]).map(m=>`${m.name} ${m.dosage}`).join(', ')}</td><td><StatusBadge status={r.orderStatus||r.status}/></td><td>{r.linkToken ? <Link className="btn sm primary" to={`/f/${r.linkToken}`}>{t('orderStatus')}</Link> : <Badge tone="gray">{t('linkPending')}</Badge>}</td></tr>)}
    </tbody></table>{!rx.length&&<Empty/>}</div></Card></>;
}

export function PatientConsents() {
  const { session } = useAuth(); const { t } = useTranslation(); const [list,setList] = useState<Consent[]>([]); const [confirmDelete,setConfirmDelete]=useState(false); const {toast}=useToast();
  const load = ()=>api.list<Consent>('consents',c=>c.patientId===session!.user.uid).then(setList); useEffect(()=>{void load();},[]);
  const toggle = async (c:Consent)=>{
    if(c.active) await api.revokeConsentApi(c.id, t('patientRequest'));
    else await api.grantConsent({granteeType:c.granteeType, granteeId:c.granteeId, scope:c.scope.split(','), purpose:c.purpose});
    toast(c.active?t('revoke'):t('grant')); void load();
  };
  return <><PageHead title={t('dataPrivacy')} subtitle={t('consentsSubtitle')}/>
    <Card pad><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('name')}</th><th>{t('role')}</th><th>{t('scope')}</th><th>{t('purpose')}</th><th>{t('status')}</th><th>{t('action')}</th></tr></thead><tbody>
      {list.map(c=><tr key={c.id}><td>{c.granteeName}</td><td>{t(c.granteeType)}</td><td>{c.scope}</td><td>{c.purpose}</td><td><StatusBadge status={c.active?'active':'revoked'}/></td><td><button className="btn sm outline" onClick={()=>void toggle(c)}>{c.active?t('revoke'):t('grant')}</button></td></tr>)}
    </tbody></table>{!list.length&&<Empty/>}</div></Card>
    <Card title={t('yourDataRights')} style={{marginTop:16}}><p style={{color:'var(--muted)'}}>{t('dataRightsText')}</p><div style={{display:'flex',gap:8}}>
      <button className="btn outline" onClick={()=>void api.downloadReport('history',{patientId:session!.user.uid,format:'fhir'}).then(()=>toast(t('saved'))).catch((e:any)=>toast(e.message,true))}><Download size={16}/> {t('download')} JSON</button>
      <button className="btn danger" onClick={()=>setConfirmDelete(true)}><Trash2 size={16}/> {t('requestDeletion')}</button></div></Card>
    {confirmDelete && <Modal title={t('requestDataDeletion')} onClose={()=>setConfirmDelete(false)} footer={<><button className="btn outline" onClick={()=>setConfirmDelete(false)}>{t('cancel')}</button><button className="btn danger" onClick={()=>void (async()=>{try{await api.requestDeletion(session!.user.uid,t('patientRequest'));toast(t('deletionRecorded'));setConfirmDelete(false);}catch(e:any){toast(e.message,true);}})()}>{t('confirmDeletion')}</button></>}><p>{t('deletionConfirmText')}</p></Modal>}
  </>;
}

export function PatientEmergencyConfig() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast();
  const [profile,setProfile] = useState<EmergencyProfile|null>(null); const [qr,setQr] = useState(''); const [tab,setTab]=useState('settings');
  const defaults = {showBloodType:true,showAllergies:true,showConditions:true,showMedications:false,showContacts:true,aiChatbotEnabled:true};
  const cacheKey = `onemed.emergency.${session!.user.uid}`;
  useEffect(()=>{ void (async()=>{
    let p:any=null;
    if(api.API_MODE==='api'){
      // The API's /mine endpoint issues a new token each call: keep one stable
      // wearable link per browser instead of minting a new QR on every visit.
      const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
      const token=cached?.token || (await api.createEmergencyQr()).token;
      localStorage.setItem(cacheKey,JSON.stringify({token,settings:cached?.settings||defaults}));
      p={ token, patientId:session!.user.uid, activatedAt:cached?.activatedAt||new Date().toISOString(), settings:cached?.settings||defaults };
    } else { const a=await api.list<EmergencyProfile>('emergencyProfiles',x=>x.patientId===session!.user.uid); p=a[0]||null; }
    const n=await api.myNfc();
    if(n.issued) p={ ...(p as any), nfcIssued:true, nfcUid:n.nfcUid, scanCount:n.scanCount||0 };
    setProfile(p); if(p?.token) void QRCode.toDataURL(`${location.origin}/emergency/${p.token}`).then(setQr).catch(()=>{});
  })().catch((e:any)=>toast(e.message||'Unable to load emergency settings',true)); },[]);
  const toggle = async (k:keyof EmergencyProfile['settings'])=>{
    if(!profile) return; const next={...profile,settings:{...profile.settings,[k]:!profile.settings[k]}}; setProfile(next);
    localStorage.setItem(cacheKey,JSON.stringify({token:next.token,settings:next.settings,activatedAt:next.activatedAt}));
    try{ await api.updateEmergencyPrivacy(next.settings); }catch(e:any){ toast(e.message,true); }
  };
  const fields:[keyof EmergencyProfile['settings'],string][] = [['showBloodType',t('bloodGroup')],['showAllergies',t('allergies')],['showConditions',t('chronicConditions')],['showMedications',t('currentMedications')],['showContacts',t('emergencyContact')],['aiChatbotEnabled',t('askAi')]];
  return <><PageHead title={t('emergencyQr')} subtitle={t('emergencyConfigSubtitle')}/>
    <Tabs tabs={[{id:'settings',label:t('settings')},{id:'qr',label:'QR / NFC'}]} active={tab} onChange={setTab}/>
    {tab==='settings'?<Card title={t('dataPrivacy')}>{fields.map(([k,label])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--line)'}}><strong>{label}</strong><button className={`btn sm ${profile?.settings[k]?'primary':'outline'}`} onClick={()=>toggle(k)}>{profile?.settings[k]?t('yes'):t('no')}</button></div>)}<p className="disclaimer" style={{marginTop:14}}>{t('privacyDisclaimer')}</p></Card>
    :<div className="grid cols-2"><Card title={t('emergencyQrCard')}><div style={{textAlign:'center'}}>{qr?<img src={qr} alt={t('emergencyQrCard')} style={{width:200,height:200}}/>:<div className="empty">{t('generating')}</div>}<div className="disclaimer" style={{marginTop:12}}>{location.origin}/emergency/{profile?.token} {profile && <CopyButton value={`${location.origin}/emergency/${profile.token}`} compact/>}</div><a className="btn primary" style={{marginTop:12}} href={qr} download="onemed-emergency-qr.png"><Download size={16}/> {t('downloadQr')}</a></div></Card>
      <Card title={t('nfcWristband')}><p style={{color:'var(--muted)'}}>{t('wristbandDesc')}</p>
        {api.API_MODE==='api' && <button className="btn sm outline" style={{marginBottom:10}} onClick={async()=>{await api.issueNfc(session!.user.uid);toast(t('saved'));}}>{t('issueNfcToken')}</button>}<dl style={{lineHeight:2}}><dt style={{color:'var(--muted)'}}>{t('status')}</dt><dd>{profile?.nfcIssued?t('active'):t('notIssued')}</dd><dt style={{color:'var(--muted)'}} translate="no">UID</dt><dd translate="no">{profile?.nfcUid||'-'}</dd><dt style={{color:'var(--muted)'}}>{t('scanQr')}</dt><dd>{profile?.scanCount||0}</dd></dl><Link className="btn outline" to={`/nfc/${profile?.token}`}>{t('view')} {t('nfcPage')}</Link></Card></div>}
  </>;
}

export function PatientMessages() {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast();
  const [convs,setConvs]=useState<Conversation[]>([]); const [active,setActive]=useState<string|null>(null); const [msgs,setMsgs]=useState<Message[]>([]); const [text,setText]=useState('');
  useEffect(()=>{ void api.listConversations().then(a=>{setConvs(a);setActive(a[0]?.id||null);}).catch((e:any)=>toast(e.message,true)); },[]);
  useEffect(()=>{ if(active) void api.listMessages(active).then(setMsgs).catch((e:any)=>toast(e.message,true)); },[active]);
  const send=async()=>{ if(!text.trim()||!active) return; await api.sendMessage(active,text); setText(''); setMsgs(await api.listMessages(active)); };
  return <><PageHead title={t('messages')} subtitle={t('messagesSubtitle')}/>
    <div className="grid" style={{gridTemplateColumns:'minmax(0,280px) minmax(0,1fr)'}}><Card pad><div className="card-body">{convs.map(c=><button key={c.id} className={`nav-item ${active===c.id?'active':''}`} style={{color:'var(--ink)'}} onClick={()=>setActive(c.id)}><span className="avatar">{c.otherName.slice(0,2).toUpperCase()}</span><span><strong>{c.otherName}</strong><div style={{fontSize:11,color:'var(--muted)'}}>{t(c.role)}</div></span></button>)}{!convs.length&&<Empty/>}</div></Card>
      <Card pad={false}><div className="card-head"><h3>{convs.find(c=>c.id===active)?.otherName||'-'}</h3></div><div className="card-body"><div className="chat-log">{msgs.map(m=><div key={m.id} className={`msg ${m.senderId===session!.user.uid?'me':''}`}>{m.text}<div style={{fontSize:10,opacity:.6,marginTop:4}}>{new Date(m.sentAt).toLocaleTimeString()}</div></div>)}</div><div style={{display:'flex',gap:8,marginTop:12}}><input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder={t('typeMessage')} onKeyDown={e=>{if(e.key==='Enter')void send();}}/><button className="btn primary" onClick={()=>void send()}><Pill size={16}/> {t('send')}</button></div></div></Card></div>
  </>;
}

export function PatientNotifications({ userId }: { userId?: string }) {
  const { session } = useAuth(); const { t } = useTranslation(); const {toast}=useToast(); const [list,setList]=useState<Notification[]>([]);
  const target = userId || session!.user.uid;
  const load = ()=>api.listNotifications().then(a=>setList(a.sort((x:any,y:any)=>String(y.createdAt).localeCompare(String(x.createdAt)))));
  useEffect(()=>{ void load(); },[target]);
  return <><PageHead title={t('notifications')} subtitle={t('notificationsSubtitle')} actions={<button className="btn sm outline" onClick={async()=>{await api.markNotificationsRead();toast(t('saved'));void load();}}>{t('markAllRead')}</button>}/>
    <Card pad><div className="card-body">{list.map(n=><div key={n.id} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid var(--line)'}}><span className="avatar"><Bell size={16}/></span><div style={{flex:1}}><strong>{n.title}</strong><div>{n.body}</div><div style={{fontSize:11,color:'var(--muted)'}}>{new Date(n.createdAt).toLocaleString()}</div></div>{!n.read&&<Badge tone="blue">{t('new')}</Badge>}</div>)}{!list.length&&<Empty/>}</div></Card></>;
}

export function PatientSettings() {
  const { session } = useAuth(); const { t } = useTranslation(); const {setUser}=useAuth(); const {toast}=useToast();
  const [form,setForm]=useState<any>({...session!.user});
  return <><PageHead title={t('profile')} subtitle={t('clinicalIdentity')}/>
    <div className="grid cols-2"><Card title={t('personalInformation')}><Field label={t('name')}><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label={t('phoneNumber')}><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label={t('email')}><input className="input" value={form.email} disabled/></Field><button className="btn navy" onClick={async()=>{try{await api.updateMyProfile({name:form.name,phone:form.phone});setUser({...form,name:form.name,phone:form.phone});toast(t('saved'));}catch(e:any){toast(e.message,true);}}}>{t('save')}</button></Card>
      <Card title={t('emergencyContact')}><Field label={t('name')}><input className="input" dir="rtl" value={form.emergencyContact?.name||''} onChange={e=>setForm({...form,emergencyContact:{...form.emergencyContact,name:e.target.value}})}/></Field><Field label={t('phoneNumber')}><input className="input" type="tel" value={form.emergencyContact?.phone||''} onChange={e=>setForm({...form,emergencyContact:{...form.emergencyContact,phone:e.target.value}})}/></Field><Field label={t('relationship')}><input className="input" value={form.emergencyContact?.relationship||''} onChange={e=>setForm({...form,emergencyContact:{...form.emergencyContact,relationship:e.target.value}})}/></Field><button className="btn navy" onClick={async()=>{try{await api.updateEmergencyContact(form.emergencyContact);toast(t('saved'));}catch(e:any){toast(e.message,true);}}}>{t('save')}</button></Card></div>
    <div className="grid cols-3" style={{marginTop:16}}>
      <Card title={t('dataPrivacy')}><p style={{color:'var(--muted)',fontSize:13}}>{t('consentsDesc')}</p><Link className="btn sm outline" to="/app/patient/consents">{t('consents')} <ForwardArrow/></Link></Card>
      <Card title={t('notificationPreferences')}><p style={{color:'var(--muted)',fontSize:13}}>{t('notificationsDesc')}</p><Link className="btn sm outline" to="/app/patient/notifications">{t('notifications')} <ForwardArrow/></Link></Card>
      <Card title={t('emergencyQr')}><p style={{color:'var(--muted)',fontSize:13}}>{t('badgeDesc')}</p><Link className="btn sm outline" to="/app/patient/emergency">{t('configure')} <ForwardArrow/></Link></Card>
    </div>
  </>;
}
