import React, {
  createContext, isValidElement, cloneElement, useContext, useEffect, useId, useRef, useState,
} from 'react';
import { X, CheckCircle2, AlertCircle, ArrowLeft, Copy, Droplet, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

type Toast = { id:number; message:string; error?:boolean };
const ToastCtx = createContext<{toast:(m:string,error?:boolean)=>void}>({toast:()=>{}});
export function ToastProvider({children}:{children:React.ReactNode}) {
  const [items,setItems] = useState<Toast[]>([]);
  const toast = (message:string, error=false) => {
    const id=Date.now()+Math.random();
    setItems(p=>[...p,{id,message,error}]);
    setTimeout(()=>setItems(p=>p.filter(x=>x.id!==id)),4200);
  };
  return <ToastCtx.Provider value={{toast}}>{children}
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map(t=><div key={t.id} className={`toast ${t.error?'err':''}`}>
        {t.error?<AlertCircle size={16}/>:<CheckCircle2 size={16}/>} {t.message}
      </div>)}
    </div>
  </ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

export function Card({title, action, children, className='', pad=true, style}:{title?:string;action?:React.ReactNode;children:React.ReactNode;className?:string;pad?:boolean;style?:React.CSSProperties}) {
  return <section style={style} className={`card ${className} ${pad?'':'pad0'}`}>{title && <div className="card-head"><h2>{title}</h2>{action}</div>}<div className={pad?'':'card-body'}>{children}</div></section>;
}
export function Badge({children,tone='blue'}:{children:React.ReactNode;tone?:'blue'|'green'|'red'|'amber'|'gray'}) { return <span className={`badge ${tone}`}>{children}</span>; }

type InjectableFieldProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean };
export function Field({label,hint,error,children,id:idProp}:{label:string;hint?:string;error?:string;children:React.ReactNode;id?:string}) {
  const generated = useId();
  const inputId = idProp || `field-${generated}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  let controlled: React.ReactNode = children;
  if (isValidElement(children)) {
    const props = children.props as InjectableFieldProps;
    const injected: InjectableFieldProps = { id: props.id || inputId, 'aria-invalid': !!error || undefined };
    const describedBy = [props['aria-describedby'], error ? errorId : null, hint ? hintId : null].filter(Boolean);
    if (describedBy.length) injected['aria-describedby'] = describedBy.join(' ');
    controlled = cloneElement(children as React.ReactElement<InjectableFieldProps>, injected);
  }
  return <div className="field">
    <label htmlFor={inputId}>{label}</label>
    {controlled}
    {error && <span className="error" id={errorId} role="alert">{error}</span>}
    {hint && <span className="hint" id={hintId}>{hint}</span>}
  </div>;
}
export function Empty({message}:{message?:string}) { const {t}=useTranslation(); return <div className="empty">{message || t('noRecords')}</div>; }

/** Shared focus trap + Escape + focus restore for every dialog-backed surface. */
function useDialogA11y(onClose:()=>void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(()=>{
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || []);
    (focusable()[0] || dialog)?.focus();
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){ e.preventDefault(); closeRef.current(); return; }
      if(e.key!=='Tab' || !dialog) return;
      const els = focusable();
      const first = els[0], last = els[els.length-1];
      if(!dialog.contains(document.activeElement)){ e.preventDefault(); (first || dialog).focus(); return; }
      if(e.shiftKey && (document.activeElement===first || document.activeElement===dialog)){ e.preventDefault(); (last || dialog).focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); (first || dialog).focus(); }
    };
    document.addEventListener('keydown',onKey,true);
    return ()=>{ document.removeEventListener('keydown',onKey,true); previous?.focus(); };
  },[]);
  return ref;
}

export function Modal({title,children,onClose,footer,className=''}:{title:string;children:React.ReactNode;onClose:()=>void;footer?:React.ReactNode;className?:string}) {
  const {t}=useTranslation();
  const titleId = `modal-${useId()}`;
  const ref = useDialogA11y(onClose);
  return <div className="modal-layer">
    <button type="button" className="modal-backdrop" aria-label={t('close')} tabIndex={-1} onClick={onClose}/>
    <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
      <div className="modal-head"><h3 id={titleId}>{title}</h3><button className="btn sm" onClick={onClose} aria-label={t('close')}><X size={16}/></button></div>
      <div className="modal-body">{children}</div>{footer && <div className="modal-foot">{footer}</div>}
    </div>
  </div>;
}

/** Lightweight dialog used for menus and the mobile "More" sheet. */
/** Consistent destructive-action confirmation used by remove buttons. */
export function ConfirmDialog({title,message,onConfirm,onClose,busy=false,confirmLabel,variant='danger'}:{title:string;message:string;onConfirm:()=>void;onClose:()=>void;busy?:boolean;confirmLabel?:string;variant?:'danger'|'primary'}) {
  const {t}=useTranslation();
  return <Modal title={title} onClose={onClose} footer={<>
    <button className="btn outline" onClick={onClose}>{t('cancel')}</button>
    <button className={`btn ${variant}`} disabled={busy} onClick={onConfirm} aria-busy={busy}>{confirmLabel||t('delete')}</button>
  </>}><p>{message}</p></Modal>;
}

export function MenuDialog({label,onClose,children,className=''}:{label:string;onClose:()=>void;children:React.ReactNode;className?:string}) {
  const {t}=useTranslation();
  const labelId = `menu-${useId()}`;
  const ref = useDialogA11y(onClose);
  return <div className={`modal-layer menu-layer ${className}`}>
    <button type="button" className="modal-backdrop" aria-label={t('close')} tabIndex={-1} onClick={onClose}/>
    <div className="menu-dialog" role="dialog" aria-modal="true" aria-labelledby={labelId} ref={ref} tabIndex={-1}>
      <div className="menu-head"><strong id={labelId}>{label}</strong><button className="icon-btn" onClick={onClose} aria-label={t('close')}><X size={16}/></button></div>
      <div className="menu-body">{children}</div>
    </div>
  </div>;
}

/** Back navigation. `to` is an explicit parent path; `onClick` handles in-flow steps. */
export function BackButton({fallback,label,floating=false,to,onClick}:{fallback:string;label?:string;floating?:boolean;to?:string;onClick?:()=>void}) {
  const navigate = useNavigate(); const location = useLocation(); const {t}=useTranslation();
  const cls = `btn sm outline back-btn ${floating?'floating':''}`;
  const content = <><ArrowLeft size={15} aria-hidden="true"/><span>{label || t('back')}</span></>;
  if (onClick) return <button type="button" className={cls} onClick={onClick} title={t('back')}>{content}</button>;
  if (to) return <Link className={cls} to={to} title={t('back')}>{content}</Link>;
  const back = () => {
    // React Router sets location.key to "default" only for the first entry in a session.
    if (location.key && location.key !== 'default') navigate(-1);
    else navigate(fallback);
  };
  return <button type="button" className={cls} onClick={back} title={t('back')}>{content}</button>;
}

/** Copy a value with visible confirmation. Used for IDs, links and tokens. */
export function CopyButton({value,label,compact=false}:{value:string;label?:string;compact?:boolean}) {
  const {toast}=useToast(); const {t}=useTranslation();
  const copy=async()=>{
    try { await navigator.clipboard.writeText(value); toast(t('copied')); }
    catch { toast(t('copyUnavailable'),true); }
  };
  const name = label || t('copy');
  return <button type="button" className={`btn sm outline copy-btn ${compact?'compact':''}`} onClick={()=>void copy()} title={name} aria-label={name}>
    <Copy size={compact?13:14} aria-hidden="true"/>{!compact && <span>{name}</span>}
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

type TabDef = { id:string; label:string };
function TabsBase({tabs,active,onChange,children,className}:{tabs:TabDef[];active:string;onChange:(id:string)=>void;children?:React.ReactNode;className:string}) {
  const base = useId();
  const buttons = useRef<(HTMLButtonElement|null)[]>([]);
  const move = (e:React.KeyboardEvent<HTMLButtonElement>, idx:number) => {
    let next = idx;
    if(e.key==='ArrowRight'||e.key==='ArrowDown') next=(idx+1)%tabs.length;
    else if(e.key==='ArrowLeft'||e.key==='ArrowUp') next=(idx-1+tabs.length)%tabs.length;
    else if(e.key==='Home') next=0;
    else if(e.key==='End') next=tabs.length-1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    buttons.current[next]?.focus();
  };
  return <>
    <div className={className} role="tablist" aria-orientation="horizontal">
      {tabs.map((x,i)=><button key={x.id} type="button" ref={el=>{buttons.current[i]=el;}}
        id={`${base}-tab-${x.id}`} role="tab" aria-selected={active===x.id}
        aria-controls={`${base}-panel-${x.id}`} tabIndex={active===x.id?0:-1}
        className={`tab ${active===x.id?'active':''}`} onClick={()=>onChange(x.id)} onKeyDown={e=>move(e,i)}>{x.label}</button>)}
    </div>
    <div className="tab-panels">
      {tabs.map(x=><div key={x.id} role="tabpanel" id={`${base}-panel-${x.id}`}
        aria-labelledby={`${base}-tab-${x.id}`} hidden={active!==x.id} tabIndex={active===x.id?0:-1}>
        {active===x.id ? children : null}
      </div>)}
    </div>
  </>;
}
export function Tabs({tabs,active,onChange,children}:{tabs:TabDef[];active:string;onChange:(id:string)=>void;children?:React.ReactNode}) {
  return <TabsBase tabs={tabs} active={active} onChange={onChange} className="tabs" children={children}/>;
}
export function SectionTabs({tabs,active,onChange,children}:{tabs:TabDef[];active:string;onChange:(id:string)=>void;children?:React.ReactNode}) {
  return <TabsBase tabs={tabs} active={active} onChange={onChange} className="tabs section-tabs" children={children}/>;
}

export function PageHead({title,subtitle,actions}:{title:string;subtitle?:string;actions?:React.ReactNode}) {
  return <div className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="no-print">{actions}</div></div>;
}
export function Stat({label,value,sub}:{label:string;value:React.ReactNode;sub?:string}) { return <div className="card stat"><span className="value"><bdi dir="ltr">{value}</bdi></span><span className="label">{label}</span>{sub && <span className="hint">{sub}</span>}</div>; }

/** One shared status vocabulary (G10) - tones and localized human labels. */
const STATUS: Record<string,{tone:'green'|'amber'|'red'|'gray'|'blue';labelKey?:string}> = {
  active:{tone:'green',labelKey:'active'}, approved:{tone:'green',labelKey:'approved'}, verified:{tone:'green',labelKey:'verified'},
  completed:{tone:'green',labelKey:'completed'}, ready:{tone:'green',labelKey:'ready'}, confirmed:{tone:'green',labelKey:'confirmed'},
  accessible:{tone:'green',labelKey:'accessible'}, connected:{tone:'green',labelKey:'connected'}, normal:{tone:'green',labelKey:'normal'},
  waiting:{tone:'amber',labelKey:'waiting'}, pending:{tone:'amber',labelKey:'pending'}, pending_verification:{tone:'amber',labelKey:'pendingVerification'},
  needs_review:{tone:'amber',labelKey:'needsReview'}, unverified:{tone:'amber',labelKey:'unverified'}, received:{tone:'amber',labelKey:'received'},
  verifying:{tone:'amber',labelKey:'verifying'}, preparing:{tone:'amber',labelKey:'preparing'}, warning:{tone:'amber',labelKey:'warning'},
  in_progress:{tone:'blue',labelKey:'inProgress'}, handed_over:{tone:'blue',labelKey:'handedOver'}, discharged:{tone:'gray',labelKey:'discharged'},
  critical:{tone:'red',labelKey:'critical'}, high:{tone:'red',labelKey:'high'}, cancelled:{tone:'red',labelKey:'cancelled'},
  suspended:{tone:'red',labelKey:'suspended'}, revoked:{tone:'red',labelKey:'revoked'}, inactive:{tone:'gray',labelKey:'inactive'},
  archived:{tone:'gray',labelKey:'archived'}, stable:{tone:'green',labelKey:'stable'},
  abnormal:{tone:'red',labelKey:'abnormal'}, monitor:{tone:'amber',labelKey:'monitor'},
  unknown:{tone:'gray',labelKey:'unknown'}, low:{tone:'amber',labelKey:'low'},
};
export function StatusBadge({status}:{status:string|null|undefined}) {
  const {t}=useTranslation();
  const s = STATUS[status||''] || {tone:'blue' as const};
  const raw = String(status||'').replace(/_/g,' ');
  return <Badge tone={s.tone}>{s.labelKey ? t(s.labelKey) : (raw || t('unknown'))}</Badge>;
}
export function Chip({children,tone='blue'}:{children:React.ReactNode;tone?:'blue'|'green'|'red'|'amber'|'gray'}) {
  return <span className={`chip ${tone}`}>{children}</span>;
}
/** Identity strip shared by doctor patient viewer and patient header (G3). */
export function IdentityStrip({name,initials,id,meta,blood,allergies,extra}:{name:string;initials?:string;id?:string;meta?:React.ReactNode;blood?:string;allergies?:string[];extra?:React.ReactNode}) {
  const {t}=useTranslation();
  return <div className="identity-strip">
    <span className="avatar identity-avatar">{initials || name.slice(0,2).toUpperCase()}</span>
    <div className="identity-main"><h2>{name}</h2><div className="identity-meta">{meta}{id && <span className="identity-id">{t('idLabel')} {id}</span>}</div></div>
    <div className="identity-flags">{blood && <span className="identity-blood"><Droplet size={14} aria-hidden="true"/><bdi dir="ltr">{blood}</bdi></span>}{allergies?.length ? <span className="identity-allergy"><AlertTriangle size={14} aria-hidden="true"/>{allergies.join(', ')}</span> : null}{extra}</div>
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
  const {t}=useTranslation();
  const unverified = confidence !== undefined && confidence < 80;
  return <tr className={unverified||warn?'verify-row warn':''}>
    <td>{onChange?<input className="input" value={test} readOnly aria-label={test}/>:<strong>{test}</strong>}</td>
    <td>{onChange?<input className="input verify-value" value={value} onChange={e=>onChange(e.target.value)} aria-label={`${test} ${t('value')}`}/>:value}</td>
    <td>{unit||'-'}</td><td>{reference||'-'}</td>
    <td>{confidence!==undefined?<Badge tone={unverified?'amber':'green'}>{confidence}% {unverified?`· ${t('unverified')}`:''}</Badge>:'-'}</td>
  </tr>;
}
