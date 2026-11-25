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
import { setLang } from '../i18n';
import type { ChatTurn, EmergencySettings, Patient, Prescription, Pharmacy, Role } from '../types';
import { BackButton, Badge, Card, CopyButton, Empty, Field, Modal, PageHead, StatusBadge, useToast } from '../components/ui';

/** Directional glyph that mirrors when the document switches to RTL ([dir=rtl]). */
function MirroredIcon({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  return <span aria-hidden="true" style={{ display:'inline-block', transform: i18n.language === 'ar' ? 'scaleX(-1)' : undefined }}>{children}</span>;
}

// The demo emergency token only exists in the browser demo dataset. In API mode
// a patient-specific signed token must be issued instead, so no generic link.
const DEMO_EMERGENCY = api.API_MODE === 'demo' ? '/emergency/em-demo-mona' : null;

export function Landing() {
  const { t, i18n } = useTranslation(); const navigate = useNavigate();
  const { session } = useAuth();
  return <div className="public-shell">
    <header className="landing-nav">
      <span className="brand-mark" style={{background:'var(--navy)',color:'#fff'}}>✚</span>
      <strong style={{fontSize:20,color:'var(--navy)'}} translate="no">OneMed</strong>
      <nav><a href="#features">{t('features')}</a><a href="#solutions">{t('solutions')}</a><a href="#how-it-works">{t('howItWorks')}</a></nav>
      <div style={{flex:1}}/>
      <button className="btn sm outline" onClick={()=>setLang(i18n.language==='en'?'ar':'en')}><Languages size={14}/> {t(i18n.language==='en'?'arabic':'english')}</button>
      {session ? <button className="btn primary" onClick={()=>navigate(api.routeForRole(session.user.role))}>{t('dashboard')}</button> : <><Link className="btn sm outline" to="/login">{t('login')}</Link><Link className="btn sm primary" to="/register">{t('signup')}</Link></>}
    </header>

    <section className="landing-hero">
      <div className="landing-inner">
        <div className="hero-copy">
          <span className="hero-eyebrow">{t('heroEyebrow')}</span>
          <h1>{t('unifiedPlatform')}</h1>
          <p>{t('unifiedDesc')}</p>
          <div className="hero-actions">
            <Link className="btn primary" to="/register">{t('signup')} <MirroredIcon><ArrowRight size={16}/></MirroredIcon></Link>
            {DEMO_EMERGENCY && <Link className="btn ghost-light" to={DEMO_EMERGENCY}>{t('emergencyInfo')}</Link>}
          </div>
        </div>
        {/* Image slot: replace .brand-panel with <img src="/images/landing-hero.png"> when a licensed clinical photo is supplied. */}
        <div className="hero-visual"><div className="brand-panel" role="img" aria-label={t('brandPanelAlt')}>
          <span className="brand-panel-cross">+</span>
          <span className="brand-panel-caption">{t('brandCaption')}</span>
        </div></div>
      </div>
    </section>

    <section className="landing-features" id="features">
      <div className="section-head"><h2>{t('features')}</h2><p>{t('featuresSub')}</p></div>
      <div className="feature-bento" id="solutions">
        {/* Image slot: add /images/nfc-wristband.png here when supplied. */}
        <article className="feature-cell accent-cell">
          <span className="feature-icon"><Smartphone size={22}/></span><h3>{t('featureNfc')}</h3><p>{t('featureNfcDesc')}</p>
          <span className="feature-glyph" aria-hidden="true">)))</span>
        </article>
        <article className="feature-cell tint-cell">
          <span className="feature-icon"><QrCode size={22}/></span><h3>{t('featureQr')}</h3><p>{t('featureQrDesc')}</p>
        </article>
        <article className="feature-cell">
          <span className="feature-icon"><Pill size={22}/></span><h3>{t('featurePharmacy')}</h3><p>{t('featurePharmacyDesc')}</p>
        </article>
      </div>
      <div className="trust-line">{t('trustLine')}</div>
    </section>

    <section className="landing-how" id="how-it-works">
      <div className="how-layout">
        <div className="how-intro"><h2>{t('howItWorks')}</h2><p>{t('howIntro')}</p></div>
        <div className="how-steps">
          {[[t('step1Title'),t('step1Desc')],[t('step2Title'),t('step2Desc')],[t('step3Title'),t('step3Desc')]].map(([title,desc],i)=>
            <div className="how-step" key={i}><span className="how-num">{i+1}</span><div><h3>{title}</h3><p>{desc}</p></div></div>)}
        </div>
      </div>
    </section>

    <footer className="site-footer"><span>{t('footerRights')}</span><Link to="/privacy" style={{color:'#cfe0fb'}}>{t('privacyPolicy')}</Link><Link to="/terms" style={{color:'#cfe0fb'}}>{t('termsOfService')}</Link>{DEMO_EMERGENCY && <Link to={DEMO_EMERGENCY} style={{color:'#cfe0fb'}}>{t('clinicalSupport')}</Link>}</footer>
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
    try {
      const allergies:string[] = String(form.allergies||'').split(',').map(s=>s.trim()).filter(Boolean);
      const chronicDiseases:string[] = String(form.chronicDiseases||'').split(',').map(s=>s.trim()).filter(Boolean);
      const profile = form.role==='patient'
        ? { patient:{ nationalId:form.nationalId, dateOfBirth:form.dateOfBirth, gender:form.gender,
            bloodGroup:form.bloodGroup, city:form.city, address:form.address, allergies, chronicDiseases } }
        : { doctor:{ specialty:form.specialty, licenseNumber:form.licenseNumber, city:form.city, clinicName:form.clinicName } };
      const r = await register({ name:form.name, email:form.email, password:form.password, role:form.role,
        phone:form.phone, emergencyContact:form.emergencyContact, ...profile });
      setChallenge(r); setStep(4);
    }
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
      <Field label={t('password')} hint={t('passwordHint')}><input className="input" type="password" value={form.password} onChange={e=>set('password',e.target.value)}/></Field>
    </>}
    {step===1 && <><h3>{t('emergencyContact')} <Badge tone="red">{t('required')}</Badge></h3><p style={{color:'var(--muted)'}}>{t('emergencyContactHint')}</p>
      <Field label={t('fullNameArabic')}><input className="input" dir="rtl" value={form.emergencyContact.name} onChange={e=>setE('name',e.target.value)}/></Field>
      <Field label={t('phoneNumber')}><input className="input" placeholder="+20 100 123 4567" value={form.emergencyContact.phone} onChange={e=>setE('phone',e.target.value)}/></Field>
      <Field label={t('relationship')}><select className="input" value={form.emergencyContact.relationship} onChange={e=>setE('relationship',e.target.value)}><option value="">-</option>{[['Spouse','relSpouse'],['Parent','relParent'],['Sibling','relSibling'],['Child','relChild'],['Friend','relFriend'],['Other','relOther']].map(([value,key])=><option key={value} value={value}>{t(key)}</option>)}</select></Field>
    </>}
    {step===2 && <><h3>{form.role==='patient'?t('patient'):t('doctor')} {t('profile')}</h3>
      {form.role==='patient'?<>
        <Field label={t('nationalId')}><input className="input" maxLength={14} value={form.nationalId} onChange={e=>set('nationalId',e.target.value)}/></Field>
        <div className="grid cols-2"><Field label={t('dateOfBirth')}><input className="input" type="date" value={form.dateOfBirth} onChange={e=>set('dateOfBirth',e.target.value)}/></Field>
        <Field label={t('gender')}><select className="input" value={form.gender} onChange={e=>set('gender',e.target.value)}><option value="male">{t('male')}</option><option value="female">{t('female')}</option></select></Field></div>
        <Field label={t('bloodGroup')}><select className="input" value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)}>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g=><option key={g}>{g}</option>)}</select></Field>
        <Field label={t('city')}><input className="input" value={form.city} onChange={e=>set('city',e.target.value)}/></Field>
        <Field label={t('allergies')} hint={t('commaSeparated')}><input className="input" value={form.allergies} onChange={e=>set('allergies',e.target.value)}/></Field>
        <Field label={t('chronicConditions')} hint={t('commaSeparated')}><input className="input" value={form.chronicDiseases} onChange={e=>set('chronicDiseases',e.target.value)}/></Field>
      </>:<><Field label={t('specialty')}><input className="input" value={form.specialty||''} onChange={e=>set('specialty',e.target.value)}/></Field><Field label={t('licenseNumber')}><input className="input" value={form.licenseNumber||''} onChange={e=>set('licenseNumber',e.target.value)}/></Field><Field label={t('city')}><input className="input" value={form.city} onChange={e=>set('city',e.target.value)}/></Field></>}
    </>}
    {step===3 && <><h3>{t('confirm')}</h3><dl style={{lineHeight:2}}><dt style={{color:'var(--muted)'}}>{t('name')}</dt><dd>{form.name}</dd><dt style={{color:'var(--muted)'}}>{t('email')}</dt><dd>{form.email}</dd><dt style={{color:'var(--muted)'}}>{t('emergencyContact')}</dt><dd>{form.emergencyContact.name} - {form.emergencyContact.phone}</dd><dt style={{color:'var(--muted)'}}>{t('role')}</dt><dd>{t(form.role)}</dd></dl><p className="disclaimer">{t('aiDisclaimerRegister')}</p></>}
    {step===4 && <><h3>{t('otp')}</h3><p style={{color:'var(--muted)'}}>{t('otpHint')}</p>
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
  const [busy,setBusy] = useState(false); const [error,setError]=useState('');
  const submit = async (e:React.FormEvent) => { e.preventDefault(); setBusy(true); setError(''); try { await login(email,password); nav('/app'); } catch(err:any) { if(String(err.message).startsWith('MFA_REQUIRED:')) { setMfaToken(err.message.split(':')[1]); toast(t('mfaToast')); } else { setError(err.message||t('invalidCredentials')); toast(err.message||t('invalidCredentials'),true); } } finally { setBusy(false); } };
  return <div className="auth-wrap"><div className="auth-card">
    <div className="head"><div className="brand-mark" style={{background:'var(--navy)',color:'#fff',marginBottom:10}}>✚</div><h2>{t('welcomeBack')}</h2><p style={{color:'var(--muted)'}}><span translate="no">OneMed</span> - {t('unifiedPlatform')}</p></div>
    <form onSubmit={submit} style={{padding:24}}>
      {error && <div className="alert red" role="alert" style={{marginBottom:12}}>{error}</div>}
      {!mfaToken?<><Field label={t('email')}><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field>
      <Field label={t('password')}><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></Field>
      <button className="btn primary" style={{width:'100%'}} disabled={busy}>{t('login')}</button></>:
      <><h3>{t('mfa')}</h3><Field label={t('mfaCode')}><input className="input" maxLength={6} inputMode="numeric" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></Field>
      <button type="button" className="btn primary" style={{width:'100%'}} onClick={async()=>{try{await verifyMfa(mfaToken,code||'123456');nav('/app');}catch(e:any){toast(e.message,true);}}}>{t('verifyOtp')}</button></>}
      {api.API_MODE==='demo' && <div className="demo-flag" style={{marginTop:16}}>{t('demoMode')} - <span translate="no">mona.patient@example.com / Demo!onemed1 · karim.doctor@example.com / Demo!onemedD1</span></div>}
      <div className="login-links"><Link to="/register">{t('signup')}</Link>{DEMO_EMERGENCY && <Link to={DEMO_EMERGENCY}>{t('emergencyInfo')}</Link>}</div>
    </form>
  </div></div>;
}

