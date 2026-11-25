import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, CornerDownLeft } from 'lucide-react';
import type { Role } from '../types';
import { navItemsFor } from './nav';
import { Kbd, Modal } from './ui';
import { useSearchParam } from '../hooks/useSearchParam';

/** Ctrl/Cmd+K quick switcher: reach any screen for the current role in two keystrokes. */
export function CommandPalette({role,onClose}:{role:Role;onClose:()=>void}) {
  const [query,setQuery] = useSearchParam('q');
  const input=useRef<HTMLInputElement>(null);
  const {t}=useTranslation(); const navigate=useNavigate();
  useEffect(()=>{ input.current?.focus(); },[]);
  const results=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return navItemsFor(role).filter(i=>!q || t(i.label).toLowerCase().includes(q) || i.to.toLowerCase().includes(q));
  },[query,role,t]);
  const close=()=>{ setQuery('',{replace:true}); onClose(); };
  const go=(to:string)=>{ navigate(to); onClose(); };
  return <Modal title={t('quickNav')} onClose={close} footer={<span className="disclaimer"><Kbd>↑</Kbd> <Kbd>↓</Kbd> {t('navigate')} <Kbd>Enter</Kbd> {t('open')} <Kbd>Esc</Kbd> {t('close')}</span>}>
    <div className="palette-search"><Search size={17} aria-hidden="true"/><input ref={input} className="input" value={query}
      onChange={e=>setQuery(e.target.value,{replace:true})}
      placeholder={t('searchScreens')} aria-label={t('searchScreens')}
      onKeyDown={e=>{
        if(e.key==='Enter' && results[0]) go(results[0].to);
        if(e.key==='ArrowDown'||e.key==='ArrowUp'){
          e.preventDefault();
          const els=Array.from(document.querySelectorAll<HTMLElement>('.palette-item'));
          const idx=els.indexOf(document.activeElement as HTMLElement);
          const next=e.key==='ArrowDown'?Math.min(els.length-1,idx+1):Math.max(0,idx-1);
          els[next]?.focus();
        }
      }}/></div>
    <div className="palette-list" role="listbox" aria-label={t('searchResults')}>{results.map((item,i)=><button key={item.to} type="button" className="palette-item" onClick={()=>go(item.to)}>
      {item.icon}<span>{t(item.label)}</span><small>{item.to}</small>{i===0 && <CornerDownLeft size={13} aria-hidden="true"/>}
    </button>)}{!results.length && <div className="empty">{t('noSearchResults')}</div>}</div>
  </Modal>;
}
