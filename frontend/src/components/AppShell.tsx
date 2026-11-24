import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, FileText, FlaskConical, Pill, MessageSquare, Bell, Settings,
  BarChart3, ShieldCheck, Building2, Store, LogOut, Menu, Languages, QrCode, ScanLine,
  Activity, ClipboardList, CreditCard, Plug, Search, HeartPulse,
} from 'lucide-react';
import type { Role } from '../types';
import { useAuth } from '../auth/AuthContext';
import { API_MODE } from '../api/client';
import { setLang } from '../i18n';

type NavItem = { to:string; label:string; icon:React.ReactNode };
const navByRole: Record<Role, NavItem[]> = {
  patient: [
    {to:'/app/patient',label:'dashboard',icon:<LayoutDashboard className="ico"/>},
    {to:'/app/patient/records',label:'records',icon:<FileText className="ico"/>},
    {to:'/app/patient/analytics',label:'analytics',icon:<BarChart3 className="ico"/>},
    {to:'/app/patient/prescriptions',label:'prescriptions',icon:<Pill className="ico"/>},
    {to:'/app/patient/consents',label:'consents',icon:<ShieldCheck className="ico"/>},
    {to:'/app/patient/emergency',label:'emergencyQr',icon:<QrCode className="ico"/>},
    {to:'/app/patient/messages',label:'messages',icon:<MessageSquare className="ico"/>},
    {to:'/app/patient/notifications',label:'notifications',icon:<Bell className="ico"/>},
    {to:'/app/patient/settings',label:'settings',icon:<Settings className="ico"/>},
  ],
  doctor: [
    {to:'/app/doctor',label:'dashboard',icon:<LayoutDashboard className="ico"/>},
    {to:'/app/doctor/patients',label:'patients',icon:<Users className="ico"/>},
    {to:'/app/doctor/prescriptions',label:'prescriptions',icon:<Pill className="ico"/>},
    {to:'/app/doctor/qr',label:'scannerTools',icon:<QrCode className="ico"/>},
    {to:'/app/doctor/messages',label:'messages',icon:<MessageSquare className="ico"/>},
    {to:'/app/doctor/reports',label:'reports',icon:<ClipboardList className="ico"/>},
    {to:'/app/doctor/settings',label:'settings',icon:<Settings className="ico"/>},
  ],
  lab_staff: [
    {to:'/app/lab',label:'labResults',icon:<FlaskConical className="ico"/>},
    {to:'/app/lab/history',label:'records',icon:<FileText className="ico"/>},
  ],
  pharmacy: [
    {to:'/app/pharmacy',label:'inbox',icon:<ClipboardList className="ico"/>},
    {to:'/app/pharmacy/profile',label:'settings',icon:<Store className="ico"/>},
  ],
  hospital_admin: [
    {to:'/app/hospital',label:'overview',icon:<Building2 className="ico"/>},
    {to:'/app/hospital/staff',label:'staff',icon:<Users className="ico"/>},
    {to:'/app/hospital/connections',label:'connections',icon:<Plug className="ico"/>},
    {to:'/app/hospital/analytics',label:'population',icon:<BarChart3 className="ico"/>},
  ],
  admin: [
    {to:'/app/admin',label:'overview',icon:<LayoutDashboard className="ico"/>},
    {to:'/app/admin/users',label:'staff',icon:<Users className="ico"/>},
    {to:'/app/admin/institutions',label:'institutions',icon:<Building2 className="ico"/>},
    {to:'/app/admin/pharmacies',label:'pharmacies',icon:<Store className="ico"/>},
    {to:'/app/admin/audit',label:'audit',icon:<ShieldCheck className="ico"/>},
    {to:'/app/admin/reports',label:'reports',icon:<ClipboardList className="ico"/>},
    {to:'/app/admin/population',label:'population',icon:<Activity className="ico"/>},
  ],
};

export function AppShell({children}:{children:React.ReactNode}) {
  const { session, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open,setOpen] = useState(false);
  const [q,setQ] = useState('');
  if (!session) return <>{children}</>;
  const items = navByRole[session.user.role] || [];
  const roleLabel = t(session.user.role === 'lab_staff' ? 'labStaff' : session.user.role === 'hospital_admin' ? 'hospitalAdmin' : session.user.role);
  return <div className="app-shell">
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand"><span className="brand-mark">✚</span><span className="brand-name">OneMed</span><span className="brand-sub">Healthcare Platform</span></div>
      <div className="nav-label">{roleLabel}</div>
      <nav>{items.map(i=><NavLink key={i.to} to={i.to} end className={({isActive})=>`nav-item ${isActive?'active':''}`} title={t(i.label)}>
        {i.icon}<span>{t(i.label)}</span></NavLink>)}</nav>
      <div className="nav-spacer"/>
      <button className="nav-item" onClick={()=>navigate('/emergency/em-demo-mona')}><HeartPulse className="ico"/><span>{t('emergencyInfo')}</span></button>
      <button className="nav-item" onClick={async()=>{await logout();navigate('/login');}}><LogOut className="ico"/><span>{t('logout')}</span></button>
    </aside>
    <div className="main-area">
      <header className="topbar">
        <button className="btn sm outline" aria-label="Menu" onClick={()=>setOpen(!open)}><Menu size={16}/></button>
        <div className="search"><input className="input" placeholder={t('search')} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && q.trim()) navigate(`/app/doctor/patients?q=${encodeURIComponent(q)}`); }} aria-label={t('search')}/></div>
        <div className="spacer"/>
        {API_MODE==='demo' && <span className="demo-flag">{t('demoMode')}</span>}
        <button className="btn sm outline" onClick={()=>setLang(i18n.language==='en'?'ar':'en')} aria-label={t('language')}><Languages size={15}/> {i18n.language==='en'?'العربية':'English'}</button>
        <NavLink to={session.user.role==='patient'?'/app/patient/notifications':'/app/doctor/messages'} className="btn sm outline" aria-label={t('notifications')} style={{position:'relative'}}><Bell size={16}/><span className="bell-dot" aria-hidden="true"/></NavLink>
        <div className="avatar" title={session.user.name}>{session.user.name.slice(0,2).toUpperCase()}</div>
        <div><strong>{session.user.name}</strong><div style={{fontSize:11,color:'var(--muted)'}}>{t(session.user.role==='lab_staff'?'labStaff':session.user.role)}</div></div>
      </header>
      <main className="page-content">{children}</main>
    </div>
    {open && <div className="modal-backdrop" onClick={()=>setOpen(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h3>{t('quickStats')}</h3><button className="btn sm" onClick={()=>setOpen(false)}>✕</button></div><div className="modal-body">{items.map(i=><NavLink key={i.to} to={i.to} className="nav-item" onClick={()=>setOpen(false)} style={{color:'var(--ink)'}}>{i.icon}<span>{t(i.label)}</span></NavLink>)}</div></div></div>}
  </div>;
}
