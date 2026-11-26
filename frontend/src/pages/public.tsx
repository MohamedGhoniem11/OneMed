import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, ArrowRight, Bot, CheckCircle2, Droplet, Languages, MapPin, MessageCircle,
  Phone, Pill, Plus, QrCode, Radio, Send, Smartphone, Stethoscope, Store as StoreIcon,
  HeartPulse as HeartPulseIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import * as api from '../api/client';
import { setLang } from '../i18n';
import type { ChatTurn, Patient, Pharmacy, Prescription, Role } from '../types';
import {
  BackButton, Badge, Card, Empty, Field, Modal, PageHead, Skeleton, useToast,
} from '../components/ui';

/** Directional glyph that mirrors when the document switches to RTL ([dir=rtl]). */
function MirroredIcon({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  return <span aria-hidden="true" style={{ display:'inline-block', transform: i18n.language === 'ar' ? 'scaleX(-1)' : undefined }}>{children}</span>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^01[0125]\d{8}$/;
const STEPS = ['profile', 'emergencyContact', 'roleDetails', 'confirm'];
const ROLE_OPTIONS: { id: Role; key: string; invite?: boolean }[] = [
  { id:'patient', key:'patient' },
  { id:'doctor', key:'doctor' },
  { id:'lab_staff', key:'labStaff' },
  { id:'pharmacy', key:'pharmacy' },
  { id:'hospital_admin', key:'hospitalAdmin', invite:true },
  { id:'admin', key:'admin', invite:true },
];
const roleLabel = (key: string, t: (k: string) => string, invite?: boolean) =>
  `${t(key)}${invite ? ` · ${t('byInvitation')}` : ''}`;

export function Landing() {
  const { t, i18n } = useTranslation(); const navigate = useNavigate();
  const { session } = useAuth();
  return <div className="public-shell">
    <header className="landing-nav">
      <span className="brand-mark" style={{background:'var(--navy)',color:'#fff'}}><Plus size={18} strokeWidth={3} aria-hidden="true"/></span>
      <strong style={{fontSize:20,color:'var(--navy)'}} translate="no">OneMed</strong>
      <nav><a href="#features">{t('features')}</a><a href="#solutions">{t('solutions')}</a><a href="#how-it-works">{t('howItWorks')}</a></nav>
      <div style={{flex:1}}/>
      <button className="btn sm outline" onClick={()=>setLang(i18n.language==='en'?'ar':'en')}><Languages size={14}/> {t(i18n.language==='en'?'arabic':'english')}</button>
      {session ? <button className="btn primary" onClick={()=>navigate(api.routeForRole(session.user.role))}>{t('dashboard')}</button> : <><Link className="btn sm outline" to="/login">{t('login')}</Link><Link className="btn sm primary" to="/register">{t('signup')}</Link></>}
    </header>

    <section className="landing-hero">
      <div className="landing-inner">
        <div className="hero-copy">
          <h1>{t('unifiedPlatform')}</h1>
          <p>{t('unifiedDesc')}</p>
          <div className="hero-actions">
            <Link className="btn primary" to="/register">{t('signup')} <MirroredIcon><ArrowRight size={16}/></MirroredIcon></Link>
            <Link className="btn ghost-light" to="/login">{t('login')}</Link>
          </div>
        </div>
        {/* Image slot: replace .brand-panel with <img src="/images/landing-hero.png"> when a licensed clinical photo is supplied. */}
        <div className="hero-visual"><div className="brand-panel" role="img" aria-label={t('brandPanelAlt')}>
          <span className="brand-panel-cross" aria-hidden="true"><Plus size={96} strokeWidth={2}/></span>
          <span className="brand-panel-caption">{t('brandCaption')}</span>
        </div></div>
      </div>
    </section>

    <section className="landing-features" id="features">
      <div className="section-head"><h2>{t('features')}</h2><p>{t('featuresSub')}</p></div>
      <div className="feature-bento" id="solutions">
        <article className="feature-cell accent-cell">
          <span className="feature-icon"><Smartphone size={22}/></span><h3>{t('featureNfc')}</h3><p>{t('featureNfcDesc')}</p>
          <span className="feature-glyph" aria-hidden="true"><Radio size={64} strokeWidth={1.5}/></span>
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

    <footer className="site-footer"><span>{t('footerRights')}</span><Link to="/privacy">{t('privacyPolicy')}</Link><Link to="/terms">{t('termsOfService')}</Link></footer>
  </div>;
}

export function Register() {
  const { t } = useTranslation(); const { register, verifyOtp } = useAuth(); const nav = useNavigate(); const {toast} = useToast();
  const [step,setStep] = useState(0);
  const [form,setForm] = useState<any>({role:'patient',name:'',email:'',password:'',phone:'',emergencyContact:{name:'',relationship:'',phone:''},nationalId:'',dateOfBirth:'',gender:'male',bloodGroup:'O+',city:'Alexandria',address:'',allergies:'',chronicDiseases:''});
  const [otp,setOtp] = useState('');
  const [challenge,setChallenge] = useState<{challengeId:string;devCode?:string}|null>(null);
  const [busy,setBusy] = useState(false);
  const [errors,setErrors] = useState<Record<string,string>>({});
  const set = (k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));
  const setE = (k:string,v:string)=>setForm((f:any)=>({...f,emergencyContact:{...f.emergencyContact,[k]:v}}));
  const cls = (key:string)=>`input ${errors[key]?'invalid':''}`;
  // Only patients and doctors can self-register; staff accounts are provisioned
  // by an administrator. Keep the roles visible but never send a doomed request.
  const inviteOnly = form.role==='lab_staff'||form.role==='pharmacy'||form.role==='hospital_admin'||form.role==='admin';
  const goBack = () => { setErrors({}); if (step>0 && step<4) setStep(step-1); else nav('/'); };

  const validate = (stepNo:number) => {
    const e:Record<string,string> = {};
    if (stepNo===0) {
      if (!form.name.trim()) e.name = t('fieldRequiredNamed',{field:t('name')});
      if (!form.email.trim()) e.email = t('fieldRequiredNamed',{field:t('email')});
      else if (!EMAIL_RE.test(form.email.trim())) e.email = t('invalidEmail');
      if (!form.password) e.password = t('fieldRequiredNamed',{field:t('password')});
      else if (form.password.length<8) e.password = t('passwordShort');
      if (!form.phone.trim()) e.phone = t('fieldRequiredNamed',{field:t('phoneNumber')});
      else if (!PHONE_RE.test(form.phone.trim())) e.phone = t('invalidPhone');
    }
    if (stepNo===1) {
      if (!form.emergencyContact.name.trim()) e.ecName = t('fieldRequiredNamed',{field:t('name')});
      if (!form.emergencyContact.relationship) e.ecRelationship = t('fieldRequiredNamed',{field:t('relationship')});
      if (!form.emergencyContact.phone.trim()) e.ecPhone = t('fieldRequiredNamed',{field:t('phoneNumber')});
      else if (!PHONE_RE.test(form.emergencyContact.phone.trim())) e.ecPhone = t('invalidPhone');
    }
    if (stepNo===2 && form.role==='patient') {
      if (!/^\d{14}$/.test(form.nationalId)) e.nationalId = t('invalidNationalId');
      if (!form.dateOfBirth) e.dateOfBirth = t('fieldRequiredNamed',{field:t('dateOfBirth')});
    }
    return e;
  };

  const next = async () => {
    const found = validate(step);
    if (Object.keys(found).length) { setErrors(found); toast(t('checkFields'),true); return; }
    setErrors({});
    if (step<3) { setStep(step+1); return; }
    setBusy(true);
    try {
      const allergies:string[] = String(form.allergies||'').split(',').map(s=>s.trim()).filter(Boolean);
      const chronicDiseases:string[] = String(form.chronicDiseases||'').split(',').map(s=>s.trim()).filter(Boolean);
      let profile: Record<string, any> = {};
      if (form.role==='patient') {
        profile = { patient:{ nationalId:form.nationalId, dateOfBirth:form.dateOfBirth, gender:form.gender,
          bloodGroup:form.bloodGroup, city:form.city, address:form.address, allergies, chronicDiseases } };
      } else if (form.role==='doctor') {
        profile = { doctor:{ specialty:form.specialty, licenseNumber:form.licenseNumber, city:form.city, clinicName:form.clinicName } };
      }
      const r = await register({ name:form.name, email:form.email, password:form.password, role:form.role,
        phone:form.phone, emergencyContact:form.emergencyContact, ...profile });
      setChallenge(r); setStep(4);
    }
    catch(e:any){ setErrors({form:e.message||t('error')}); toast(e.message||t('error'),true); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (otp && !/^\d{6}$/.test(otp)) { setErrors({otp:t('invalidOtp')}); return; }
    setErrors({});
    try { await verifyOtp(challenge!.challengeId, otp || challenge?.devCode || '000000'); toast(t('saved')); nav('/app'); }
    catch(e:any){ setErrors({form:e.message||t('error')}); toast(e.message||t('error'),true); }
  };

  return <div className="auth-wrap"><div className="auth-card">
    <div className="auth-topbar"><BackButton fallback="/" onClick={goBack}/></div>
    <div className="head">
      <span className="brand-mark" style={{background:'var(--navy)',color:'#fff',marginBottom:10}}><Plus size={18} strokeWidth={3} aria-hidden="true"/></span>
      <h2>{t('register')}</h2>
      <p className="muted">{step<4?`${t('step')} ${step+1} ${t('of')} 4`:t('otp')}</p>
      {step<4 ? <ol className="stepper" aria-label={t('registrationSteps')}>
        {STEPS.map((key,i)=><li key={key} className={i<step?'done':i===step?'current':''} aria-current={i===step?'step':undefined}>
          <span className="stepper-num" aria-hidden="true">{i<step?<CheckCircle2 size={14}/>:i+1}</span>
          <span className="stepper-label">{t(key)}</span>
        </li>)}
      </ol> : <div className="progress" aria-hidden="true">{[0,1,2,3].map(i=><i key={i} className="on"/>)}</div>}
    </div>
    <div className="auth-body">
      {errors.form && <div className="alert red" role="alert">{errors.form}</div>}
      {step===0 && <>
        <h3 className="form-section-title">{t('profile')}</h3>
        <Field label={t('role')}>
          <select className={cls('role')} value={form.role} onChange={e=>set('role',e.target.value)}>
            {ROLE_OPTIONS.map(r=><option key={r.id} value={r.id}>{roleLabel(r.key,t,r.invite)}</option>)}
          </select>
          {inviteOnly && <span className="hint" role="status">{t('inviteNote')}</span>}
        </Field>
        <Field label={t('name')} error={errors.name}><input className={cls('name')} value={form.name} onChange={e=>set('name',e.target.value)} autoComplete="name"/></Field>
        <Field label={t('email')} error={errors.email}><input className={cls('email')} type="email" value={form.email} onChange={e=>set('email',e.target.value)} autoComplete="email"/></Field>
        <Field label={t('phoneNumber')} error={errors.phone}><input className={cls('phone')} placeholder="01012345678" value={form.phone} onChange={e=>set('phone',e.target.value)} autoComplete="tel"/></Field>
        <Field label={t('password')} error={errors.password} hint={t('passwordHint')}><input className={cls('password')} type="password" value={form.password} onChange={e=>set('password',e.target.value)} autoComplete="new-password"/></Field>
      </>}
      {step===1 && <>
        <h3 className="form-section-title">{t('emergencyContact')} <Badge tone="red">{t('required')}</Badge></h3>
        <p className="muted">{t('emergencyContactHint')}</p>
        <Field label={t('fullNameArabic')} error={errors.ecName}><input className={cls('ecName')} dir="rtl" value={form.emergencyContact.name} onChange={e=>setE('name',e.target.value)}/></Field>
        <Field label={t('phoneNumber')} error={errors.ecPhone}><input className={cls('ecPhone')} placeholder="01012345678" value={form.emergencyContact.phone} onChange={e=>setE('phone',e.target.value)}/></Field>
        <Field label={t('relationship')} error={errors.ecRelationship}>
          <select className={cls('ecRelationship')} value={form.emergencyContact.relationship} onChange={e=>setE('relationship',e.target.value)}>
            <option value="">-</option>
            {[['Spouse','relSpouse'],['Parent','relParent'],['Sibling','relSibling'],['Child','relChild'],['Friend','relFriend'],['Other','relOther']].map(([value,key])=><option key={value} value={value}>{t(key)}</option>)}
          </select>
        </Field>
      </>}
      {step===2 && <>
        <h3 className="form-section-title">{form.role==='patient'?t('patient'):roleLabelKeyFor(form.role,t)} {t('roleDetails')}</h3>
        {form.role==='patient'?<>
          <Field label={t('nationalId')} error={errors.nationalId}><input className={cls('nationalId')} maxLength={14} value={form.nationalId} onChange={e=>set('nationalId',e.target.value)}/></Field>
          <div className="grid cols-2">
            <Field label={t('dateOfBirth')} error={errors.dateOfBirth}><input className={cls('dateOfBirth')} type="date" value={form.dateOfBirth} onChange={e=>set('dateOfBirth',e.target.value)}/></Field>
            <Field label={t('gender')}><select className="input" value={form.gender} onChange={e=>set('gender',e.target.value)}><option value="male">{t('male')}</option><option value="female">{t('female')}</option></select></Field>
          </div>
          <Field label={t('bloodGroup')}><select className="input" value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)}>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g=><option key={g}>{g}</option>)}</select></Field>
          <Field label={t('city')}><input className="input" value={form.city} onChange={e=>set('city',e.target.value)}/></Field>
          <Field label={t('allergies')} hint={t('commaSeparated')}><input className="input" value={form.allergies} onChange={e=>set('allergies',e.target.value)}/></Field>
          <Field label={t('chronicConditions')} hint={t('commaSeparated')}><input className="input" value={form.chronicDiseases} onChange={e=>set('chronicDiseases',e.target.value)}/></Field>
        </>:<>
          {(form.role==='hospital_admin'||form.role==='admin') && <div className="alert amber">{t('inviteNote')}</div>}
          {form.role==='doctor' && <>
            <Field label={t('specialty')}><input className="input" value={form.specialty||''} onChange={e=>set('specialty',e.target.value)}/></Field>
            <Field label={t('licenseNumber')}><input className="input" value={form.licenseNumber||''} onChange={e=>set('licenseNumber',e.target.value)}/></Field>
          </>}
          <Field label={t('city')}><input className="input" value={form.city} onChange={e=>set('city',e.target.value)}/></Field>
        </>}
      </>}
      {step===3 && <>
        <h3 className="form-section-title">{t('confirm')}</h3>
        {inviteOnly && <div className="alert amber" role="status">{t('inviteNote')}</div>}
        <dl className="confirm-list">
          <dt>{t('name')}</dt><dd>{form.name}</dd>
          <dt>{t('email')}</dt><dd>{form.email}</dd>
          <dt>{t('phoneNumber')}</dt><dd><bdi dir="ltr">{form.phone}</bdi></dd>
          <dt>{t('emergencyContact')}</dt><dd>{form.emergencyContact.name} - <bdi dir="ltr">{form.emergencyContact.phone}</bdi></dd>
          <dt>{t('role')}</dt><dd>{roleLabel(form.role,t,form.role==='hospital_admin'||form.role==='admin')}</dd>
        </dl>
        <p className="disclaimer">{t('aiDisclaimerRegister')}</p>
      </>}
      {step===4 && <>
        <h3 className="form-section-title">{t('otp')}</h3>
        <p className="muted">{t('otpHint')}</p>
        {challenge?.devCode && <div className="alert blue"><AlertTriangle size={14} aria-hidden="true"/> {t('demoMode')}: {t('verifyOtp')} = <strong><bdi dir="ltr">{challenge.devCode}</bdi></strong></div>}
        <Field label={t('verifyOtp')} error={errors.otp}><input className={cls('otp')} maxLength={6} inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/></Field>
      </>}
      <div className="form-actions">
        {step>0 && step<4 && <BackButton fallback="/" onClick={goBack}/>}
        {step<4
          ? <button className="btn primary" onClick={()=>void next()} disabled={busy||(step===3&&inviteOnly)} aria-busy={busy}>{busy?t('loading'):t(step===3?'confirm':'continue')}</button>
          : <button className="btn primary" onClick={()=>void verify()}>{t('verifyOtp')}</button>}
        <div style={{flex:1}}/>
        <Link className="btn sm" to="/login">{t('login')}</Link>
      </div>
    </div>
  </div></div>;
}

