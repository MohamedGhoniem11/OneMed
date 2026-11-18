import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App      from './App.jsx'
import AppAdmin from './AppAdmin.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Navigate to="/prescription" replace />} />
        <Route path="/prescription" element={<App />} />
        <Route path="/admin"        element={<AppAdmin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
