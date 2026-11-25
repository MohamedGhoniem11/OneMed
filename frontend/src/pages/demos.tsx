import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, FileText, HeartPulse, Pill, QrCode, ShieldCheck, Stethoscope, Store } from 'lucide-react';
import { Card, PageHead } from '../components/ui';

type Demo = { title: string; description: string; to: string; icon: React.ReactNode };

/** One hub for the documented demos. Public links work without signing in. */
const PUBLIC: Demo[] = [
  { title: 'Landing page', description: 'Bilingual public landing with role entry points.', to: '/', icon: <HeartPulse size={18}/> },
  { title: 'Registration + OTP', description: 'Four-step wizard with a required emergency contact.', to: '/register', icon: <ShieldCheck size={18}/> },
  { title: 'Emergency public page', description: 'Patient-approved critical data and first-aid chatbot (use your own QR token in API mode).', to: '/emergency/demo', icon: <HeartPulse size={18}/> },
  { title: 'NFC landing', description: 'Wristband landing with dashboard and emergency actions (use your own NFC token in API mode).', to: '/nfc/demo', icon: <QrCode size={18}/> },
  { title: 'Pharmacy fulfillment', description: 'Signed 24-hour link, GPS-sorted pharmacies and WhatsApp order.', to: '/f/demo', icon: <Pill size={18}/> },
];

const ROLE_DEMOS: { role: string; items: Demo[] }[] = [
  { role: 'Patient', items: [
    { title: 'Clinical timeline', description: 'Cross-institutional records with type filters and print.', to: '/app/patient/records', icon: <FileText size={18}/> },
    { title: 'Analytics dashboard', description: 'Lab trends, blood pressure, lipid panel and health score.', to: '/app/patient/analytics', icon: <Activity size={18}/> },
    { title: 'Consent manager', description: 'Grant/revoke per-institution access; export data or request deletion.', to: '/app/patient/consents', icon: <ShieldCheck size={18}/> },
    { title: 'Emergency QR / NFC settings', description: 'Granular public-page privacy controls and wristband status.', to: '/app/patient/emergency', icon: <QrCode size={18}/> },
  ]},
  { role: 'Doctor', items: [
    { title: 'Patient viewer', description: 'Timeline, clinical summary, emergency override and AI assistant.', to: '/app/doctor/patients/user_patient_1', icon: <Stethoscope size={18}/> },
    { title: 'Prescription extraction', description: 'OCR/LLM extraction, doctor confirmation and 24h fulfillment link.', to: '/app/doctor/prescriptions', icon: <Pill size={18}/> },
    { title: 'QR / NFC tools', description: '15-minute consent QR and Web NFC scanner with QR fallback.', to: '/app/doctor/qr', icon: <QrCode size={18}/> },
    { title: 'Reports', description: 'PDF/FHIR/CSV/JSON exports for all five documented report types.', to: '/app/doctor/reports', icon: <FileText size={18}/> },
  ]},
  { role: 'Lab staff', items: [
    { title: 'Lab ingestion', description: 'Upload, batch import, manual entry and low-confidence review.', to: '/app/lab', icon: <FileText size={18}/> },
  ]},
  { role: 'Pharmacy', items: [
    { title: 'Order inbox', description: 'Fulfillment queue, status flow and patient chat.', to: '/app/pharmacy', icon: <Store size={18}/> },
    { title: 'Pharmacy profile', description: 'GPS coordinates, WhatsApp number and opening hours.', to: '/app/pharmacy/profile', icon: <Store size={18}/> },
  ]},
  { role: 'Hospital / system admin', items: [
    { title: 'Population analytics', description: 'De-identified aggregates by condition, city and month.', to: '/app/hospital/analytics', icon: <Activity size={18}/> },
    { title: 'Audit & compliance', description: 'Hash-chain verification and CSV/PDF audit exports.', to: '/app/admin/audit', icon: <ShieldCheck size={18}/> },
    { title: 'Institutions & pharmacies', description: 'License verification and partnership approvals.', to: '/app/admin/institutions', icon: <Store size={18}/> },
  ]},
];

function DemoCard({ demo }: { demo: Demo }) {
  return <Link to={demo.to} className="card" style={{ textDecoration: 'none', display: 'block', boxShadow: 'none' }}>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{demo.icon}<strong>{demo.title}</strong></div>
    <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>{demo.description}</p>
    <span className="btn sm outline" style={{ marginTop: 8 }}>Open</span>
  </Link>;
}

export function DemoHub() {
  const { t } = useTranslation();
  return <>
    <PageHead title="Demo hub" subtitle="Every documented flow, reachable from one place. Sign in with the role shown to use protected demos."/>
    <Card title="Public demos"><div className="grid cols-3">{PUBLIC.map(d => <DemoCard key={d.title} demo={d}/>)}</div></Card>
    {ROLE_DEMOS.map(group => <Card key={group.role} title={`${group.role} portal`} style={{ marginTop: 16 }}>
      <div className="grid cols-3">{group.items.map(d => <DemoCard key={d.title} demo={d}/>)}</div>
    </Card>)}
    <p className="disclaimer" style={{ marginTop: 16 }}>{t('demoModeNote') || 'In API mode, public demo tokens must be replaced with tokens issued by the API for your own patient.'}</p>
  </>;
}
