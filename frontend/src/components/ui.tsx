import React, { createContext, useContext, useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, ArrowLeft, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

type Toast = { id:number; message:string; error?:boolean };
const ToastCtx = createContext<{toast:(m:string,error?:boolean)=>void}>({toast:()=>{}});
export function ToastProvider({children}:{children:React.ReactNode}) {
  const [items,setItems] = useState<Toast[]>([]);
  const toast = (message:string, error=false) => { const id=Date.now()+Math.random(); setItems(p=>[...p,{id,message,error}]); setTimeout(()=>setItems(p=>p.filter(x=>x.id!==id)),4200); };
  return <ToastCtx.Provider value={{toast}}>{children}<div className="toast-stack">{items.map(t=><div key={t.id} className={`toast ${t.error?'err':''}`}>{t.error?<AlertCircle size={16}/>:<CheckCircle2 size={16}/>} {t.message}</div>)}</div></ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

export function Card({title, action, children, className='', pad=true, style}:{title?:string;action?:React.ReactNode;children:React.ReactNode;className?:string;pad?:boolean;style?:React.CSSProperties}) {
  return <section style={style} className={`card ${className} ${pad?'':'pad0'}`}>{title && <div className="card-head"><h3>{title}</h3>{action}</div>}<div className={pad?'':'card-body'}>{children}</div></section>;
}
export function Badge({children,tone='blue'}:{children:React.ReactNode;tone?:'blue'|'green'|'red'|'amber'|'gray'}) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Field({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}) { return <div className="field"><label>{label}</label>{children}{hint && <span className="hint">{hint}</span>}</div>; }
export function Empty({message}:{message?:string}) { const {t}=useTranslation(); return <div className="empty">{message || t('noRecords')}</div>; }
export function Modal({title,children,onClose,footer}:{title:string;children:React.ReactNode;onClose:()=>void;footer?:React.ReactNode}) {
  const {t}=useTranslation();
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose(); };
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[onClose]);
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
    <div className="modal-head"><h3>{title}</h3><button className="btn sm" onClick={onClose} aria-label={t('close')}><X size={16}/></button></div>
    <div className="modal-body">{children}</div>{footer && <div className="modal-foot">{footer}</div>}
  </div></div>;
}

/** Back navigation that falls back to a known safe route when there is no in-app history. */
export function BackButton({fallback,label,floating=false}:{fallback:string;label?:string;floating?:boolean}) {
  const navigate = useNavigate(); const location = useLocation(); const {t}=useTranslation();
  const back = () => {
    // React Router sets location.key to "default" only for the first entry in a session.
    if (location.key && location.key !== 'default') navigate(-1);
    else navigate(fallback);
  };
  return <button className={`btn sm outline back-btn ${floating?'floating':''}`} onClick={back} title={t('back')}>
    <ArrowLeft size={15}/><span>{label || t('back')}</span>
  </button>;
}

/** Copy a value with visible confirmation. Used for IDs, links and tokens. */
export function CopyButton({value,label,compact=false}:{value:string;label?:string;compact?:boolean}) {
  const {toast}=useToast(); const {t}=useTranslation();
  const copy=async()=>{
    try { await navigator.clipboard.writeText(value); toast(t('copied')); }
    catch { toast('Copy is unavailable in this browser',true); }
  };
  return <button className={`btn sm outline copy-btn ${compact?'compact':''}`} onClick={()=>void copy()} title={label||t('copy')}>
    <Copy size={compact?13:14}/>{!compact && <span>{label||t('copy')}</span>}
  </button>;
}

/** Static placeholders that match final layout. No infinite shimmer animation. */
export function Skeleton({lines=3,table=false}:{lines?:number;table?:boolean}) {
  return <div className="skeleton" aria-hidden="true">
    {table ? <div className="skeleton-table">{Array.from({length:Math.max(3,lines)},(_,i)=><div className="skeleton-row" key={i}><i/><i/><i/></div>)}</div>
      : Array.from({length:lines},(_,i)=><div className="skeleton-line" key={i} style={{width:`${90-i*14}%`}}/>)}
  </div>;
}
export function SkeletonCards({count=4}:{count?:number}) {
  return <div className="grid cols-4">{Array.from({length:count},(_,i)=><div className="card skeleton-card" key={i}><Skeleton lines={2}/></div>)}</div>;
}