/** Localized role name without the invitation suffix. */
function roleLabelKeyFor(role: Role, t: (k: string) => string) {
  const key = role === 'lab_staff' ? 'labStaff' : role === 'hospital_admin' ? 'hospitalAdmin' : role;
  return t(key);
}

export function Login() {
  const { t } = useTranslation(); const { login, verifyMfa } = useAuth(); const nav = useNavigate(); const {toast} = useToast();
  const demoMode = api.API_MODE === 'demo';
  const [email,setEmail] = useState(demoMode?'mona.patient@example.com':'');
  const [password,setPassword] = useState(demoMode?'Demo!onemed1':'');
  const [mfaToken,setMfaToken] = useState<string|null>(null);
  const [code,setCode] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await login(email,password); nav('/app'); }
    catch(err:any) {
      if(String(err.message).startsWith('MFA_REQUIRED:')) { setMfaToken(err.message.split(':')[1]); toast(t('mfaToast')); }
      else { setError(err.message||t('invalidCredentials')); toast(err.message||t('invalidCredentials'),true); }
    }
    finally { setBusy(false); }
  };
  return <div className="auth-wrap"><div className="auth-card">
    <div className="auth-topbar"><BackButton fallback="/" to="/"/></div>
    <div className="head">
      <span className="brand-mark" style={{background:'var(--navy)',color:'#fff',marginBottom:10}}><Plus size={18} strokeWidth={3} aria-hidden="true"/></span>
      <h2>{t('welcomeBack')}</h2>
      <p className="muted"><span translate="no">OneMed</span> - {t('unifiedPlatform')}</p>
    </div>
    <form onSubmit={submit} className="auth-body">
      {error && <div className="alert red" role="alert">{error}</div>}
      {!mfaToken?<>
        <Field label={t('email')}><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></Field>
        <Field label={t('password')}><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></Field>
        <button className="btn primary btn-block" disabled={busy} aria-busy={busy}>{busy?t('loading'):t('login')}</button>
      </>:<>
        <h3 className="form-section-title">{t('mfa')}</h3>
        <Field label={t('mfaCode')}><input className="input" maxLength={6} inputMode="numeric" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></Field>
        <button type="button" className="btn primary btn-block" onClick={async()=>{try{await verifyMfa(mfaToken,code||'123456');nav('/app');}catch(e:any){toast(e.message,true);}}}>{t('verifyOtp')}</button>
      </>}
      {demoMode && <div className="demo-note" role="note">
        <AlertTriangle size={16} aria-hidden="true"/>
        <div>
          <strong>{t('demoMode')}</strong>
          <span>{t('demoSampleCredentials')}</span>
          <code><bdi dir="ltr">mona.patient@example.com / Demo!onemed1</bdi></code>
          <code><bdi dir="ltr">karim.doctor@example.com / Demo!onemedD1</bdi></code>
        </div>
      </div>}
      <div className="login-links"><Link to="/register">{t('signup')}</Link><Link to="/privacy">{t('privacyPolicy')}</Link></div>
    </form>
  </div></div>;
}

