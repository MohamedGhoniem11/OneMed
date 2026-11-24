import React from 'react';
import {
  LayoutDashboard, Users, FileText, FlaskConical, Pill, MessageSquare, Bell, Settings,
  BarChart3, ShieldCheck, Building2, Store, ClipboardList, Plug, Activity, QrCode, ScanLine,
} from 'lucide-react';
import type { Role } from '../types';

export type NavItem = { to:string; label:string; icon:React.ReactNode };

/** One source of truth for role navigation, used by the rail and the quick switcher. */
export const navByRole: Record<Role, NavItem[]> = {
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

export const roleHome: Record<Role,string> = {
  patient:'/app/patient', doctor:'/app/doctor', lab_staff:'/app/lab',
  pharmacy:'/app/pharmacy', hospital_admin:'/app/hospital', admin:'/app/admin',
};

export const searchTarget: Record<Role,string> = {
  patient:'/app/patient/records', doctor:'/app/doctor/patients', lab_staff:'/app/lab/history',
  pharmacy:'/app/pharmacy', hospital_admin:'/app/hospital/staff', admin:'/app/admin/users',
};

export function roleLabelKey(role: Role) {
  return role === 'lab_staff' ? 'labStaff' : role === 'hospital_admin' ? 'hospitalAdmin' : role;
}

export function navItemsFor(role: Role) {
  return [...(navByRole[role] || []), {to:'/app/notifications',label:'notifications',icon:<Bell className="ico"/>} as NavItem];
}
