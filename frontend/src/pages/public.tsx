import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import {
  ShieldCheck, Smartphone, QrCode, Pill, ArrowRight, Phone, Send, Bot, ClipboardCheck,
  MapPin, MessageCircle, CheckCircle2, Languages, Stethoscope, Store as StoreIcon, HeartPulse as HeartPulseIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import * as api from '../api/client';
import type { ChatTurn, EmergencySettings, Patient, Prescription, Pharmacy, Role } from '../types';
import { Badge, Card, Empty, Field, Modal, PageHead, StatusBadge, useToast } from '../components/ui';

export function Landing() {
  const { t, i18n } = useTranslation(); const navigate = useNavigate();
  const { session } = useAuth();
  return <div className="public-shell">
    <header style={{background:'#fff',padding:'12px 24px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid var(--line)'}}>
      <span className="brand-mark" style={{background:'var(--navy)',color:'#fff'}}>✚</span>
      <strong style={{fontSize:20,color:'var(--navy)'}}>OneMed</strong>
      <div style={{flex:1}}/><button className="btn sm outline" onClick={()=>navigate(i18n.language==='en'?'/register':'/register')}><Languages size={14}/> {i18n.language==='en'?'العربية':'English'}</button>
      {session ? <button className="btn primary" onClick={()=>navigate(api.routeForRole(session.user.role))}>{t('dashboard')}</button> : <><Link className="btn outline" to="/login">{t('login')}</Link><Link className="btn primary" to="/register">{t('signup')}</Link></>}
    </header>
    <div className="landing-hero"><div className="landing-inner">
      <div><span className="badge" style={{background:'rgba(255,255,255,.14)',color:'#fff'}}>{t('trusted')}</span>
        <h1 style={{marginTop:16}}>{t('unifiedPlatform')}</h1><p style={{fontSize:17,maxWidth:520,opacity:.9}}>{t('unifiedDesc')}</p>
        <div style={{display:'flex',gap:10,marginTop:24}}><Link className="btn primary" to="/register">{t('start')} <ArrowRight size={16}/></Link><Link className="btn outline" to="/emergency/em-demo-mona" style={{background:'transparent',color:'#fff',borderColor:'rgba(255,255,255,.4)'}}>{t('emergencyInfo')}</Link></div>
      </div>
      <Card className="print-only" title="Patient Overview" pad><div className="grid cols-2"><div className="stat"><span className="value">120/80</span><span className="label">Blood Pressure</span></div><div className="stat"><span className="value">72 bpm</span><span className="label">Heart Rate</span></div></div><div style={{height:120,background:'linear-gradient(180deg,#eef5ff,#fff)',borderRadius:8,marginTop:12,display:'flex',alignItems:'flex-end',gap:6,padding:8}}>{[40,55,45,70,60,85,75].map((h,i)=><div key={i} style={{height:h,background:'#006a61',opacity:.6,flex:1,borderRadius:'4px 4px 0 0'}}/>)}</div></Card>
    </div></div>
    <div className="landing-features"><h2 style={{textAlign:'center'}}>{t('features')}</h2><p style={{textAlign:'center',color:'var(--muted)'}}>{t('featuresSub')}</p>
      <div className="grid cols-3" style={{marginTop:24}}>
        {[[<Smartphone size={26}/>,t('featureNfc'),'Tap a wristband to open a unified clinical record in seconds.'],[<QrCode size={26}/>,t('featureQr'),'Patients grant time-limited, audit-logged access by scanning a QR code.'],[<Pill size={26}/>,t('featurePharmacy'),'AI extracts medicines from a prescription and routes the order to nearby pharmacies.']].map(([icon,title,desc],i)=><Card key={i}><span style={{color:'var(--teal)'}}>{icon}</span><h3 style={{margin:'10px 0'}}>{title as string}</h3><p style={{color:'var(--muted)',margin:0}}>{desc as string}</p><Link className="btn sm" style={{marginTop:12}} to="/register">{t('learnMore')} →</Link></Card>)}
      </div>
      <h2 style={{textAlign:'center',marginTop:46}}>{t('howItWorks')}</h2>
      <div className="grid cols-3" style={{marginTop:24}}>
        {[
          [t('step1Title'),t('step1Desc')],[t('step2Title'),t('step2Desc')],[t('step3Title'),t('step3Desc')],
        ].map(([title,desc],i)=><Card key={i}><div className="how-step"><span className="how-num">{i+1}</span><div><h3>{title}</h3><p style={{color:'var(--muted)',margin:'4px 0 0'}}>{desc}</p></div></div></Card>)}
      </div>
    </div>
    <footer className="site-footer"><span>{t('footerRights')}</span><Link to="/register" style={{color:'#cfe0fb'}}>{t('privacyPolicy')}</Link><Link to="/register" style={{color:'#cfe0fb'}}>{t('termsOfService')}</Link><Link to="/emergency/em-demo-mona" style={{color:'#cfe0fb'}}>{t('clinicalSupport')}</Link></footer>
  </div>;
}

const ROLE_OPTIONS: {id:Role;key:string}[] = [{id:'patient',key:'patient'},{id:'doctor',key:'doctor'}];
export function Register() {
  const { t } = useTranslation(); const { register, verifyOtp } = useAuth(); const nav = useNavigate(); const {toast} = useToast();
  const [step,setStep] = useState(0); const [form,setForm] = useState<any>({role:'patient',name:'',email:'',password:'',phone:'',emergencyContact:{name:'',relationship:'',phone:''},nationalId:'',dateOfBirth:'',gender:'male',bloodGroup:'O+',city:'Alexandria',address:'',allergies:'',chronicDiseases:''});
  const [otp,setOtp] = useState(''); const [challenge,setChallenge] = useState<{challengeId:string;devCode?:string}|null>(null); const [busy,setBusy]=useState(false);
  const set = (k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));
  const setE = (k:string,v:string)=>setForm((f:any)=>({...f,emergencyContact:{...f.emergencyContact,[k]:v}}));
  const next = async () => {
    if (step===0 && (!form.name || !form.email || form.password.length<8 || !/^01[0125]\d{8}$/.test(form.phone))) return toast(t('fieldRequired'),true);
    if (step===1 && (!form.emergencyContact.name || !form.emergencyContact.relationship || !/^01[0125]\d{8}$/.test(form.emergencyContact.phone))) return toast(t('invalidPhone'),true);
    if (step===2 && form.role==='patient' && !/^\d{14}$/.test(form.nationalId)) return toast(t('invalidNationalId'),true);
    if (step<3) return setStep(step+1);
    setBusy(true);
    try { const r = await register({...form, allergies:form.allergies.split(',').map((s:string)=>s.trim()).filter(Boolean), chronicDiseases:form.chronicDiseases.split(',').map((s:string)=>s.trim()).filter(Boolean)}); setChallenge(r); setStep(4); }
    catch(e:any){ toast(e.message,true); } finally { setBusy(false); }
  };
  const verify = async () => { try { await verifyOtp(challenge!.challengeId, otp || challenge?.devCode || '000000'); toast(t('saved')); nav('/app'); } catch(e:any){ toast(e.message,true); } };
  return <div className="auth-wrap"><div className="auth-card">
    <div className="head"><div className="brand-mark" style={{background:'var(--navy)',color:'#fff',marginBottom:10}}>✚</div><h2>{t('register')}</h2><p style={{color:'var(--muted)'}}>{step<4?`${t('step')} ${step+1} ${t('of')} 4`:t('otp')}</p><div className="progress">{[0,1,2,3].map(i=><i key={i} className={i<=step?'on':''}/>)}</div></div>
    <div style={{padding:24}}>
    {step===0 && <><h3>{t('profile')}</h3>
      <Field label={t('role')}><select className="input" value={form.role} onChange={e=>set('role',e.target.value)}>{ROLE_OPTIONS.map(r=><option key={r.id} value={r.id}>{t(r.key)}</option>)}</select></Field>
      <Field label={t('name')}><input className="input" value={form.name} onChange={e=>set('name',e.target.value)}/></Field>
      <Field label={t('email')}><input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)}/></Field>
      <Field label={t('phoneNumber')}><input className="input" placeholder="01012345678" value={form.phone} onChange={e=>set('phone',e.target.value)}/></Field>
      <Field label={t('password')} hint="Min 8 characters"><input className="input" type="password" value={form.password} onChange={e=>set('password',e.target.value)}/></Field>
    </>}
    {step===1 && <><h3>{t('emergencyContact')} <Badge tone="red">{t('required')}</Badge></h3><p style={{color:'var(--muted)'}}>Someone we can contact in case of a medical emergency.</p>
      <Field label={t('fullNameArabic')}><input className="input" dir="rtl" value={form.emergencyContact.name} onChange={e=>setE('name',e.target.value)}/></Field>
      <Field label={t('phoneNumber')}><input className="input" placeholder="+20 100 123 4567" value={form.emergencyContact.phone} onChange={e=>setE('phone',e.target.value)}/></Field>
      <Field label={t('relationship')}><select className="input" value={form.emergencyContact.relationship} onChange={e=>setE('relationship',e.target.value)}><option value="">—</option>{['Spouse','Parent','Sibling','Child','Friend','Other'].map(r=><option key={r}>{r}</option>)}</select></Field>
    </>}
    {step===2 && <><h3>{form.role==='patient'?t('patient'):t('doctor')} {t('profile')}</h3>
      {form.role==='patient'?<>
        <Field label={t('nationalId')}><input className="input" maxLength={14} value={form.nationalId} onChange={e=>set('nationalId',e.target.value)}/></Field>
        <div className="grid cols-2"><Field label={t('dateOfBirth')}><input className="input" type="date" value={form.dateOfBirth} onChange={e=>set('dateOfBirth',e.target.value)}/></Field>
        <Field label={t('gender')}><select className="input" value={form.gender} onChange={e=>set('gender',e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></Field></div>
        <Field label={t('bloodGroup')}><select className="input" value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)}>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g=><option key={g}>{g}</option>)}</select></Field>
        <Field label={t('city')}><input className="input" value={form.city} onChange={e=>set('city',e.target.value)}/></Field>
        <Field label={t('allergies')} hint="Comma separated"><input className="input" value={form.allergies} onChange={e=>set('allergies',e.target.value)}/></Field>
        <Field label={t('chronicConditions')} hint="Comma separated"><input className="input" value={form.chronicDiseases} onChange={e=>set('chronicDiseases',e.target.value)}/></Field>
      </>:<><Field label="Specialty"><input className="input" value={form.specialty||''} onChange={e=>set('specialty',e.target.value)}/></Field><Field label="License number"><input className="input" value={form.licenseNumber||''} onChange={e=>set('licenseNumber',e.target.value)}/></Field><Field label={t('city')}><input className="input" value={form.city} onChange={e=>set('city',e.target.value)}/></Field></>}
    </>}
    {step===3 && <><h3>{t('confirm')}</h3><dl style={{lineHeight:2}}><dt style={{color:'var(--muted)'}}>{t('name')}</dt><dd>{form.name}</dd><dt style={{color:'var(--muted)'}}>{t('email')}</dt><dd>{form.email}</dd><dt style={{color:'var(--muted)'}}>{t('emergencyContact')}</dt><dd>{form.emergencyContact.name} — {form.emergencyContact.phone}</dd><dt style={{color:'var(--muted)'}}>{t('role')}</dt><dd>{t(form.role)}</dd></dl><p className="disclaimer">By registering you agree that AI outputs are informational only and do not constitute medical advice.</p></>}
    {step===4 && <><h3>{t('otp')}</h3><p style={{color:'var(--muted)'}}>Enter the 6-digit verification code sent to your phone.</p>
      {challenge?.devCode && <div className="alert blue">{t('demoMode')}: {t('verifyOtp')} code = <strong>{challenge.devCode}</strong></div>}
      <Field label={t('verifyOtp')}><input className="input" maxLength={6} inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/></Field>
    </>}
    <div style={{display:'flex',gap:8,marginTop:18}}>{step>0 && step<4 && <button className="btn outline" onClick={()=>setStep(step-1)}>{t('back')}</button>}
      {step<4?<button className="btn primary" onClick={next} disabled={busy}>{t(step===3?'confirm':'continue')}</button>:<button className="btn primary" onClick={verify}>{t('verifyOtp')}</button>}
      <div style={{flex:1}}/><Link className="btn sm" to="/login">{t('login')}</Link>
    </div></div>
  </div></div>;
}