export function EmergencyPage() {
  const { token = '' } = useParams(); const { t, i18n } = useTranslation(); const {toast}=useToast();
  const [attempt,setAttempt] = useState(0);
  const [data,setData] = useState<any>(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [chat,setChat] = useState<ChatTurn[]>([]);
  const [msg,setMsg] = useState('');
  const [openChat,setOpenChat] = useState(false);

  useEffect(()=>{
    let live=true; setLoading(true); setError('');
    void api.emergencyProfile(token)
      .then(r=>{ if(live){ setData(r); setLoading(false); } })
      .catch((e:any)=>{ if(live){ setError(e.message||t('invalidQrToken')); setLoading(false); } });
    return ()=>{ live=false; };
  },[token,attempt]);

  const send = async (text:string) => {
    if(!text.trim()) return;
    setChat(p=>[...p,{role:'user',text}]); setMsg('');
    try {
      const r = await api.emergencyChat(token, text, i18n.language==='ar'?'ar':'en');
      setChat(p=>[...p,{role:'assistant', text:r.text, sources:r.sources, confidence:r.confidence, disclaimer:r.disclaimer,
        scope:r.scope, mode:r.mode, error:r.error, retryable:r.retryable, followUp:r.followUp}]);
    } catch(e:any) { setChat(p=>[...p,{role:'assistant', text:e.message||t('serviceUnavailable')}]); }
  };
  const lastQuestion = [...chat].reverse().find((c) => c.role === 'user')?.text || '';
  const report = (turn: ChatTurn) => void api.reportIssue({
    kind:'emergency_chat', message:t('issueReasonFirstAid'), source:turn.sources?.join(', ')||'emergency-chat',
  }).then(()=>toast(t('issueLogged'))).catch((e:any)=>toast(e.message,true));

  const v = data?.visible; const s = data?.settings;
  const ready = !loading && !error && !!v;
  const canChat = ready && !!s?.aiChatbotEnabled;

  return <div className="public-shell">
    <div className="public-top">
      <span className="logo" translate="no">OneMed</span>
      <span className="public-top-note">{t('noLogin')}</span>
      <div style={{flex:1}}/>
      <BackButton fallback="/"/>
      <button type="button" className="icon-btn public-lang" aria-label={t('language')}
        onClick={()=>setLang(i18n.language==='en'?'ar':'en')}>
        <Languages size={16}/>
      </button>
    </div>

    <main className="public-wrap emergency-wrap" id="emergency-content">
      {loading && <section className="emergency-state" aria-busy="true" aria-label={t('loadingEmergency')}>
        <Skeleton lines={5}/><p className="state-caption">{t('loadingEmergency')}</p>
      </section>}

      {!loading && error && <section className="emergency-state" role="alert">
        <AlertTriangle size={28} aria-hidden="true"/>
        <h2>{t('emergencyErrorTitle')}</h2>
        <p>{error}</p>
        <p className="state-caption">{t('callEmergency')}</p>
        <button type="button" className="btn primary" onClick={()=>setAttempt(n=>n+1)}>{t('retry')}</button>
      </section>}

      {!loading && !error && !v && <section className="emergency-state">
        <QrCode size={28} aria-hidden="true"/>
        <h2>{t('emergencyEmptyTitle')}</h2>
        <p>{t('invalidQrToken')}</p>
        <button type="button" className="btn outline" onClick={()=>setAttempt(n=>n+1)}>{t('retry')}</button>
      </section>}

      {ready && <>
        <header className="emergency-hero">
          <span className="avatar emergency-avatar" aria-hidden="true">{(v.patientName||'?').slice(0,2).toUpperCase()}</span>
          <div className="emergency-identity">
            <h1>{v.patientName||t('unknown')}</h1>
            <p>{t('emergencyRecord')}</p>
          </div>
          {v.bloodGroup && <div className="blood-badge" aria-label={`${t('bloodGroup')} ${v.bloodGroup}`}>
            <DropletIcon/>
            <span className="blood-label">{t('bloodGroup')}</span>
            <strong><bdi dir="ltr">{v.bloodGroup}</bdi></strong>
          </div>}
          <a className="btn danger emergency-call" href="tel:123" aria-label={t('call123')}>
            <Phone size={16} aria-hidden="true"/> {t('call123')}
          </a>
        </header>

        {v.allergies !== undefined && <section className={`emergency-section ${v.allergies.length?'critical':''}`} aria-labelledby="emergency-allergies">
          <h2 id="emergency-allergies">{t('criticalAllergies')}</h2>
          {v.allergies.length
            ? <div className="emergency-alert"><AlertTriangle size={20} aria-hidden="true"/><strong>{v.allergies.join(', ')}</strong></div>
            : <p className="muted">{t('noKnownAllergies')}</p>}
        </section>}

        {v.chronicConditions !== undefined && <section className="emergency-section" aria-labelledby="emergency-conditions">
          <h2 id="emergency-conditions">{t('chronicConditions')}</h2>
          {v.chronicConditions.length
            ? <ul className="emergency-list">{v.chronicConditions.map((x:string)=><li key={x}>{x}</li>)}</ul>
            : <p className="muted">{t('noneOnFile')}</p>}
        </section>}

        {v.medications !== undefined && <section className="emergency-section" aria-labelledby="emergency-medications">
          <h2 id="emergency-medications">{t('currentMedications')}</h2>
          {v.medications.length
            ? <ul className="emergency-list">{v.medications.map((m:string,i:number)=><li key={i}>{m}</li>)}</ul>
            : <p className="muted">{t('noMedicationsFile')}</p>}
        </section>}

        {v.emergencyContacts !== undefined && <section className="emergency-section" aria-labelledby="emergency-contacts">
          <h2 id="emergency-contacts">{t('emergencyContact')}</h2>
          {v.emergencyContacts.length ? v.emergencyContacts.map((c:any,i:number)=>
            <div className="emergency-row" key={i}>
              <div><strong>{c.name}</strong><span className="muted">{c.relationship}</span></div>
              {c.phone && <a className="btn sm danger" href={`tel:${c.phone}`} aria-label={`${t('call')} ${c.name}`}><Phone size={14}/>{t('call')}</a>}
            </div>) : <p className="muted">{t('noneOnFile')}</p>}
          {v.primaryPhysician && <div className="emergency-row">
            <div><strong>{v.primaryPhysician}</strong><span className="muted">{t('primaryPhysician')}</span></div>
            {v.primaryPhysicianPhone && <a className="btn sm danger" href={`tel:${v.primaryPhysicianPhone}`} aria-label={`${t('call')} ${v.primaryPhysician}`}><Phone size={14}/>{t('call')}</a>}
          </div>}
        </section>}
      </>}
    </main>

    {canChat && <div className="bottom-cta">
      <button type="button" className="btn primary" onClick={()=>setOpenChat(true)}><Bot size={18}/>{t('askAi')}</button>
    </div>}

    {openChat && <Modal className="chat-modal" title={t('askAi')} onClose={()=>setOpenChat(false)} footer={
      <div className="chat-compose">
        <div className="chat-quick">
          {[t('quickCollapse'),t('quickSeizure'),t('quickAllergy')].map(q=>
            <button key={q} type="button" className="btn sm outline" onClick={()=>void send(q)}>{q}</button>)}
        </div>
        <div className="chat-input-row">
          <input className="input" placeholder={t('emergencyPrompt')} value={msg}
            onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void send(msg);}}/>
          <button type="button" className="btn primary" aria-label={t('send')} onClick={()=>void send(msg)}><MirroredIcon><Send size={16}/></MirroredIcon></button>
        </div>
      </div>
    }>
      <div className="chat-chips">
        <span className="chip"><strong>{v?.patientName||'-'}</strong></span>
        {(v?.chronicConditions||[]).map((c:string)=><span key={c} className="chip red">{c}</span>)}
        {v?.bloodGroup && <span className="chip blue"><bdi dir="ltr">{v.bloodGroup}</bdi></span>}
        {(v?.allergies||[]).map((a:string)=><span key={a} className="chip red">{t('allergyLabel')} {a}</span>)}
      </div>
      <div className="alert blue">{t('firstAidDisclaimer')}</div>
      <div className="chat-log">
        {chat.length===0 && <p className="muted chat-hint">{t('emergencyPrompt')}</p>}
        {chat.map((c,i)=><div key={i} className={`msg ${c.role==='user'?'me':''}`}>
          <div style={{whiteSpace:'pre-wrap'}}>{c.text}</div>
          {c.sources?.length?<div className="chat-sources">{c.sources.join(' · ')}</div>:null}
          {c.confidence && <Badge tone={c.confidence==='High'?'green':'amber'}>{t(c.confidence==='Knowledge Gap'?'knowledgeGapShort':String(c.confidence).toLowerCase())}</Badge>}
          {c.error && <div className="alert red" role="alert">{c.error}
            {c.retryable && lastQuestion && <button type="button" className="btn sm outline chat-report" onClick={()=>void send(lastQuestion)}>{t('retry')}</button>}</div>}
          {c.role==='assistant' && c.disclaimer && <div className="chat-sources">{c.disclaimer}</div>}
          {c.role==='assistant' && <button type="button" className="btn sm outline chat-report" onClick={()=>report(c)}>{t('reportIssue')}</button>}
        </div>)}
      </div>
    </Modal>}
  </div>;
}

