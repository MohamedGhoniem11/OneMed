import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './i18n';
import './index.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/ui';
import { AppShell } from './components/AppShell';
import type { Role } from './types';
import {
  Landing, Register, Login, EmergencyPage, NfcLanding, FulfillmentPage, ConsentQrPage,
} from './pages/public';
import {
  PatientDashboard, PatientRecords, PatientAnalytics, PatientPrescriptions, PatientConsents,
  PatientEmergencyConfig, PatientMessages, PatientNotifications, PatientSettings,
} from './pages/patient';
import {
  DoctorDashboard, DoctorPatients, PatientViewer, DoctorPrescriptions, DoctorQrTools,
  DoctorMessages, DoctorReports, DoctorSettings,
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
function AppEntry() {
  const { session } = useAuth();
  return <AppShell><Routes>
    <Route path="/" element={session ? <Navigate to="/app" replace/> : <Landing/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/emergency/:token" element={<EmergencyPage/>}/>
    <Route path="/nfc/:token" element={<NfcLanding/>}/>
    <Route path="/f/:token" element={<FulfillmentPage/>}/>
    <Route path="/qr/:token" element={<ConsentQrPage/>}/>
    <Route path="/app" element={<Guard><AppRedirect/></Guard>}/>

    <Route path="/app/patient" element={<Guard roles={['patient']}><PatientDashboard/></Guard>}/>
    <Route path="/app/patient/records" element={<Guard roles={['patient']}><PatientRecords/></Guard>}/>
    <Route path="/app/patient/analytics" element={<Guard roles={['patient']}><PatientAnalytics/></Guard>}/>
    <Route path="/app/patient/prescriptions" element={<Guard roles={['patient']}><PatientPrescriptions/></Guard>}/>
    <Route path="/app/patient/consents" element={<Guard roles={['patient']}><PatientConsents/></Guard>}/>
    <Route path="/app/patient/emergency" element={<Guard roles={['patient']}><PatientEmergencyConfig/></Guard>}/>
    <Route path="/app/patient/messages" element={<Guard roles={['patient']}><PatientMessages/></Guard>}/>
    <Route path="/app/patient/notifications" element={<Guard roles={['patient']}><PatientNotifications/></Guard>}/>
    <Route path="/app/patient/settings" element={<Guard roles={['patient']}><PatientSettings/></Guard>}/>

    <Route path="/app/doctor" element={<Guard roles={['doctor']}><DoctorDashboard/></Guard>}/>
    <Route path="/app/doctor/patients" element={<Guard roles={['doctor']}><DoctorPatients/></Guard>}/>
    <Route path="/app/doctor/patients/:id" element={<Guard roles={['doctor']}><PatientViewer/></Guard>}/>
    <Route path="/app/doctor/prescriptions" element={<Guard roles={['doctor']}><DoctorPrescriptions/></Guard>}/>
    <Route path="/app/doctor/qr" element={<Guard roles={['doctor']}><DoctorQrTools/></Guard>}/>
    <Route path="/app/doctor/messages" element={<Guard roles={['doctor']}><DoctorMessages/></Guard>}/>
    <Route path="/app/doctor/reports" element={<Guard roles={['doctor']}><DoctorReports/></Guard>}/>
    <Route path="/app/doctor/settings" element={<Guard roles={['doctor']}><DoctorSettings/></Guard>}/>

    <Route path="/app/lab" element={<Guard roles={['lab_staff']}><LabPortal/></Guard>}/>
    <Route path="/app/lab/history" element={<Guard roles={['lab_staff']}><LabPortal/></Guard>}/>

    <Route path="/app/pharmacy" element={<Guard roles={['pharmacy']}><PharmacyPortal/></Guard>}/>
    <Route path="/app/pharmacy/profile" element={<Guard roles={['pharmacy']}><PharmacyProfile/></Guard>}/>

    <Route path="/app/hospital" element={<Guard roles={['hospital_admin']}><HospitalAdmin/></Guard>}/>
    <Route path="/app/hospital/staff" element={<Guard roles={['hospital_admin']}><HospitalStaff/></Guard>}/>
    <Route path="/app/hospital/connections" element={<Guard roles={['hospital_admin']}><HospitalConnections/></Guard>}/>
    <Route path="/app/hospital/analytics" element={<Guard roles={['hospital_admin']}><HospitalAnalytics/></Guard>}/>

    <Route path="/app/admin" element={<Guard roles={['admin']}><AdminOverview/></Guard>}/>
    <Route path="/app/admin/users" element={<Guard roles={['admin']}><AdminUsers/></Guard>}/>
    <Route path="/app/admin/institutions" element={<Guard roles={['admin']}><AdminInstitutions/></Guard>}/>
    <Route path="/app/admin/pharmacies" element={<Guard roles={['admin']}><AdminPharmacies/></Guard>}/>
    <Route path="/app/admin/audit" element={<Guard roles={['admin']}><AdminAudit/></Guard>}/>
    <Route path="/app/admin/reports" element={<Guard roles={['admin']}><AdminReports/></Guard>}/>
    <Route path="/app/admin/population" element={<Guard roles={['admin']}><AdminPopulation/></Guard>}/>

    <Route path="*" element={<div className="auth-wrap"><div className="card"><h1>404</h1><p>Page not found</p><a className="btn primary" href="/">Home</a></div></div>}/>
  </Routes></AppShell>;
}
function AppRedirect() {
  const { session } = useAuth();
  const map: Record<Role,string> = { patient:'/app/patient', doctor:'/app/doctor', lab_staff:'/app/lab', pharmacy:'/app/pharmacy', hospital_admin:'/app/hospital', admin:'/app/admin' };
  return <Navigate to={session ? map[session.user.role] : '/login'} replace/>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AuthProvider><ToastProvider><AppEntry/></ToastProvider></AuthProvider></BrowserRouter></React.StrictMode>,
);
