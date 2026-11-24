import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import * as api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Patient } from '../types';
import { BackButton, Badge, Card, useToast } from '../components/ui';

interface Connection { token:string; doctorId:string; doctorName:string; createdAt:string; expiresAt:string }

/** Patient-facing consent prompt reached by scanning a doctor's 15-minute QR. */
export function ConsentQrPage({ token }: { token:string }) {
  const { t } = useTranslation(); const { session } = useAuth(); const {toast}=useToast();
  const [conn,setConn]=useState<Connection|null>(null); const [patient,setPatient]=useState<Patient|null>(null);
  const [granted,setGranted]=useState(false); const [expired,setExpired]=useState(false);
  useEffect(()=>{
    api.list<Connection>('connectionQrs',c=>c.token===token).then(a=>{
      const c=a[0]; if(!c){setExpired(true);return;}
      setConn(c); setExpired(new Date(c.expiresAt).getTime() < Date.now());
    });
    if(session?.user.role==='patient') api.getPatient(session.user.uid).then(setPatient);
  },[token,session]);
  const grant=async()=>{
    if(!patient||!conn) return toast('Sign in as the patient to grant consent',true);
    await api.mutate(db=>{
      db.consents.push({id:`c_${Date.now()}`,patientId:patient.id,granteeType:'doctor',granteeId:conn.doctorId,
        granteeName:conn.doctorName,scope:'records,prescriptions',purpose:'Connection QR consent',
        active:true,grantedAt:new Date().toISOString(),expiresAt:conn.expiresAt});
      db.audit.push({id:`a_${Date.now()}`,actor:patient.id,actorName:patient.name,action:'consent_granted',
        resource:'consent',patientId:patient.id,timestamp:new Date().toISOString(),ip:'127.0.0.1',hash:'',previousHash:''});
    });
    setGranted(true); toast(t('consentGranted'));
  };
  return <div className="auth-wrap"><div className="auth-card"><div className="head" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><div><h2>{t('consentPrompt')}</h2><p style={{color:'var(--muted)'}}>Connection token: {token}</p></div><BackButton fallback="/"/></div><div style={{padding:24}}>
    {expired && <div className="alert red"><AlertTriangle size={16}/> This connection QR has expired. Ask the doctor to generate a new one.</div>}
    {!expired && conn && <>
      <div className="alert blue"><ShieldCheck size={16}/> <strong>{conn.doctorName}</strong> requests access to your medical records for treatment.</div>
      <p style={{color:'var(--muted)',fontSize:13}}>Scope: lab results, imaging, prescriptions. Grantee: {conn.doctorName}. Access expires with this QR and is audit logged.</p>
      <div className="disclaimer" style={{display:'flex',alignItems:'center',gap:6}}><Clock size={14}/> {conn.expiresAt ? new Date(conn.expiresAt).toLocaleTimeString() : ''} expiry</div>
      {session?.user.role!=='patient' && <div className="alert amber">Sign in as the patient whose record is being requested to grant this consent. <Link to="/login" className="btn sm">Log in</Link></div>}
      {!granted ? <button className="btn primary" style={{width:'100%',marginTop:12}} onClick={()=>void grant()} disabled={session?.user.role!=='patient'}>{t('grantConsent')}</button>
        : <><Badge tone="green">Consent granted</Badge><Link className="btn navy" style={{width:'100%',marginTop:12}} to="/app/patient">{t('continueToDashboard')}</Link></>}
    </>}
    {!conn && !expired && <Card><p>Resolving QR token...</p></Card>}
  </div></div></div>;
}
