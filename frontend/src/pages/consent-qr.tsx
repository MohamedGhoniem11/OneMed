import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import * as api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BackButton, Badge, Card, useToast } from '../components/ui';

interface Connection { doctorName:string; scope:string[]; purpose:string; expiresAt:string; accepted:boolean }

/** Patient-facing consent prompt reached by scanning a doctor's 15-minute QR. */
export function ConsentQrPage({ token }: { token:string }) {
  const { t } = useTranslation(); const { session } = useAuth(); const {toast}=useToast();
  const [conn,setConn]=useState<Connection|null>(null);
  const [granted,setGranted]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{
    void api.resolveConnection(token).then(r=>{
      setConn({ doctorName:r.doctorName||t('defaultClinician'), scope:r.scope||[], purpose:r.purpose||'', expiresAt:r.expiresAt, accepted:Boolean(r.accepted) });
      setGranted(Boolean(r.accepted));
    }).catch(e=>setError(e.message||t('invalidConnectionQr')));
  },[token]);
  const grant=async()=>{
    if(session?.user.role!=='patient') return toast(t('signInAsPatient'),true);
    try { await api.acceptConnection(token); setGranted(true); toast(t('consentGranted')); }
    catch(e:any){ toast(e.message,true); }
  };
  return <div className="auth-wrap"><div className="auth-card"><div className="head" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><div><h2>{t('consentPrompt')}</h2><p style={{color:'var(--muted)'}}>{t('connectionToken')} <span translate="no">{token}</span></p></div><BackButton fallback="/"/></div><div style={{padding:24}}>
    {error && <div className="alert red"><AlertTriangle size={16}/> {error}</div>}
    {conn && <>
      <div className="alert blue"><ShieldCheck size={16}/> <strong translate="no">{conn.doctorName}</strong> {t('consentAccessRequest')}</div>
      <p style={{color:'var(--muted)',fontSize:13}}>{t('scopeLabel')}: {conn.scope.join(', ')||t('records')}. {t('granteeLabel')}: <span translate="no">{conn.doctorName}</span>. {t('consentAccessNote')}</p>
      <div className="disclaimer" style={{display:'flex',alignItems:'center',gap:6}}><Clock size={14}/> {new Date(conn.expiresAt).toLocaleTimeString()} {t('expiryLabel')}</div>
      {session?.user.role!=='patient' && <div className="alert amber">{t('signInAsPatientNotice')} <Link to="/login" className="btn sm">{t('login')}</Link></div>}
      {!granted ? <button className="btn primary" style={{width:'100%',marginTop:12}} onClick={()=>void grant()} disabled={session?.user.role!=='patient'}>{t('grantConsent')}</button>
        : <><Badge tone="green">{t('consentGrantedBadge')}</Badge><Link className="btn navy" style={{width:'100%',marginTop:12}} to="/app/patient">{t('continueToDashboard')}</Link></>}
    </>}
    {!conn && !error && <Card><p>{t('resolvingQr')}</p></Card>}
  </div></div></div>;
}