export function Login() {
  const { t } = useTranslation(); const { login, verifyMfa } = useAuth(); const nav = useNavigate(); const {toast} = useToast();
  const [email,setEmail] = useState('mona.patient@example.com'); const [password,setPassword] = useState('Demo!onemed1');
  const [mfaToken,setMfaToken] = useState<string|null>(null); const [code,setCode] = useState('');
  const [busy,setBusy] = useState(false);
  const submit = async (e:React.FormEvent) => { e.preventDefault(); setBusy(true); try { await login(email,password); nav('/app'); } catch(err:any) { if(String(err.message).startsWith('MFA_REQUIRED:')) { setMfaToken(err.message.split(':')[1]); toast('Enter your 6-digit authenticator code'); } else toast(err.message,true); } finally { setBusy(false); } };
  return <div className="auth-wrap"><div className="auth-card">
    <div className="head"><div className="brand-mark" style={{background:'var(--navy)',color:'#fff',marginBottom:10}}>✚</div><h2>{t('welcomeBack')}</h2><p style={{color:'var(--muted)'}}>OneMed — {t('unifiedPlatform')}</p></div>
    <form onSubmit={submit} style={{padding:24}}>
      {!mfaToken?<><Field label={t('email')}><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field>
      <Field label={t('password')}><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></Field>
      <button className="btn primary" style={{width:'100%'}} disabled={busy}>{t('login')}</button></>:
      <><h3>{t('mfa')}</h3><Field label="Authenticator code"><input className="input" maxLength={6} inputMode="numeric" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></Field>
      <button type="button" className="btn primary" style={{width:'100%'}} onClick={async()=>{try{await verifyMfa(mfaToken,code||'123456');nav('/app');}catch(e:any){toast(e.message,true);}}}>{t('verifyOtp')}</button></>}
      <div className="demo-flag" style={{marginTop:16}}>{t('demoMode')} — mona.patient@example.com / Demo!onemed1 · karim.doctor@example.com / Demo!onemedD1</div>
      <div className="login-links"><Link to="/register">{t('signup')}</Link><Link to="/emergency/em-demo-mona">{t('emergencyInfo')}</Link></div>
    </form>
  </div></div>;
}

