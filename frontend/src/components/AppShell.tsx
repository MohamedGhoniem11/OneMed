import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, LogOut, Menu, Languages, HeartPulse, RotateCcw, Search } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { API_MODE } from '../api/client';
import { setLang } from '../i18n';
import { resetDB } from '../data/demo';
import { navByRole, roleHome, roleLabelKey, searchTarget } from './nav';
import { BackButton, Kbd, Modal, useToast } from './ui';
import { CommandPalette } from './CommandPalette';

export function AppShell({children}:{children:React.ReactNode}) {
  const { session, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [menuOpen,setMenuOpen] = useState(false);
  const [paletteOpen,setPaletteOpen] = useState(false);
  const [resetOpen,setResetOpen] = useState(false);
  const [q,setQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); setPaletteOpen(true); return; }
      if(e.key==='/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)){
        e.preventDefault(); searchRef.current?.focus();
      }
      if(e.key==='Escape'){ setPaletteOpen(false); setMenuOpen(false); }
    };
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[]);

  if (!session) return <>{children}</>;
  const role = session.user.role;
  const items = navByRole[role] || [];
  return <div className="app-shell">
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand"><span className="brand-mark">+</span><span className="brand-name">OneMed</span><span className="brand-sub">Healthcare Platform</span></div>
      <div className="nav-label">{t(roleLabelKey(role))}</div>
      <nav>{items.map(i=><NavLink key={i.to} to={i.to} end className={({isActive})=>`nav-item ${isActive?'active':''}`} title={t(i.label)}>
        {i.icon}<span>{t(i.label)}</span></NavLink>)}</nav>
      <div className="nav-spacer"/>
      <button className="nav-item" onClick={()=>navigate('/emergency/em-demo-mona')}><HeartPulse className="ico"/><span>{t('emergencyInfo')}</span></button>
      <button className="nav-item" onClick={async()=>{await logout();navigate('/login');}}><LogOut className="ico"/><span>{t('logout')}</span></button>
    </aside>
    <div className="main-area">
      <header className="topbar">
        <BackButton fallback={roleHome[role]}/>
        <button className="btn sm outline" aria-label={t('menu')} onClick={()=>setMenuOpen(!menuOpen)}><Menu size={16}/></button>
        <div className="search"><Search size={15} className="search-icon"/><input ref={searchRef} className="input" placeholder={t('search')} value={q} onChange={e=>setQ(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter' && q.trim()) navigate(`${searchTarget[role]}?q=${encodeURIComponent(q)}`); }} aria-label={t('search')}/><Kbd>/</Kbd></div>
        <div className="spacer"/>
        <button className="btn sm outline palette-trigger" onClick={()=>setPaletteOpen(true)} title={t('quickNav')}><Search size={14}/><span>{t('quickNav')}</span><Kbd>Ctrl K</Kbd></button>
        {API_MODE==='demo' && <button className="demo-flag" onClick={()=>setResetOpen(true)} title={t('resetDemo')}><RotateCcw size={12}/>{t('demoMode')}</button>}
        <button className="btn sm outline" onClick={()=>setLang(i18n.language==='en'?'ar':'en')} aria-label={t('language')}><Languages size={15}/> {i18n.language==='en'?'العربية':'English'}</button>
        <NavLink to="/app/notifications" className="btn sm outline" aria-label={t('notifications')} style={{position:'relative'}}><Bell size={16}/><span className="bell-dot" aria-hidden="true"/></NavLink>
        <div className="avatar" title={session.user.name}>{session.user.name.slice(0,2).toUpperCase()}</div>
        <div><strong>{session.user.name}</strong><div style={{fontSize:11,color:'var(--muted)'}}>{t(roleLabelKey(role))}</div></div>
      </header>
      <main className="page-content">{children}</main>
    </div>
    {menuOpen && <div className="modal-backdrop" onClick={()=>setMenuOpen(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-head"><h3>{t('quickNav')}</h3><button className="btn sm" onClick={()=>setMenuOpen(false)}>✕</button></div>
      <div className="modal-body">{items.map(i=><NavLink key={i.to} to={i.to} className="nav-item" onClick={()=>setMenuOpen(false)} style={{color:'var(--ink)'}}>{i.icon}<span>{t(i.label)}</span></NavLink>)}</div>
    </div></div>}
    {paletteOpen && <CommandPalette role={role} onClose={()=>setPaletteOpen(false)}/>}
    {resetOpen && <Modal title={t('resetDemo')} onClose={()=>setResetOpen(false)} footer={<>
      <button className="btn outline" onClick={()=>setResetOpen(false)}>{t('cancel')}</button>
      <button className="btn danger" onClick={()=>{resetDB();toast(t('demoReset'));setTimeout(()=>window.location.reload(),250);}}>{t('resetDemo')}</button>
    </>}><p>{t('resetDemoHint')}</p></Modal>}
  </div>;
}
