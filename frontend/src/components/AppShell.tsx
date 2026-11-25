import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell, ChevronDown, HeartPulse, Languages, LogOut, MoreHorizontal, RotateCcw, Search,
  Settings, X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { API_MODE, listNotifications, myEmergencyLink } from '../api/client';
import { setLang } from '../i18n';
import { resetDB } from '../data/demo';
import {
  groupedNavItems, navByRole, navItemsFor, notificationsPath, primaryNavItems, roleHome,
  roleLabelKey, searchTarget, sectionForPath, settingsPath,
} from './nav';
import { BackButton, Kbd, MenuDialog, Modal, useToast } from './ui';
import { CommandPalette } from './CommandPalette';
import { useSearchParam } from '../hooks/useSearchParam';
import type { Role } from '../types';

type Suggestion = { to: string; label: string; icon: React.ReactNode };

export function AppShell({children}:{children:React.ReactNode}) {
  const { session, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [moreOpen,setMoreOpen] = useState(false);
  const [accountOpen,setAccountOpen] = useState(false);
  const [paletteOpen,setPaletteOpen] = useState(false);
  const [resetOpen,setResetOpen] = useState(false);
  const [searchOpen,setSearchOpen] = useState(false);
  const [q,setQ] = useSearchParam('q');
  const [emergencyLink,setEmergencyLink] = useState<string | null>(null);
  const [unread,setUnread] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const roleKey = session?.user.role;

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); setPaletteOpen(true); return; }
      if(e.key==='/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)
        && !(e.target instanceof HTMLSelectElement) && !(e.target instanceof HTMLElement && e.target.isContentEditable)){
        e.preventDefault(); searchRef.current?.focus();
      }
      if(e.key==='Escape'){ setPaletteOpen(false); setSearchOpen(false); setMoreOpen(false); setAccountOpen(false); }
    };
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[]);

  // The emergency destination is resolved from data, never hardcoded.
  useEffect(()=>{
    if(!roleKey) return;
    let alive = true;
    void (async()=>{
      try { const link = await myEmergencyLink(); if(alive) setEmergencyLink(link); }
      catch { if(alive) setEmergencyLink(null); }
    })();
    return ()=>{ alive = false; };
  },[roleKey]);

  // Real unread count; refreshed whenever the route changes (e.g. after "mark all read").
  useEffect(()=>{
    if(!roleKey) return;
    let alive = true;
    void listNotifications()
      .then(list=>{ if(alive) setUnread(list.filter((n:{read?:boolean})=>!n.read).length); })
      .catch(()=>{ if(alive) setUnread(0); });
    return ()=>{ alive = false; };
  },[roleKey,location.pathname]);

  useEffect(()=>{
    if(!searchOpen) return;
    const onDown=(e:PointerEvent)=>{
      if(searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown',onDown);
    return ()=>document.removeEventListener('pointerdown',onDown);
  },[searchOpen]);

  if (!session) return <>{children}</>;
  const role: Role = session.user.role;
  const items = navByRole[role] || [];
  const allNav = navItemsFor(role);
  const groups = groupedNavItems(items);
  const { titleKey, backTo } = sectionForPath(role, location.pathname);
  const emergencyHref = emergencyLink || (role === 'patient' ? '/app/patient/emergency' : null);
  const initials = session.user.name.slice(0,2).toUpperCase();
  const bellLabel = `${t('notifications')}${unread ? ` · ${unread} ${t('unread')}` : ''}`;

  const needle = q.trim().toLowerCase();
  const suggestions: Suggestion[] = [
    ...allNav.filter(i=>!needle || t(i.label).toLowerCase().includes(needle) || i.to.toLowerCase().includes(needle)).slice(0,8),
    ...(needle ? [{ to:`${searchTarget[role]}?q=${encodeURIComponent(q.trim())}`, label:'searchInRecords', icon:<Search className="ico" aria-hidden="true"/> }] : []),
  ];

  const toggleLang = () => setLang(i18n.language === 'en' ? 'ar' : 'en');
  const doLogout = async () => { await logout(); navigate('/login'); };
  const clearSearch = () => { setQ('',{replace:true}); setSearchOpen(false); searchRef.current?.focus(); };
  const goTo = (to:string) => { setSearchOpen(false); navigate(to); };
  const navClass = (to:string, base='nav-link') => ({isActive}:{isActive:boolean}) =>
    `${base} ${isActive || (to !== roleHome[role] && location.pathname.startsWith(`${to}/`)) ? 'active' : ''}`;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">{t('skipToContent')}</a>

    <aside className="rail" aria-label={t('primaryNavigation')}>
      <NavLink to={roleHome[role]} className="rail-brand" aria-label={t('appName')} title={t('appName')}>
        <span className="brand-mark" aria-hidden="true">+</span>
      </NavLink>
      <nav className="rail-nav">
        {groups.map((group,idx)=><div className="rail-group" key={`${group.key}-${idx}`}
          role="group" aria-label={group.key ? t(group.key) : undefined}>
          {idx > 0 && <span className="rail-divider" aria-hidden="true"/>}
          {group.items.map(i=><NavLink key={i.to} to={i.to} end className={navClass(i.to,'rail-link')}
            aria-label={t(i.label)} title={t(i.label)}>
            <span className="rail-tip" aria-hidden="true">{t(i.label)}</span>
            {i.icon}
          </NavLink>)}
        </div>)}
      </nav>
      <div className="rail-foot">
        <button type="button" className="rail-link" onClick={toggleLang} aria-label={t('language')}
          title={`${t('language')} · ${i18n.language==='en'?t('arabic'):t('english')}`}>
          <span className="rail-tip" aria-hidden="true">{t('language')}</span>
          <Languages className="ico" aria-hidden="true"/>
        </button>
        <button type="button" className="rail-link" onClick={()=>void doLogout()} aria-label={t('logout')} title={t('logout')}>
          <span className="rail-tip" aria-hidden="true">{t('logout')}</span>
          <LogOut className="ico" aria-hidden="true"/>
        </button>
      </div>
    </aside>

    <div className="main-area">
      <header className="topbar">
        {backTo && <BackButton to={backTo} fallback={roleHome[role]}/>}
        <span className="topbar-title" aria-current="page">{t(titleKey)}</span>

        <div className="searchbox" ref={searchBoxRef} role="search">
          <Search size={16} className="search-icon" aria-hidden="true"/>
          <input ref={searchRef} className="input" type="text" placeholder={t('searchScreens')}
            role="combobox" value={q} aria-label={t('search')} aria-expanded={searchOpen} aria-controls="shell-search-results"
            onFocus={()=>setSearchOpen(true)}
            onChange={e=>{ setQ(e.target.value,{replace:true}); setSearchOpen(true); }}
            onKeyDown={e=>{
              if(e.key==='Enter'){ e.preventDefault(); if(suggestions[0]) goTo(suggestions[0].to); }
              if(e.key==='Escape'){ setSearchOpen(false); e.currentTarget.blur(); }
            }}/>
          {q ? <button type="button" className="icon-btn search-clear" aria-label={t('clearSearch')} onClick={clearSearch}>
            <X size={14} aria-hidden="true"/>
          </button> : <Kbd>/</Kbd>}
          {searchOpen && <div className="search-results" id="shell-search-results" role="listbox" aria-label={t('searchResults')}>
            {suggestions.length ? suggestions.map((s,idx)=><button key={`${s.to}-${idx}`} type="button"
              className="search-result" onClick={()=>goTo(s.to)}>
              {s.icon}<span>{t(s.label)}</span><small>{s.to}</small>
            </button>) : <div className="empty">{t('noSearchResults')}</div>}
          </div>}
        </div>

        <div className="topbar-actions">
          {emergencyHref && <NavLink to={emergencyHref} className="btn emergency-btn" aria-label={t('emergencyInfo')}>
            <HeartPulse size={17} aria-hidden="true"/><span className="emergency-label">{t('emergencyInfo')}</span>
          </NavLink>}
          <button type="button" className="icon-btn lang-btn" onClick={toggleLang}
            aria-label={`${t('language')} · ${i18n.language==='en'?t('arabic'):t('english')}`}
            title={`${t('language')} · ${i18n.language==='en'?t('arabic'):t('english')}`}>
            <Languages size={17} aria-hidden="true"/>
            <span className="lang-code" aria-hidden="true">{i18n.language==='en'?'ع':'EN'}</span>
          </button>
          {API_MODE==='demo' && <button type="button" className="demo-flag" onClick={()=>setResetOpen(true)} title={t('resetDemo')}>
            <RotateCcw size={13} aria-hidden="true"/><span className="demo-label">{t('demoMode')}</span>
          </button>}
          <NavLink to={notificationsPath(role)} className="icon-btn bell-btn" aria-label={`${bellLabel} · ${unread>9?'9+':unread} · ${unread}`} title={bellLabel}>
            <Bell size={17} aria-hidden="true"/>
            {unread > 0 && <span className="notif-count" aria-hidden="true">{unread>9?'9+':unread}</span>}
          </NavLink>
          <button type="button" className="avatar-btn" aria-haspopup="dialog" aria-expanded={accountOpen}
            aria-label={`${session.user.name} · ${t('accountMenu')}`} onClick={()=>setAccountOpen(true)}>
            <span className="avatar" aria-hidden="true">{initials}</span>
            <span className="account-name">{session.user.name}</span>
            <ChevronDown size={14} aria-hidden="true"/>
          </button>
        </div>
      </header>

      <main className="page-content" id="main-content" tabIndex={-1}>{children}</main>
    </div>

    <nav className="tabbar" aria-label={t('primaryNavigation')}>
      {primaryNavItems(role).map(i=><NavLink key={i.to} to={i.to} end className={navClass(i.to,'tabbar-link')}>
        {i.icon}<span>{t(i.label)}</span>
      </NavLink>)}
      <button type="button" className="tabbar-link" aria-haspopup="dialog" aria-label={t('more')}
        onClick={()=>setMoreOpen(true)}>
        <MoreHorizontal className="ico" aria-hidden="true"/><span>{t('more')}</span>
      </button>
    </nav>

    {moreOpen && <MenuDialog label={t('more')} className="sheet-dialog" onClose={()=>setMoreOpen(false)}>
      <nav className="sheet-nav" aria-label={t('primaryNavigation')}>
        {allNav.map(i=><NavLink key={i.to} to={i.to} className="menu-link" onClick={()=>setMoreOpen(false)}>
          {i.icon}<span>{t(i.label)}</span><small>{i.to}</small>
        </NavLink>)}
      </nav>
      <div className="sheet-foot">
        <button type="button" className="menu-link" onClick={toggleLang}><Languages size={16} aria-hidden="true"/>
          <span>{t('language')}</span><span className="menu-value">{i18n.language==='en'?t('arabic'):t('english')}</span>
        </button>
        <button type="button" className="menu-link danger" onClick={()=>{setMoreOpen(false);void doLogout();}}>
          <LogOut size={16} aria-hidden="true"/><span>{t('logout')}</span>
        </button>
      </div>
    </MenuDialog>}

    {accountOpen && <MenuDialog label={session.user.name} className="account-dialog" onClose={()=>setAccountOpen(false)}>
      <div className="account-summary">
        <span className="avatar" aria-hidden="true">{initials}</span>
        <div><strong>{session.user.name}</strong><small>{t(roleLabelKey(role))}</small></div>
      </div>
      <NavLink to={settingsPath(role)} className="menu-link" onClick={()=>setAccountOpen(false)}>
        <Settings size={16} aria-hidden="true"/><span>{t('settings')}</span>
      </NavLink>
      <button type="button" className="menu-link" onClick={toggleLang}><Languages size={16} aria-hidden="true"/>
        <span>{t('language')}</span><span className="menu-value">{i18n.language==='en'?t('arabic'):t('english')}</span>
      </button>
      <button type="button" className="menu-link danger" onClick={()=>{setAccountOpen(false);void doLogout();}}>
        <LogOut size={16} aria-hidden="true"/><span>{t('logout')}</span>
      </button>
    </MenuDialog>}

    {paletteOpen && <CommandPalette role={role} onClose={()=>setPaletteOpen(false)}/>}
    {resetOpen && <Modal title={t('resetDemo')} onClose={()=>setResetOpen(false)} footer={<>
      <button type="button" className="btn outline" onClick={()=>setResetOpen(false)}>{t('cancel')}</button>
      <button type="button" className="btn danger" onClick={()=>{resetDB();toast(t('demoReset'));setTimeout(()=>window.location.reload(),250);}}>{t('resetDemo')}</button>
    </>}><p>{t('resetDemoHint')}</p></Modal>}
  </div>;
}
