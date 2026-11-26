import React from 'react';
import {
  LayoutDashboard, Users, FileText, FlaskConical, Pill, MessageSquare, Bell, Settings,
  BarChart3, ShieldCheck, Building2, Store, ClipboardList, Plug, Activity, QrCode,
} from 'lucide-react';
import type { Role } from '../types';

export type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  /** Optional i18n key used to group items in the icon rail. */
  group?: string;
};

/** One source of truth for role navigation, used by the rail and the quick switcher. */
export const navByRole: Record<Role, NavItem[]> = {
  patient: [
    {to:'/app/patient',label:'dashboard',group:'navGroupCare',icon:<LayoutDashboard className="ico"/>},
    {to:'/app/patient/records',label:'records',group:'navGroupCare',icon:<FileText className="ico"/>},
    {to:'/app/patient/analytics',label:'analytics',group:'navGroupCare',icon:<BarChart3 className="ico"/>},
    {to:'/app/patient/prescriptions',label:'prescriptions',group:'navGroupCare',icon:<Pill className="ico"/>},
    {to:'/app/patient/consents',label:'consents',group:'navGroupAccess',icon:<ShieldCheck className="ico"/>},
    {to:'/app/patient/emergency',label:'emergencyQr',group:'navGroupAccess',icon:<QrCode className="ico"/>},
    {to:'/app/patient/messages',label:'messages',group:'navGroupCommunication',icon:<MessageSquare className="ico"/>},
    {to:'/app/patient/notifications',label:'notifications',group:'navGroupCommunication',icon:<Bell className="ico"/>},
    {to:'/app/patient/settings',label:'settings',group:'navGroupSystem',icon:<Settings className="ico"/>},
  ],
  doctor: [
    {to:'/app/doctor',label:'dashboard',group:'navGroupCare',icon:<LayoutDashboard className="ico"/>},
    {to:'/app/doctor/patients',label:'patients',group:'navGroupCare',icon:<Users className="ico"/>},
    {to:'/app/doctor/prescriptions',label:'prescriptions',group:'navGroupCare',icon:<Pill className="ico"/>},
    {to:'/app/doctor/qr',label:'scannerTools',group:'navGroupTools',icon:<QrCode className="ico"/>},
    {to:'/app/doctor/messages',label:'messages',group:'navGroupTools',icon:<MessageSquare className="ico"/>},
    {to:'/app/doctor/reports',label:'reports',group:'navGroupTools',icon:<ClipboardList className="ico"/>},
    {to:'/app/doctor/analytics',label:'analytics',group:'navGroupInsights',icon:<BarChart3 className="ico"/>},
    {to:'/app/doctor/settings',label:'settings',group:'navGroupSystem',icon:<Settings className="ico"/>},
  ],
  lab_staff: [
    {to:'/app/lab',label:'labResults',group:'navGroupCare',icon:<FlaskConical className="ico"/>},
    {to:'/app/lab/history',label:'records',group:'navGroupCare',icon:<FileText className="ico"/>},
  ],
  pharmacy: [
    {to:'/app/pharmacy',label:'inbox',group:'navGroupCare',icon:<ClipboardList className="ico"/>},
    {to:'/app/pharmacy/profile',label:'settings',group:'navGroupSystem',icon:<Store className="ico"/>},
  ],
  hospital_admin: [
    {to:'/app/hospital',label:'overview',group:'navGroupSystem',icon:<Building2 className="ico"/>},
    {to:'/app/hospital/staff',label:'staff',group:'navGroupSystem',icon:<Users className="ico"/>},
    {to:'/app/hospital/connections',label:'connections',group:'navGroupInsights',icon:<Plug className="ico"/>},
    {to:'/app/hospital/analytics',label:'population',group:'navGroupInsights',icon:<BarChart3 className="ico"/>},
  ],
  admin: [
    {to:'/app/admin',label:'overview',group:'navGroupSystem',icon:<LayoutDashboard className="ico"/>},
    {to:'/app/admin/users',label:'staff',group:'navGroupSystem',icon:<Users className="ico"/>},
    {to:'/app/admin/institutions',label:'institutions',group:'navGroupSystem',icon:<Building2 className="ico"/>},
    {to:'/app/admin/pharmacies',label:'pharmacies',group:'navGroupSystem',icon:<Store className="ico"/>},
    {to:'/app/admin/audit',label:'audit',group:'navGroupInsights',icon:<ShieldCheck className="ico"/>},
    {to:'/app/admin/reports',label:'reports',group:'navGroupInsights',icon:<ClipboardList className="ico"/>},
    {to:'/app/admin/population',label:'population',group:'navGroupInsights',icon:<Activity className="ico"/>},
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
  return [...(navByRole[role] || []),
    {to:'/app/notifications',label:'notifications',icon:<Bell className="ico"/>} as NavItem];
}

/** Destinations shown in the compact bottom tab bar (the rest live in "More"). */
export function primaryNavItems(role: Role, count = 4) {
  return (navByRole[role] || []).slice(0, count);
}

export function notificationsPath(role: Role) {
  const item = (navByRole[role] || []).find(i => i.label === 'notifications');
  return item?.to || '/app/notifications';
}

export function settingsPath(role: Role) {
  const item = (navByRole[role] || []).find(i => i.label === 'settings');
  return item?.to || roleHome[role];
}

/**
 * Derive the topbar section title and an explicit parent path for detail pages.
 * A back link is only produced when the current URL has a segment *beyond* a
 * configured destination, so the shell never performs a blind `navigate(-1)`.
 */
export function sectionForPath(role: Role, pathname: string): { titleKey: string; backTo: string | null } {
  let match: NavItem | undefined;
  for (const item of navItemsFor(role)) {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
      if (!match || item.to.length > match.to.length) match = item;
    }
  }
  if (!match) return { titleKey: roleLabelKey(role), backTo: null };
  const remainder = pathname.slice(match.to.length).replace(/^\//, '');
  return { titleKey: match.label, backTo: remainder ? match.to : null };
}

/** Consecutive items sharing a group, ready for `role="group"` rail sections. */
export function groupedNavItems(items: NavItem[]) {
  const groups: { key: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const key = item.group || '';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}
