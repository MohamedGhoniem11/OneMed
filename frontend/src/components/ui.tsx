import React, { createContext, useContext, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} role="dialog" aria-label={title}>
    <div className="modal-head"><h3>{title}</h3><button className="btn sm" onClick={onClose} aria-label={t('close')}><X size={16}/></button></div>
    <div className="modal-body">{children}</div>{footer && <div className="modal-foot">{footer}</div>}
  </div></div>;
}
export function Tabs({tabs,active,onChange}:{tabs:{id:string;label:string}[];active:string;onChange:(id:string)=>void}) {
  return <div className="tabs" role="tablist">{tabs.map(x=><button key={x.id} role="tab" aria-selected={active===x.id} className={`tab ${active===x.id?'active':''}`} onClick={()=>onChange(x.id)}>{x.label}</button>)}</div>;
}
export function PageHead({title,subtitle,actions}:{title:string;subtitle?:string;actions?:React.ReactNode}) {
  return <div className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="no-print">{actions}</div></div>;
}
export function Stat({label,value,sub}:{label:string;value:React.ReactNode;sub?:string}) { return <div className="card stat"><span className="value">{value}</span><span className="label">{label}</span>{sub && <span className="hint">{sub}</span>}</div>; }
export function StatusBadge({status}:{status:string}) {
  const map:Record<string,'green'|'amber'|'red'|'gray'|'blue'> = {active:'green',approved:'green',verified:'green',completed:'green',ready:'green',confirmed:'green',accessible:'green',pending:'amber',pending_verification:'amber',needs_review:'amber',received:'amber',verifying:'amber',preparing:'amber',handed_over:'blue',cancelled:'red',suspended:'red',inactive:'gray',archived:'gray',revoked:'red'};
  return <Badge tone={map[status]||'blue'}>{status.replace(/_/g,' ')}</Badge>;
}