export function Kbd({children}:{children:React.ReactNode}) { return <kbd className="kbd">{children}</kbd>; }
export function Tabs({tabs,active,onChange}:{tabs:{id:string;label:string}[];active:string;onChange:(id:string)=>void}) {
  return <div className="tabs" role="tablist">{tabs.map(x=><button key={x.id} role="tab" aria-selected={active===x.id} className={`tab ${active===x.id?'active':''}`} onClick={()=>onChange(x.id)}>{x.label}</button>)}</div>;
}
export function PageHead({title,subtitle,actions}:{title:string;subtitle?:string;actions?:React.ReactNode}) {
  return <div className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="no-print">{actions}</div></div>;
}
export function Stat({label,value,sub}:{label:string;value:React.ReactNode;sub?:string}) { return <div className="card stat"><span className="value">{value}</span><span className="label">{label}</span>{sub && <span className="hint">{sub}</span>}</div>; }
/** One shared status vocabulary (G10) - tones and human labels. */
const STATUS: Record<string,{tone:'green'|'amber'|'red'|'gray'|'blue';label?:string}> = {
  active:{tone:'green',label:'Active'}, approved:{tone:'green',label:'Approved'}, verified:{tone:'green',label:'Verified'},
  completed:{tone:'green',label:'Completed'}, ready:{tone:'green',label:'Ready'}, confirmed:{tone:'green',label:'Confirmed'},
  accessible:{tone:'green',label:'Accessible'}, connected:{tone:'green',label:'Connected'}, normal:{tone:'green',label:'Normal'},
  waiting:{tone:'amber',label:'Waiting'}, pending:{tone:'amber',label:'Pending'}, pending_verification:{tone:'amber',label:'Pending verification'},
  needs_review:{tone:'amber',label:'Unverified'}, unverified:{tone:'amber',label:'Unverified'}, received:{tone:'amber',label:'Received'},
  verifying:{tone:'amber',label:'Verifying'}, preparing:{tone:'amber',label:'Preparing'}, warning:{tone:'amber',label:'Warning'},
  in_progress:{tone:'blue',label:'In progress'}, handed_over:{tone:'blue',label:'Handed over'}, discharged:{tone:'gray',label:'Discharged'},
  critical:{tone:'red',label:'Critical'}, high:{tone:'red',label:'High'}, cancelled:{tone:'red',label:'Cancelled'},
  suspended:{tone:'red',label:'Suspended'}, revoked:{tone:'red',label:'Revoked'}, inactive:{tone:'gray',label:'Inactive'},
  archived:{tone:'gray',label:'Archived'}, stable:{tone:'green',label:'Stable'},
};
export function StatusBadge({status}:{status:string}) {
  const s = STATUS[status] || {tone:'blue' as const};
  return <Badge tone={s.tone}>{s.label || status.replace(/_/g,' ')}</Badge>;
}
export function Chip({children,tone='blue'}:{children:React.ReactNode;tone?:'blue'|'green'|'red'|'amber'|'gray'}) {
  return <span className={`chip ${tone}`}>{children}</span>;
}
/** Identity strip shared by doctor patient viewer and patient header (G3). */
export function IdentityStrip({name,initials,id,meta,blood,allergies,extra}:{name:string;initials?:string;id?:string;meta?:React.ReactNode;blood?:string;allergies?:string[];extra?:React.ReactNode}) {
  return <div className="identity-strip">
    <span className="avatar identity-avatar">{initials || name.slice(0,2).toUpperCase()}</span>
    <div className="identity-main"><h2>{name}</h2><div className="identity-meta">{meta}{id && <span className="identity-id">ID: {id}</span>}</div></div>
    <div className="identity-flags">{blood && <span className="identity-blood">🩸 {blood}</span>}{allergies?.length ? <span className="identity-allergy">⚠ {allergies.join(', ')}</span> : null}{extra}</div>
  </div>;
}
/** Compact metric card with optional trend and a threshold micro-bar (G4). */
export function MetricCard({label,value,unit,trend,tone='blue',bar,sub,icon}:{label:string;value:React.ReactNode;unit?:string;trend?:string;tone?:'green'|'amber'|'red'|'blue';bar?:number;sub?:string;icon?:React.ReactNode}) {
  return <div className="card metric-card"><div className="metric-top"><span className="label">{label}</span>{icon}</div>
    <div className="metric-value">{value}{unit && <small> {unit}</small>}{trend && <span className={`metric-trend ${tone}`}>{trend}</span>}</div>
    {sub && <div className="metric-sub">{sub}</div>}
    {bar!==undefined && <div className="metric-bar"><i style={{width:`${Math.min(100,Math.max(0,bar))}%`}} className={tone}/></div>}
  </div>;
}
/** Lab/OCR verification row with confidence and explicit unverified state (G6). */
export function VerificationRow({test,value,unit,reference,confidence,onChange,warn}:{test:string;value:string;unit?:string;reference?:string;confidence?:number;onChange?:(v:string)=>void;warn?:boolean}) {
  const unverified = confidence !== undefined && confidence < 80;
  return <tr className={unverified||warn?'verify-row warn':''}>
    <td>{onChange?<input className="input" value={test} readOnly aria-label={test}/>:<strong>{test}</strong>}</td>
    <td>{onChange?<input className="input verify-value" value={value} onChange={e=>onChange(e.target.value)} aria-label={`${test} value`}/>:value}</td>
    <td>{unit||'-'}</td><td>{reference||'-'}</td>
    <td>{confidence!==undefined?<Badge tone={unverified?'amber':'green'}>{confidence}% {unverified?'· Unverified':''}</Badge>:'-'}</td>
  </tr>;
}
export function SectionTabs({tabs,active,onChange}:{tabs:{id:string;label:string}[];active:string;onChange:(id:string)=>void}) {
  return <div className="tabs section-tabs" role="tablist">{tabs.map(x=><button key={x.id} role="tab" aria-selected={active===x.id} className={`tab ${active===x.id?'active':''}`} onClick={()=>onChange(x.id)}>{x.label}</button>)}</div>;
}
