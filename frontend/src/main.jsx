import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App                from './App.jsx'
import AppAdmin           from './AppAdmin.jsx'
import PharmacyOrderPage  from './components/PharmacyOrderPage.jsx'
import EmergencyPage      from './components/EmergencyPage.jsx'
import SystemOverviewPage    from './components/SystemOverviewPage.jsx'
import PatientAnalyticsPage  from './components/PatientAnalyticsPage.jsx'
import PageSwitcher           from './components/PageSwitcher.jsx'
import './index.css'

function Root() {
  return (
    <>
      <Routes>
        <Route path="/"               element={<Navigate to="/prescription" replace />} />
        <Route path="/prescription"   element={<App />} />
        <Route path="/admin"          element={<AppAdmin />} />
        <Route path="/pharmacy-order" element={<PharmacyOrderPage />} />
        <Route path="/emergency"      element={<EmergencyPage />} />
        <Route path="/system"             element={<SystemOverviewPage />} />
        <Route path="/patient-analytics" element={<PatientAnalyticsPage />} />
      </Routes>
      <PageSwitcher />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>,
)
