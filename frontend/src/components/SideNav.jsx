import React, { useState } from 'react'

// Nav icons — from admin assets (match Figma imgContainer16-21)
import imgNavDashboard    from '../assets/icons/admin/adm-nav-dashboard.svg'
import imgNavPatients     from '../assets/icons/admin/adm-nav-patients.svg'
import imgNavLab          from '../assets/icons/admin/adm-nav-lab.svg'
import imgNavAppointments from '../assets/icons/admin/adm-nav-appointments.svg'
import imgNavRecords      from '../assets/icons/admin/adm-nav-records.svg'
import imgNavSettings     from '../assets/icons/admin/adm-nav-settings.svg'

// Logo image (node 47:1082 — imgUntitled12)
import imgLogo from '../assets/icons/admin/adm-user-avatar.png'

// User avatar
import avatarImg from '../assets/images/user-profile-avatar.png'

import styles from './SideNav.module.css'

// Figma nodes 46:941 → 46:961 — exact order and labels
const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',       icon: imgNavDashboard,    w: 18, h: 18 },
  { id: 'patients',     label: 'Patients',         icon: imgNavPatients,     w: 22, h: 16 },
  { id: 'lab',          label: 'Lab Results',      icon: imgNavLab,          w: 14, h: 19 },
  { id: 'appointments', label: 'Appointments',     icon: imgNavAppointments, w: 18, h: 20 },
  { id: 'records',      label: 'Medical Records',  icon: imgNavRecords,      w: 19.5, h: 16 },
]

export default function SideNav() {
  const [active, setActive] = useState('dashboard')

  const [editing, setEditing] = useState(false)
  const [userName, setUserName] = useState('Dr. Ahmed Mansour')
  const [draft, setDraft] = useState(userName)

  function startEdit() { setDraft(userName); setEditing(true) }
  function commitEdit() { setUserName(draft.trim() || 'Dr. Ahmed Mansour'); setEditing(false) }
  function handleKey(e) {
    if (e.key === 'Enter')  commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <nav className={styles.nav}>

      {/* ── Logo area (node 47:1082) ── */}
      <div className={styles.logoArea}>
        <div className={styles.logoImgWrap}>
          <img src={imgLogo} alt="OneMed" className={styles.logoImg} />
        </div>
        <div className={styles.logoTexts}>
          <span className={styles.logoText}>OneMed</span>
          <span className={styles.logoSub}>Administration</span>
        </div>
      </div>

      {/* ── Nav links (nodes 46:941 → 46:961) ── */}
      <div className={styles.navLinksWrap}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`${styles.navItem} ${active === item.id ? styles.navItemActive : ''}`}
            onClick={() => setActive(item.id)}
          >
            <img
              src={item.icon}
              alt=""
              className={styles.navIcon}
              style={{ width: item.w, height: item.h }}
            />
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Settings (node 46:966) ── */}
      <div className={styles.settingsArea}>
        <button className={styles.navItem}>
          <img src={imgNavSettings} alt="" className={styles.navIcon} style={{ width: 20, height: 20 }} />
          <span className={styles.navLabel}>Settings</span>
        </button>
      </div>

      {/* ── User profile ── */}
      <div className={styles.userSection}>
        <div className={styles.userCard}>
          <div className={styles.avatarWrap}>
            <img src={avatarImg} alt={userName} className={styles.userAvatar} />
          </div>
          <div className={styles.userInfo}>
            {editing ? (
              <input
                className={styles.nameInput}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKey}
                autoFocus
              />
            ) : (
              <div className={styles.userName} title="Click to edit" onClick={startEdit}>
                {userName}
              </div>
            )}
            <div className={styles.userRole}>System Admin</div>
          </div>
        </div>
      </div>

    </nav>
  )
}
