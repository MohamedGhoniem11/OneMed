import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Session, Role } from '../types';
import * as api from '../api/client';

interface AuthCtx {
  session: Session | null;
  login: (email:string, password:string) => Promise<void>;
  register: (data:{name:string;email:string;password:string;role:Role;phone:string;emergencyContact:any}) => Promise<{challengeId:string;devCode?:string}>;
  verifyOtp: (challengeId:string, code:string) => Promise<void>;
  verifyMfa: (token:string, code:string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u:any) => void;
}
const Ctx = createContext<AuthCtx | null>(null);
export function AuthProvider({children}:{children:React.ReactNode}) {
  const [session, setSession] = useState<Session|null>(() => api.getSession());
  useEffect(() => { const t=setInterval(()=>{ const s=api.getSession(); if(!s && session) setSession(null); }, 30000); return ()=>clearInterval(t); }, [session]);
  const login = useCallback(async (e:string,p:string)=>{ setSession(await api.login(e,p)); }, []);
  const register = useCallback(async (d:any)=>api.register(d), []);
  const verifyOtp = useCallback(async (c:string,code:string)=>{ setSession(await api.verifyOtp(c,code)); }, []);
  const verifyMfa = useCallback(async (t:string,code:string)=>{ setSession(await api.verifyMfa(t,code)); }, []);
  const logout = useCallback(async ()=>{ await api.logout(); setSession(null); }, []);
  const setUser = useCallback((u:any)=>{ setSession(s => { if(!s) return s; const next={...s,user:u}; api.saveSession(next); return next; }); }, []);
  return <Ctx.Provider value={{session,login,register,verifyOtp,verifyMfa,logout,setUser}}>{children}</Ctx.Provider>;
}
export function useAuth() { const c = useContext(Ctx); if(!c) throw new Error('useAuth outside provider'); return c; }