export function EmergencyPage() {
  const { token = '' } = useParams(); const { t, i18n } = useTranslation();
  const [data,setData] = useState<{patient:Patient;settings:EmergencySettings}|null>(null);
  const [chat,setChat] = useState<ChatTurn[]>([]); const [msg,setMsg] = useState(''); const [openChat,setOpenChat] = useState(false);
  useEffect(()=>{ api.patientEmergency(token).then(r=>{ if(r) setData({patient:r.patient,settings:r.settings}); }); },[token]);
  const send = async (text:string) => { if(!text.trim()) return; setChat(p=>[...p,{role:'user',text}]); setMsg(''); const reply = await api.chatbot(text, data?.patient); setChat(p=>[...p,reply]); };
  const p = data?.patient; const s = data?.settings;
  return <div className="public-shell">
    <div className="public-top"><span className="logo">OneMed</span><span style={{fontSize:12}}>{t('noLogin')}</span><button className="btn sm" style={{background:'transparent',color:'#fff'}} onClick={()=>i18n.changeLanguage(i18n.language==='en'?'ar':'en')}><Languages size={14}/></button></div>
    <div className="public-wrap">
      <Card pad={false}><div className="card-body" style={{display:'flex',gap:14,alignItems:'center'}}><div className="avatar" style={{width:54,height:54,fontSize:18}}>{p?.name.slice(0,2).toUpperCase()}</div><div><h2>{p?.name||'…'}</h2><div style={{color:'var(--muted)'}}>DOB: {p?.dateOfBirth}</div>{s?.showBloodType && <div className="chip"><DropletIcon/> {p?.bloodGroup} {t('bloodGroup')}</div>}</div></div></Card>
      {s?.showAllergies && <Card title={t('criticalAllergies')}><div className="alert red"><strong>{p?.allergies.join(', ')||'—'}</strong></div></Card>}
      {s?.showConditions && <Card title={t('chronicConditions')}><ul>{p?.chronicDiseases.map(x=><li key={x}>{x}</li>)}</ul></Card>}
      {s?.showMedications && <Card title={t('currentMedications')}><p>Metformin 500mg — with meals<br/>Lisinopril 10mg — daily</p></Card>}
      {s?.showContacts && <Card title={t('emergencyContact')}><div style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}><div><strong>{p?.emergencyContact.name}</strong><div style={{color:'var(--muted)'}}>{p?.emergencyContact.relationship}</div></div><a className="btn sm danger" href={`tel:${p?.emergencyContact.phone}`}><Phone size={14}/>{t('call')}</a></div><div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderTop:'1px solid var(--line)'}}><div><strong>{p?.primaryPhysician}</strong><div style={{color:'var(--muted)'}}>{t('primaryPhysician')}</div></div><a className="btn sm outline" href={`tel:${p?.primaryPhysicianPhone}`}><Phone size={14}/>{t('call')}</a></div></Card>}
      {!p && <Empty message="Invalid or unknown QR token."/>}
    </div>
    <div className="bottom-cta">{s?.aiChatbotEnabled && <button className="btn primary" onClick={()=>setOpenChat(true)}>{t('askAi')} <Bot size={18}/></button>}</div>
    {openChat && <div className="modal-backdrop" onClick={()=>setOpenChat(false)}><div className="modal" onClick={e=>e.stopPropagation()} style={{display:'flex',flexDirection:'column',height:'80vh'}}>
      <div className="modal-head"><h3><Bot size={18}/> {t('askAi')}</h3><button className="btn sm" onClick={()=>setOpenChat(false)}>✕</button></div>
      <div className="modal-body" style={{flex:1,overflow:'auto'}}>
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
          <span className="chip"><strong>{p?.name||'—'}</strong></span>
          {p?.chronicDiseases.map(c=><span key={c} className="chip red">{c}</span>)}
          {p?.bloodGroup && <span className="chip blue">{p.bloodGroup}</span>}
          {p?.allergies.map(a=><span key={a} className="chip red">Allergy: {a}</span>)}
        </div>
        <div className="alert blue" style={{fontSize:12}}>{t('firstAidDisclaimer')}</div>
        <div className="chat-log">{chat.map((c,i)=><div key={i} className={`msg ${c.role==='user'?'me':''}`}><div style={{whiteSpace:'pre-wrap'}}>{c.text}</div>{c.sources?.length?<div style={{fontSize:11,marginTop:8,opacity:.75}}>{c.sources.join(' · ')}</div>:null}{c.confidence && <Badge tone={c.confidence==='High'?'green':'amber'}>{c.confidence}</Badge>}</div>)}</div>
      </div>
      <div style={{padding:12,borderTop:'1px solid var(--line)',display:'flex',gap:8}}>
        <input className="input" placeholder={i18n.language==='ar'?'صف حالة المريض…':'Describe the emergency…'} value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void send(msg);}}/>
        <button className="btn primary" onClick={()=>void send(msg)}><Send size={16}/></button>
      </div>
      <div style={{padding:'0 12px 12px',display:'flex',gap:6,flexWrap:'wrap'}}>{['Collapse and not breathing','Shaking / seizure','Allergic reaction swelling'].map(q=><button key={q} className="btn sm outline" onClick={()=>void send(q)}>{q}</button>)}</div>
    </div></div>}
  </div>;
}
function DropletIcon(){ return <span style={{fontSize:14}}>🩸</span>; }

