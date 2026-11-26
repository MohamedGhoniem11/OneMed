import React, { Suspense, lazy, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import './i18n';
import './index.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/ui';
import { logout } from './api/client';
import { AppShell } from './components/AppShell';
import type { Role } from './types';

// Route-level code splitting: heavy chart, QR and translation code loads only
// for the pages that need it instead of shipping in the initial bundle.
const Landing = lazy(() => import('./pages/public').then((m) => ({ default: m.Landing })));
const Register = lazy(() => import('./pages/public').then((m) => ({ default: m.Register })));
const Login = lazy(() => import('./pages/public').then((m) => ({ default: m.Login })));
const EmergencyPage = lazy(() => import('./pages/public').then((m) => ({ default: m.EmergencyPage })));
const NfcLanding = lazy(() => import('./pages/public').then((m) => ({ default: m.NfcLanding })));
const FulfillmentPage = lazy(() => import('./pages/public').then((m) => ({ default: m.FulfillmentPage })));
const ConsentQrPage = lazy(() => import('./pages/consent-qr').then((m) => ({ default: m.ConsentQrPage })));
const PrivacyPage = lazy(() => import('./pages/legal').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/legal').then((m) => ({ default: m.TermsPage })));
const PatientDashboard = lazy(() => import('./pages/patient').then((m) => ({ default: m.PatientDashboard })));
const PatientRecords = lazy(() => import('./pages/patient').then((m) => ({ default: m.PatientRecords })));
const PatientAnalytics = lazy(() => import('./pages/patient').then((m) => ({ default: m.PatientAnalytics })));
const PatientPrescriptions = lazy(() => import('./pages/patient').then((m) => ({ default: m.PatientPrescriptions })));
const PatientConsents = lazy(() => import('./pages/patient').then((m) => ({ default: m.PatientConsents })));
const PatientEmergencyConfig = lazy(() => import('./pages/patient').then((m) => ({ default: m.PatientEmergencyConfig })));
const PatientMessages = lazy(() => import('./pages/patient').then((m) => ({ default: m.PatientMessages })));
const PatientNotifications = lazy(() => import('./pages/patient').then((m) => ({ default: m.PatientNotifications })));
const PatientSettings = lazy(() => import('./pages/patient').then((m) => ({ default: m.PatientSettings })));
const DoctorDashboard = lazy(() => import('./pages/doctor').then((m) => ({ default: m.DoctorDashboard })));
const DoctorPatients = lazy(() => import('./pages/doctor').then((m) => ({ default: m.DoctorPatients })));
const PatientViewer = lazy(() => import('./pages/doctor').then((m) => ({ default: m.PatientViewer })));
const DoctorPrescriptions = lazy(() => import('./pages/doctor').then((m) => ({ default: m.DoctorPrescriptions })));
const DoctorQrTools = lazy(() => import('./pages/doctor').then((m) => ({ default: m.DoctorQrTools })));
const DoctorMessages = lazy(() => import('./pages/doctor').then((m) => ({ default: m.DoctorMessages })));
const DoctorReports = lazy(() => import('./pages/doctor').then((m) => ({ default: m.DoctorReports })));
const DoctorSettings = lazy(() => import('./pages/doctor').then((m) => ({ default: m.DoctorSettings })));
const DoctorAnalytics = lazy(() => import('./pages/doctor').then((m) => ({ default: m.DoctorAnalytics })));
const LabPortal = lazy(() => import('./pages/staff').then((m) => ({ default: m.LabPortal })));
const PharmacyPortal = lazy(() => import('./pages/staff').then((m) => ({ default: m.PharmacyPortal })));
const PharmacyProfile = lazy(() => import('./pages/staff').then((m) => ({ default: m.PharmacyProfile })));
const HospitalAdmin = lazy(() => import('./pages/staff').then((m) => ({ default: m.HospitalAdmin })));
const HospitalStaff = lazy(() => import('./pages/staff').then((m) => ({ default: m.HospitalStaff })));
const HospitalConnections = lazy(() => import('./pages/staff').then((m) => ({ default: m.HospitalConnections })));
const HospitalAnalytics = lazy(() => import('./pages/staff').then((m) => ({ default: m.HospitalAnalytics })));
const AdminOverview = lazy(() => import('./pages/staff').then((m) => ({ default: m.AdminOverview })));
const AdminUsers = lazy(() => import('./pages/staff').then((m) => ({ default: m.AdminUsers })));
const AdminInstitutions = lazy(() => import('./pages/staff').then((m) => ({ default: m.AdminInstitutions })));
const AdminPharmacies = lazy(() => import('./pages/staff').then((m) => ({ default: m.AdminPharmacies })));
const AdminAudit = lazy(() => import('./pages/staff').then((m) => ({ default: m.AdminAudit })));
const AdminReports = lazy(() => import('./pages/staff').then((m) => ({ default: m.AdminReports })));
const AdminPopulation = lazy(() => import('./pages/staff').then((m) => ({ default: m.AdminPopulation })));

function Guard({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(session.user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
/** Authenticated surface: guard first, then the role-aware shell. */
function Protected({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  return <Guard roles={roles}><AppShell>{children}</AppShell></Guard>;
}
function AppRedirect() {
  const { session } = useAuth();
  const map: Record<Role,string> = { patient:'/app/patient', doctor:'/app/doctor', lab_staff:'/app/lab', pharmacy:'/app/pharmacy', hospital_admin:'/app/hospital', admin:'/app/admin' };
  // A stale/unknown role must never produce an undefined Navigate target.
  const target = session ? (map[session.user.role] || '/login') : '/login';
  useEffect(() => {
    // Clear a stale session so it cannot bounce between /app and /login.
    if (session && !map[session.user.role]) void logout();
  }, [session]);
  return <Navigate to={target} replace/>;
}
function ConsentQrRoute() { const { token='' } = useParams(); return <ConsentQrPage token={token}/>; }

function RouteFallback() {
  return <div className="auth-wrap"><div className="card" role="status" aria-busy="true"><p>Loading…</p></div></div>;
}

function Root() {
  const { session } = useAuth();
  return <Suspense fallback={<RouteFallback/>}><Routes>
    {/* Public surfaces: intentionally OUTSIDE AppShell, so a logged-in bystander
        never sees the authenticated navigation on an emergency page. */}
    <Route path="/" element={session ? <Navigate to="/app" replace/> : <Landing/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/privacy" element={<PrivacyPage/>}/>
    <Route path="/terms" element={<TermsPage/>}/>
    <Route path="/emergency/:token" element={<EmergencyPage/>}/>
    <Route path="/nfc/:token" element={<NfcLanding/>}/>
    <Route path="/f/:token" element={<FulfillmentPage/>}/>
    <Route path="/qr/:token" element={<ConsentQrRoute/>}/>

    <Route path="/app" element={<Protected><AppRedirect/></Protected>}/>
    <Route path="/app/notifications" element={<Protected><PatientNotifications/></Protected>}/>

    <Route path="/app/patient" element={<Protected roles={['patient']}><PatientDashboard/></Protected>}/>
    <Route path="/app/patient/records" element={<Protected roles={['patient']}><PatientRecords/></Protected>}/>
    <Route path="/app/patient/analytics" element={<Protected roles={['patient']}><PatientAnalytics/></Protected>}/>
    <Route path="/app/patient/prescriptions" element={<Protected roles={['patient']}><PatientPrescriptions/></Protected>}/>
    <Route path="/app/patient/consents" element={<Protected roles={['patient']}><PatientConsents/></Protected>}/>
    <Route path="/app/patient/emergency" element={<Protected roles={['patient']}><PatientEmergencyConfig/></Protected>}/>
    <Route path="/app/patient/messages" element={<Protected roles={['patient']}><PatientMessages/></Protected>}/>
    <Route path="/app/patient/notifications" element={<Protected roles={['patient']}><PatientNotifications/></Protected>}/>
    <Route path="/app/patient/settings" element={<Protected roles={['patient']}><PatientSettings/></Protected>}/>

    <Route path="/app/doctor" element={<Protected roles={['doctor']}><DoctorDashboard/></Protected>}/>
    <Route path="/app/doctor/patients" element={<Protected roles={['doctor']}><DoctorPatients/></Protected>}/>
    <Route path="/app/doctor/patients/:id" element={<Protected roles={['doctor']}><PatientViewer/></Protected>}/>
    <Route path="/app/doctor/prescriptions" element={<Protected roles={['doctor']}><DoctorPrescriptions/></Protected>}/>
    <Route path="/app/doctor/qr" element={<Protected roles={['doctor']}><DoctorQrTools/></Protected>}/>
    <Route path="/app/doctor/messages" element={<Protected roles={['doctor']}><DoctorMessages/></Protected>}/>
    <Route path="/app/doctor/reports" element={<Protected roles={['doctor']}><DoctorReports/></Protected>}/>
    <Route path="/app/doctor/analytics" element={<Protected roles={['doctor']}><DoctorAnalytics/></Protected>}/>
    <Route path="/app/doctor/settings" element={<Protected roles={['doctor']}><DoctorSettings/></Protected>}/>

    <Route path="/app/lab" element={<Protected roles={['lab_staff']}><LabPortal/></Protected>}/>
    <Route path="/app/lab/history" element={<Protected roles={['lab_staff']}><LabPortal initialTab="history"/></Protected>}/>

    <Route path="/app/pharmacy" element={<Protected roles={['pharmacy']}><PharmacyPortal/></Protected>}/>
    <Route path="/app/pharmacy/profile" element={<Protected roles={['pharmacy']}><PharmacyProfile/></Protected>}/>

    <Route path="/app/hospital" element={<Protected roles={['hospital_admin']}><HospitalAdmin/></Protected>}/>
    <Route path="/app/hospital/staff" element={<Protected roles={['hospital_admin']}><HospitalStaff/></Protected>}/>
    <Route path="/app/hospital/connections" element={<Protected roles={['hospital_admin']}><HospitalConnections/></Protected>}/>
    <Route path="/app/hospital/analytics" element={<Protected roles={['hospital_admin']}><HospitalAnalytics/></Protected>}/>

    <Route path="/app/admin" element={<Protected roles={['admin']}><AdminOverview/></Protected>}/>
    <Route path="/app/admin/users" element={<Protected roles={['admin']}><AdminUsers/></Protected>}/>
    <Route path="/app/admin/institutions" element={<Protected roles={['admin']}><AdminInstitutions/></Protected>}/>
    <Route path="/app/admin/pharmacies" element={<Protected roles={['admin']}><AdminPharmacies/></Protected>}/>
    <Route path="/app/admin/audit" element={<Protected roles={['admin']}><AdminAudit/></Protected>}/>
    <Route path="/app/admin/reports" element={<Protected roles={['admin']}><AdminReports/></Protected>}/>
    <Route path="/app/admin/population" element={<Protected roles={['admin']}><AdminPopulation/></Protected>}/>

    <Route path="*" element={<div className="auth-wrap"><div className="card"><h1>404</h1><p>Page not found</p><a className="btn primary" href="/">Home</a></div></div>}/>
  </Routes></Suspense>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AuthProvider><ToastProvider><Root/></ToastProvider></AuthProvider></BrowserRouter></React.StrictMode>,
);

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
