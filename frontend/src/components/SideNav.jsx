import React, { useState } from 'react'

// Nav icons (nodes 46:941–46:961)
import imgNavDashboard    from '../assets/icons/admin/adm-nav-dashboard.svg'
import imgNavPatients     from '../assets/icons/admin/adm-nav-patients.svg'
import imgNavLab          from '../assets/icons/admin/adm-nav-lab.svg'
import imgNavAppointments from '../assets/icons/admin/adm-nav-appointments.svg'
import imgNavRecords      from '../assets/icons/admin/adm-nav-records.svg'

// Logo image (node 47:1080 — appears ONCE, full-width)
import imgLogo from '../assets/icons/admin/adm-user-avatar.png'

// User avatar
import avatarImg from '../assets/images/user-profile-avatar.png'

import styles from './SideNav.module.css'

// Figma nodes 46:941 → 46:961 — exact order, exact labels
// node 46:1498 — "Dashboard" is the ACTIVE item (bg #006a61, border #6bd8cb)
const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',      icon: imgNavDashboard,    w: 18,   h: 18 },
  { id: 'patients',     label: 'Patients',        icon: imgNavPatients,     w: 22,   h: 16 },
  { id: 'lab',          label: 'Lab Results',     icon: imgNavLab,          w: 14,   h: 19 },
  { id: 'appointments', label: 'Appointments',    icon: imgNavAppointments, w: 18,   h: 20 },
  { id: 'records',      label: 'Medical Records', icon: imgNavRecords,      w: 19.5, h: 16 },
  // NO Settings here — node 46:1531 confirms no settings in nav links
]

export default function SideNav() {
  const [active, setActive] = useState('dashboard')

  const [editing, setEditing] = useState(false)
  const [userName, setUserName] = useState('Dr. Ahmed Mansour')
  const [draft, setDraft]       = useState(userName)

  function startEdit()  { setDraft(userName); setEditing(true) }
  function commitEdit() { setUserName(draft.trim() || 'Dr. Ahmed Mansour'); setEditing(false) }
  function handleKey(e) {
    if (e.key === 'Enter')  commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <nav className={styles.nav}>

      {/* ── Logo (node 47:1080) — ONE image, full-width, no text beside it ── */}
      <div className={styles.logoWrap}>
        <img src={imgLogo} alt="OneMed" className={styles.logoImg} />
      </div>

      {/* ── Nav links (nodes 46:941–46:961, 46:1498) ── */}
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

      {/* ── User profile (node 46:1531) ── */}
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
