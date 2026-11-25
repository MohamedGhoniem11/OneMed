import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, FileText, HeartPulse, Pill, QrCode, ShieldCheck, Stethoscope, Store } from 'lucide-react';
import * as api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Card, PageHead } from '../components/ui';

type Demo = { titleKey: string; descKey: string; to: string; icon: React.ReactNode };

/** One hub for the documented demos. Public links work without signing in. */
const DEMO_TOKENS = { emergency: 'em-demo-mona', nfc: 'NTAG424-0A1B', fulfillment: 'rx-demo-8f3a' };
const PUBLIC_BASE: Demo[] = [
  { titleKey: 'demoLandingTitle', descKey: 'demoLandingDesc', to: '/', icon: <HeartPulse size={18}/> },
  { titleKey: 'demoRegistrationTitle', descKey: 'demoRegistrationDesc', to: '/register', icon: <ShieldCheck size={18}/> },
];

const ROLE_DEMOS: { roleKey: string; items: Demo[] }[] = [
  { roleKey: 'patient', items: [
    { titleKey: 'demoClinicalTimelineTitle', descKey: 'demoClinicalTimelineDesc', to: '/app/patient/records', icon: <FileText size={18}/> },
    { titleKey: 'demoAnalyticsTitle', descKey: 'demoAnalyticsDesc', to: '/app/patient/analytics', icon: <Activity size={18}/> },
    { titleKey: 'demoConsentManagerTitle', descKey: 'demoConsentManagerDesc', to: '/app/patient/consents', icon: <ShieldCheck size={18}/> },
    { titleKey: 'demoEmergencySettingsTitle', descKey: 'demoEmergencySettingsDesc', to: '/app/patient/emergency', icon: <QrCode size={18}/> },
  ]},
  { roleKey: 'doctor', items: [
    { titleKey: 'demoPatientViewerTitle', descKey: 'demoPatientViewerDesc', to: '/app/doctor/patients/user_patient_1', icon: <Stethoscope size={18}/> },
    { titleKey: 'demoExtractionTitle', descKey: 'demoExtractionDesc', to: '/app/doctor/prescriptions', icon: <Pill size={18}/> },
    { titleKey: 'demoQrToolsTitle', descKey: 'demoQrToolsDesc', to: '/app/doctor/qr', icon: <QrCode size={18}/> },
    { titleKey: 'demoReportsTitle', descKey: 'demoReportsDesc', to: '/app/doctor/reports', icon: <FileText size={18}/> },
  ]},
  { roleKey: 'labStaff', items: [
    { titleKey: 'demoLabIngestionTitle', descKey: 'demoLabIngestionDesc', to: '/app/lab', icon: <FileText size={18}/> },
  ]},
  { roleKey: 'pharmacy', items: [
    { titleKey: 'demoOrderInboxTitle', descKey: 'demoOrderInboxDesc', to: '/app/pharmacy', icon: <Store size={18}/> },
    { titleKey: 'demoPharmacyProfileTitle', descKey: 'demoPharmacyProfileDesc', to: '/app/pharmacy/profile', icon: <Store size={18}/> },
  ]},
  { roleKey: 'hospitalSystemAdmin', items: [
    { titleKey: 'demoPopulationTitle', descKey: 'demoPopulationDesc', to: '/app/hospital/analytics', icon: <Activity size={18}/> },
    { titleKey: 'demoAuditTitle', descKey: 'demoAuditDesc', to: '/app/admin/audit', icon: <ShieldCheck size={18}/> },
    { titleKey: 'demoInstitutionsTitle', descKey: 'demoInstitutionsDesc', to: '/app/admin/institutions', icon: <Store size={18}/> },
  ]},
];

function DemoCard({ demo }: { demo: Demo }) {
  const { t } = useTranslation();
  return <Link to={demo.to} className="card" style={{ textDecoration: 'none', display: 'block', boxShadow: 'none' }}>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{demo.icon}<strong>{t(demo.titleKey)}</strong></div>
    <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>{t(demo.descKey)}</p>
    <span className="btn sm outline" style={{ marginTop: 8 }}>{t('openDemo')}</span>
  </Link>;
}

export function DemoHub() {
  const { t } = useTranslation(); const { session } = useAuth();
  const [links,setLinks] = useState({ emergency:'', nfc:'', fulfillment:'' });
  useEffect(()=>{
    if (api.API_MODE !== 'api' || session?.user.role !== 'patient') return;
    void Promise.all([
      api.myEmergencyLink().catch(()=>null),
      api.issueMyNfc().catch(()=>null),
      api.list<any>('prescriptions',p=>p.patientId===session.user.uid).catch(()=>[]),
    ]).then(([emergency,nfc,prescriptions])=>setLinks({
      emergency: emergency || '',
      nfc: nfc?.token ? `/nfc/${nfc.token}` : '',
      fulfillment: prescriptions.find(p=>p.linkToken)?.linkToken ? `/f/${prescriptions.find(p=>p.linkToken).linkToken}` : '',
    }));
  },[session?.user.uid]);
  const publicDemos = [
    ...PUBLIC_BASE,
    ...(api.API_MODE === 'demo' ? [
      { titleKey:'demoEmergencyTitle', descKey:'demoEmergencyDesc', to:`/emergency/${DEMO_TOKENS.emergency}`, icon:<HeartPulse size={18}/> },
      { titleKey:'demoNfcTitle', descKey:'demoNfcDesc', to:`/nfc/${DEMO_TOKENS.nfc}`, icon:<QrCode size={18}/> },
      { titleKey:'demoPharmacyTitle', descKey:'demoPharmacyDesc', to:`/f/${DEMO_TOKENS.fulfillment}`, icon:<Pill size={18}/> },
    ] : [
      ...(links.emergency ? [{ titleKey:'demoEmergencyTitle', descKey:'demoEmergencyDesc', to:links.emergency, icon:<HeartPulse size={18}/> }] : []),
      ...(links.nfc ? [{ titleKey:'demoNfcTitle', descKey:'demoNfcDesc', to:links.nfc, icon:<QrCode size={18}/> }] : []),
      ...(links.fulfillment ? [{ titleKey:'demoPharmacyTitle', descKey:'demoPharmacyDesc', to:links.fulfillment, icon:<Pill size={18}/> }] : []),
    ]),
  ];
  return <>
    <PageHead title={t('demos')} subtitle={t('demoHubSubtitle')}/>
    <Card title={t('publicDemos')}><div className="grid cols-3">{publicDemos.map(d => <DemoCard key={d.titleKey} demo={d}/>)}</div></Card>
    {ROLE_DEMOS.map(group => <Card key={group.roleKey} title={t('rolePortal', { role: t(group.roleKey) })} style={{ marginTop: 16 }}>
      <div className="grid cols-3">{group.items.map(d => <DemoCard key={d.titleKey} demo={d}/>)}</div>
    </Card>)}
    <p className="disclaimer" style={{ marginTop: 16 }}>{t('demoModeNote')}</p>
  </>;
}
