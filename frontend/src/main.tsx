import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './i18n';
import './index.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/ui';
import { logout } from './api/client';
import { AppShell } from './components/AppShell';
import type { Role } from './types';
import {
  Landing, Register, Login, EmergencyPage, NfcLanding, FulfillmentPage,
} from './pages/public';
import { ConsentQrPage } from './pages/consent-qr';
import { PrivacyPage, TermsPage } from './pages/legal';
import {
  PatientDashboard, PatientRecords, PatientAnalytics, PatientPrescriptions, PatientConsents,
  PatientEmergencyConfig, PatientMessages, PatientNotifications, PatientSettings,
} from './pages/patient';
import {
  DoctorDashboard, DoctorPatients, PatientViewer, DoctorPrescriptions, DoctorQrTools,
  DoctorMessages, DoctorReports, DoctorSettings, DoctorAnalytics,
} from './pages/doctor';
import {
  LabPortal, PharmacyPortal, PharmacyProfile, HospitalAdmin, HospitalStaff, HospitalConnections,
  HospitalAnalytics, AdminOverview, AdminUsers, AdminInstitutions, AdminPharmacies, AdminAudit,
  AdminReports, AdminPopulation,
} from './pages/staff';

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
import { useParams } from 'react-router-dom';
function ConsentQrRoute() { const { token='' } = useParams(); return <ConsentQrPage token={token}/>; }
function Root() {
  const { session } = useAuth();
  return <Routes>
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
  </Routes>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AuthProvider><ToastProvider><Root/></ToastProvider></AuthProvider></BrowserRouter></React.StrictMode>,
);

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