function DropletIcon(){ return <Droplet size={28} strokeWidth={2.2} aria-hidden="true"/>; }

export function NfcLanding() {
  const { token='' } = useParams(); const { t } = useTranslation(); const nav = useNavigate();
  const [resolved,setResolved] = useState<{patientId:string;emergencyToken?:string}|null>(null); const [error,setError] = useState('');
  useEffect(()=>{ void api.resolveNfc(token).then(setResolved).catch(e=>setError(e.message||t('invalidNfcToken'))); },[token]);
  return <div className="public-shell"><div className="public-top"><span className="logo" translate="no">OneMed</span><span className="public-top-note" translate="no">NFC / QR</span><div style={{flex:1}}/><BackButton fallback="/"/></div>
    <main className="public-wrap" style={{paddingTop:50}}><Card title={t('patientIdCard')} pad><p className="muted">{t('wristbandIntro')}</p>
      {error ? <div className="alert red" role="alert">{error}</div> : <div className="alert green">{resolved?t('patientVerified', {id:resolved.patientId}):t('verifyingWristband')}</div>}
      <button className="btn navy btn-block" style={{marginBottom:10}} onClick={()=>nav('/login')}><Stethoscope size={16}/> {t('patientDashboard')} ({t('login')})</button>
      <button className="btn outline btn-block" disabled={!resolved?.emergencyToken} onClick={()=>nav(`/emergency/${resolved!.emergencyToken}`)}><HeartPulseIcon size={16}/> {t('emergencyInfo')}</button>
      <div className="disclaimer" style={{marginTop:14}}>{t('nfcDisclaimer')}</div>
    </Card></main></div>;
}