export function EmergencyPage() {
  const { token = '' } = useParams(); const { t, i18n } = useTranslation(); const {toast}=useToast();
  const [data,setData] = useState<any>(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
  const [chat,setChat] = useState<ChatTurn[]>([]); const [msg,setMsg] = useState(''); const [openChat,setOpenChat] = useState(false);
  useEffect(()=>{ let live=true; setLoading(true); void api.emergencyProfile(token).then(r=>{if(live){setData(r);setLoading(false);}}).catch((e:any)=>{if(live){setError(e.message||t('invalidQrToken'));setLoading(false);}}); return ()=>{live=false;}; },[token]);
  const send = async (text:string) => {
    if(!text.trim()) return;
    setChat(p=>[...p,{role:'user',text}]); setMsg('');
    try {
      const r = await api.emergencyChat(token, text, i18n.language==='ar'?'ar':'en');
      setChat(p=>[...p,{role:'assistant', text:r.text, sources:r.sources, confidence:r.confidence, disclaimer:r.disclaimer}]);
    } catch(e:any) { setChat(p=>[...p,{role:'assistant', text:e.message||t('serviceUnavailable')}]); }
  };
  const v = data?.visible; const s = data?.settings;
  return <div className="public-shell">
    <div className="public-top"><span className="logo" translate="no">OneMed</span><span style={{fontSize:12}}>{t('noLogin')}</span><div style={{flex:1}}/><BackButton fallback="/"/><button className="btn sm" style={{background:'transparent',color:'#fff'}} aria-label={t('language')} onClick={()=>setLang(i18n.language==='en'?'ar':'en')}><Languages size={14}/></button></div>
    <div className="public-wrap">
      <Card pad={false}><div className="card-body" style={{display:'flex',gap:14,alignItems:'center'}}><div className="avatar" style={{width:54,height:54,fontSize:18}}>{(v?.patientName||'?').slice(0,2).toUpperCase()}</div><div><h2>{v?.patientName||'…'}</h2>{v?.bloodGroup && <div className="alert red" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 16px',fontSize:20,fontWeight:700}}><DropletIcon/> <bdi dir="ltr">{v.bloodGroup}</bdi> · {t('bloodGroup')}</div>}</div></div></Card>
      {v?.allergies && <Card title={t('criticalAllergies')}><div className="alert red"><strong>{v.allergies.join(', ')||'-'}</strong></div></Card>}
      {v?.chronicConditions && <Card title={t('chronicConditions')}><ul>{v.chronicConditions.map((x:string)=><li key={x}>{x}</li>)}</ul></Card>}
      {v?.medications && <Card title={t('currentMedications')}>{v.medications.length ? <ul>{v.medications.map((m:string,i:number)=><li key={i}>{m}</li>)}</ul> : <p style={{color:'var(--muted)'}}>{t('noMedicationsFile')}</p>}</Card>}
      {v?.emergencyContacts && <Card title={t('emergencyContact')}>{v.emergencyContacts.map((c:any,i:number)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--line)'}}><div><strong>{c.name}</strong><div style={{color:'var(--muted)'}}>{c.relationship}</div></div>{c.phone && <a className="btn sm danger" href={`tel:${c.phone}`}><Phone size={14}/>{t('call')}</a>}</div>)}{v.primaryPhysician && <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}><strong>{v.primaryPhysician}</strong>{v.primaryPhysicianPhone && <a className="btn sm danger" href={`tel:${v.primaryPhysicianPhone}`}><Phone size={14}/>{t('call')}</a>}</div>}</Card>}
      {loading && <Card><p>{t('loadingEmergency')}</p></Card>}
      {error && <div className="alert red">{error}</div>}
      {!loading && !error && !v && <Empty message={t('invalidQrToken')}/>}
    </div>
    <div className="bottom-cta">{s?.aiChatbotEnabled && <button className="btn primary" onClick={()=>setOpenChat(true)}>{t('askAi')} <Bot size={18}/></button>}</div>
    {openChat && <div className="modal-backdrop" onClick={()=>setOpenChat(false)}><div className="modal" onClick={e=>e.stopPropagation()} style={{display:'flex',flexDirection:'column',height:'80vh'}}>
      <div className="modal-head"><h3><Bot size={18}/> {t('askAi')}</h3><button className="btn sm" onClick={()=>setOpenChat(false)}>✕</button></div>
      <div className="modal-body" style={{flex:1,overflow:'auto'}}>
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
          <span className="chip"><strong>{v?.patientName||'-'}</strong></span>
          {(v?.chronicConditions||[]).map((c:string)=><span key={c} className="chip red">{c}</span>)}
          {v?.bloodGroup && <span className="chip blue"><bdi dir="ltr">{v.bloodGroup}</bdi></span>}
          {(v?.allergies||[]).map((a:string)=><span key={a} className="chip red">{t('allergyLabel')} {a}</span>)}
        </div>
        <div className="alert blue" style={{fontSize:12}}>{t('firstAidDisclaimer')}</div>
        <div className="chat-log">{chat.map((c,i)=><div key={i} className={`msg ${c.role==='user'?'me':''}`}><div style={{whiteSpace:'pre-wrap'}}>{c.text}</div>{c.sources?.length?<div style={{fontSize:11,marginTop:8,opacity:.75}}>{c.sources.join(' · ')}</div>:null}{c.confidence && <Badge tone={c.confidence==='High'?'green':'amber'}>{t(c.confidence==='Knowledge Gap'?'knowledgeGapShort':String(c.confidence).toLowerCase())}</Badge>}{c.role==='assistant' && <button className="btn sm outline" style={{marginTop:8}} onClick={()=>void api.reportIssue({kind:'emergency_chat',message:t('issueReasonFirstAid'),source:c.sources?.join(', ')||'emergency-chat'}).then(()=>toast(t('issueLogged'))).catch((e:any)=>toast(e.message,true))}>{t('reportIssue')}</button>}</div>)}</div>
      </div>
      <div style={{padding:12,borderTop:'1px solid var(--line)',display:'flex',gap:8}}>
        <input className="input" placeholder={t('emergencyPrompt')} value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void send(msg);}}/>
        <button className="btn primary" aria-label={t('send')} onClick={()=>void send(msg)}><MirroredIcon><Send size={16}/></MirroredIcon></button>
      </div>
      <div style={{padding:'0 12px 12px',display:'flex',gap:6,flexWrap:'wrap'}}>{[t('quickCollapse'),t('quickSeizure'),t('quickAllergy')].map(q=><button key={q} className="btn sm outline" onClick={()=>void send(q)}>{q}</button>)}</div>
    </div></div>}
  </div>;
}
function DropletIcon(){ return <span style={{fontSize:14}}>🩸</span>; }

export function NfcLanding() {
  const { token='' } = useParams(); const { t } = useTranslation(); const nav = useNavigate();
  const [resolved,setResolved] = useState<{patientId:string;emergencyToken?:string}|null>(null); const [error,setError]=useState('');
  useEffect(()=>{ void api.resolveNfc(token).then(setResolved).catch(e=>setError(e.message||t('invalidNfcToken'))); },[token]);
  return <div className="public-shell"><div className="public-top"><span className="logo" translate="no">OneMed</span><span style={{fontSize:12}} translate="no">NFC / QR</span><div style={{flex:1}}/><BackButton fallback="/"/></div>
    <div className="public-wrap" style={{paddingTop:50}}><Card title={t('patientIdCard')} pad><p style={{color:'var(--muted)'}}>{t('wristbandIntro')}</p>
      {error ? <div className="alert red">{error}</div> : <div className="alert green">{resolved?t('patientVerified', {id:resolved.patientId}):t('verifyingWristband')}</div>}
      <button className="btn navy" style={{width:'100%',marginBottom:10}} onClick={()=>nav('/login')}><Stethoscope size={16}/> {t('patientDashboard')} ({t('login')})</button>
      <button className="btn outline" style={{width:'100%'}} disabled={!resolved?.emergencyToken} onClick={()=>nav(`/emergency/${resolved!.emergencyToken}`)}><HeartPulseIcon size={16}/> {t('emergencyInfo')}</button>
      <div className="disclaimer" style={{marginTop:14}}>{t('nfcDisclaimer')}</div>
    </Card></div></div>;
}

export function FulfillmentPage() {
  const { token='' } = useParams(); const { t } = useTranslation(); const {toast} = useToast();
  const [rx,setRx] = useState<Prescription|null>(null); const [pharmacies,setPharmacies] = useState<Pharmacy[]>([]); const [selected,setSelected] = useState<string|null>(null);
  const [loadError,setLoadError]=useState(''); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let cancelled=false;
    const load = (coords?:{lat:number;lng:number}) => {
      void api.fulfillmentProfile(token,coords).then(result=>{
        if(cancelled) return;
        setRx(result.prescription);
        setPharmacies(result.pharmacies.map((p:any)=>({...p,lat:p.lat??31.2,lng:p.lng??29.92,location:{lat:p.lat??31.2,lng:p.lng??29.92}})));
        setLoading(false);
      }).catch((e:any)=>{ if(cancelled)return; setLoadError(e.message||t('invalidFulfillmentLink')); setLoading(false); });
    };
    if(navigator.geolocation) navigator.geolocation.getCurrentPosition(pos=>load({lat:pos.coords.latitude,lng:pos.coords.longitude}),()=>load(),{timeout:3000});
    else load();
    return ()=>{cancelled=true;};
  },[token]);
  const choose = async (p:Pharmacy) => {
    if(!rx) return; setSelected(p.id);
    try { const result=await api.selectPharmacy(token,p.id); window.open(result.whatsappUrl,'_blank'); toast(t('orderPlaced')); }
    catch(e:any){ toast(e.message,true); }
  };
  return <div className="public-shell"><div className="public-top"><span className="logo" translate="no">OneMed</span><span style={{fontSize:12}}>{t('prescriptions')}</span><div style={{flex:1}}/><BackButton fallback="/"/></div>
    <div className="public-wrap" style={{maxWidth:680}}>
      <PageHead title={t('selectPharmacy')} subtitle={rx?`${rx.patientName} - ${rx.medicines.length} ${t('extractedMedicines').toLowerCase()}`:''}/>
      {loading && <Card><p>{t('loading')}</p></Card>}
      {loadError && <div className="alert red">{loadError}</div>}
      {rx && <Card title={t('extractedMedicines')}><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('medicine')}</th><th>{t('dosage')}</th><th>{t('frequency')}</th><th>{t('duration')}</th></tr></thead><tbody>{rx.medicines.map((m,i)=><tr key={i}><td>{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td><td>{m.duration}</td></tr>)}</tbody></table></div><div className="disclaimer" style={{marginTop:10}}>{rx.linkExpiresAt && `${t('expires')}: ${new Date(rx.linkExpiresAt).toLocaleString()}`}</div></Card>}
      <Card title={t('nearbyPharmacies')} style={{marginTop:16}}><div className="grid">{pharmacies.map(p=><div key={p.id} className="card" style={{boxShadow:'none',borderColor:selected===p.id?'var(--teal)':'var(--line)'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong><StoreIcon size={16}/> {p.name}</strong><Badge tone="green">{p.hours}</Badge></div><div style={{color:'var(--muted)',fontSize:13}}><MapPin size={13}/> {p.address} · ★ {p.rating}</div><button className="btn primary sm" style={{marginTop:8}} onClick={()=>choose(p)}>{selected===p.id?<><CheckCircle2 size={14}/> {t('sendWhatsapp')}</>:<><MessageCircle size={14}/> {t('selectPharmacy')}</>}</button></div>)}</div></Card>
    </div></div>;
}