export function NfcLanding() {
  const { token='' } = useParams(); const { t } = useTranslation(); const nav = useNavigate();
  return <div className="public-shell"><div className="public-top"><span className="logo">OneMed</span><span style={{fontSize:12}}>NFC / QR</span></div>
    <div className="public-wrap" style={{paddingTop:50}}><Card title="OneMed Patient ID" pad><p style={{color:'var(--muted)'}}>This wristband links to a verified OneMed patient profile.</p>
      <button className="btn navy" style={{width:'100%',marginBottom:10}} onClick={()=>nav('/login')}><Stethoscope size={16}/> {t('patientDashboard')} ({t('login')})</button>
      <button className="btn outline" style={{width:'100%'}} onClick={()=>nav(`/emergency/${token}`)}><HeartPulseIcon size={16}/> {t('emergencyInfo')}</button>
      <div className="disclaimer" style={{marginTop:14}}>Web NFC is available in Chrome on Android; QR scanning works on any phone.</div>
    </Card></div></div>;
}

export function FulfillmentPage() {
  const { token='' } = useParams(); const { t } = useTranslation(); const {toast} = useToast();
  const [rx,setRx] = useState<Prescription|null>(null); const [pharmacies,setPharmacies] = useState<Pharmacy[]>([]); const [selected,setSelected] = useState<string|null>(null);
  useEffect(()=>{ api.list<Prescription>('prescriptions',x=>x.linkToken===token).then(a=>setRx(a[0]||null)); api.list<Pharmacy>('pharmacies',x=>x.active&&x.status==='approved').then(a=>{
    const dist=(p:Pharmacy)=>Math.sqrt(Math.pow(p.lat-31.2,2)+Math.pow(p.lng-29.92,2)); setPharmacies([...a].sort((x,y)=>dist(x)-dist(y)));
  }); },[token]);
  const choose = (p:Pharmacy) => {
    if(!rx) return; setSelected(p.id);
    const text = `Hello ${p.name},\n\nI would like to order the following prescription from OneMed:\n*Doctor:* ${rx.doctorName}\n*Patient:* ${rx.patientName}\n\n*Medicines:*\n${rx.medicines.map((m,i)=>`${i+1}. ${m.name} ${m.dosage} — ${m.frequency} — ${m.duration}`).join('\n')}`;
    const url = `https://wa.me/${p.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`;
    api.mutate(db=>{ const r=db.prescriptions.find(x=>x.id===rx.id); if(r){r.pharmacyId=p.id;r.orderStatus='received';r.whatsappUrl=url;} }).then(()=>{ window.open(url,'_blank'); toast(t('orderPlaced')); });
  };
  return <div className="public-shell"><div className="public-top"><span className="logo">OneMed</span><span style={{fontSize:12}}>{t('prescriptions')}</span></div>
    <div className="public-wrap" style={{maxWidth:680}}>
      <PageHead title={t('selectPharmacy')} subtitle={rx?`${rx.patientName} — ${rx.medicines.length} ${t('extractedMedicines').toLowerCase()}`:''}/>
      {rx && <Card title={t('extractedMedicines')}><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('medicine')}</th><th>{t('dosage')}</th><th>{t('frequency')}</th><th>{t('duration')}</th></tr></thead><tbody>{rx.medicines.map((m,i)=><tr key={i}><td>{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td><td>{m.duration}</td></tr>)}</tbody></table></div><div className="disclaimer" style={{marginTop:10}}>{rx.linkExpiresAt && `${t('expires')}: ${new Date(rx.linkExpiresAt).toLocaleString()}`}</div></Card>}
      <Card title={t('nearbyPharmacies')} style={{marginTop:16}}><div className="grid">{pharmacies.map(p=><div key={p.id} className="card" style={{boxShadow:'none',borderColor:selected===p.id?'var(--teal)':'var(--line)'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong><StoreIcon size={16}/> {p.name}</strong><Badge tone="green">{p.hours}</Badge></div><div style={{color:'var(--muted)',fontSize:13}}><MapPin size={13}/> {p.address} · ★ {p.rating}</div><button className="btn primary sm" style={{marginTop:8}} onClick={()=>choose(p)}>{selected===p.id?<><CheckCircle2 size={14}/> {t('sendWhatsapp')}</>:<><MessageCircle size={14}/> {t('selectPharmacy')}</>}</button></div>)}</div></Card>
    </div></div>;
}

export function ConsentQrPage() {
  const { token='' } = useParams(); const { t } = useTranslation(); const {toast} = useToast(); const nav = useNavigate();
  const [grant,setGrant] = useState(false);
  return <div className="auth-wrap"><div className="auth-card"><div className="head"><h2>{t('consentPrompt')}</h2><p style={{color:'var(--muted)'}}>Connection token: {token}</p></div><div style={{padding:24}}>
    <div className="alert blue"><ClipboardCheck size={16}/> Dr. Karim Hassan requests access to your medical records for treatment.</div>
    <p style={{color:'var(--muted)',fontSize:13}}>Scope: lab results, imaging, prescriptions · Expires in 15 minutes · Every access will be logged.</p>
    {!grant?<button className="btn primary" style={{width:'100%'}} onClick={async()=>{await api.mutate(db=>{db.consents.push({id:`c_${Date.now()}`,patientId:'user_patient_1',granteeType:'doctor',granteeId:'user_doctor_1',granteeName:'Dr. Karim Hassan',scope:'records,prescriptions',purpose:'QR connection',active:true,grantedAt:new Date().toISOString()});});setGrant(true);toast(t('consentGranted'));}}>{t('grantConsent')}</button>:<button className="btn navy" style={{width:'100%'}} onClick={()=>nav('/app/patient')}>{t('continueToDashboard')}</button>}
  </div></div></div>;
}