export function FulfillmentPage() {
  const { token='' } = useParams(); const { t } = useTranslation(); const {toast} = useToast();
  const [rx,setRx] = useState<Prescription|null>(null); const [pharmacies,setPharmacies] = useState<Pharmacy[]>([]); const [selected,setSelected] = useState<string|null>(null);
  const [loadError,setLoadError] = useState(''); const [loading,setLoading] = useState(true);
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
  return <div className="public-shell"><div className="public-top"><span className="logo" translate="no">OneMed</span><span className="public-top-note">{t('prescriptions')}</span><div style={{flex:1}}/><BackButton fallback="/"/></div>
    <main className="public-wrap" style={{maxWidth:680}}>
      <PageHead title={t('selectPharmacy')} subtitle={rx?`${rx.patientName} - ${rx.medicines.length} ${t('extractedMedicines').toLowerCase()}`:''}/>
      {loading && <Card><Skeleton lines={4}/></Card>}
      {loadError && <div className="alert red" role="alert">{loadError}</div>}
      {rx && <Card title={t('extractedMedicines')}><div className="table-wrap"><table className="tbl"><thead><tr><th>{t('medicine')}</th><th>{t('dosage')}</th><th>{t('frequency')}</th><th>{t('duration')}</th></tr></thead><tbody>{rx.medicines.map((m,i)=><tr key={i}><td>{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td><td>{m.duration}</td></tr>)}</tbody></table></div><div className="disclaimer" style={{marginTop:10}}>{rx.linkExpiresAt && `${t('expires')}: ${new Date(rx.linkExpiresAt).toLocaleString()}`}</div></Card>}
      <Card title={t('nearbyPharmacies')} style={{marginTop:16}}>{pharmacies.length
        ? <div className="grid">{pharmacies.map(p=><div key={p.id} className="card" style={{boxShadow:'none',borderColor:selected===p.id?'var(--teal)':'var(--line)'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong><StoreIcon size={16}/> {p.name}</strong><Badge tone="green">{p.hours}</Badge></div><div className="muted" style={{fontSize:13}}><MapPin size={13}/> {p.address} · {p.rating}</div><button className="btn primary sm" style={{marginTop:8}} onClick={()=>choose(p)}>{selected===p.id?<><CheckCircle2 size={14}/> {t('sendWhatsapp')}</>:<><MessageCircle size={14}/> {t('selectPharmacy')}</>}</button></div>)}</div>
        : !loading && !loadError && <Empty message={t('noRecords')}/>}
      </Card>
    </main></div>;
}
