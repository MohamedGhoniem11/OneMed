import React, { useState } from 'react'
import navDashboard    from '../assets/icons/nav-dashboard.svg'
import navPatients     from '../assets/icons/nav-patients.svg'
import navLab          from '../assets/icons/nav-lab.svg'
import navAppointments from '../assets/icons/nav-appointments.svg'
import navRecords      from '../assets/icons/nav-records.svg'
import navSettings     from '../assets/icons/nav-settings.svg'
import avatarImg       from '../assets/images/user-profile-avatar.png'
import styles from './SideNav.module.css'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',      icon: navDashboard    },
  { id: 'patients',     label: 'Patients',        icon: navPatients     },
  { id: 'lab',          label: 'Lab Results',     icon: navLab          },
  { id: 'appointments', label: 'Appointments',    icon: navAppointments },
  { id: 'records',      label: 'Medical Records', icon: navRecords      },
  { id: 'settings',     label: 'Settings',        icon: navSettings     },
]

export default function SideNav() {
  const [active, setActive] = useState('settings')

  // Editable name state (node 46-1532 — inline edit)
  const [editing, setEditing]   = useState(false)
  const [userName, setUserName] = useState('Dr. Ahmed Mansour')
  const [draft, setDraft]       = useState(userName)

  function startEdit() {
    setDraft(userName)
    setEditing(true)
  }
  function commitEdit() {
    setUserName(draft.trim() || 'Dr. Ahmed Mansour')
    setEditing(false)
  }
  function handleKey(e) {
    if (e.key === 'Enter')  commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <nav className={styles.nav}>
      {/* ── Top section ── */}
      <div className={styles.top}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoText}>OneMed</div>
          <div className={styles.logoSub}>Administration</div>
        </div>

        {/* Nav items */}
        <ul className={styles.list}>
          {NAV_ITEMS.map(item => (
            <li key={item.id}>
              <button
                className={`${styles.navItem} ${active === item.id ? styles.navItemActive : ''}`}
                onClick={() => setActive(item.id)}
              >
                <img src={item.icon} alt="" className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── User profile (node 46-1532) ── */}
      <div className={styles.userSection}>
        <div className={styles.userCard}>
          {/* Avatar with blue border exactly from Figma */}
          <div className={styles.avatarWrap}>
            <img src={avatarImg} alt={userName} className={styles.userAvatar} />
          </div>

          <div className={styles.userInfo}>
            {/* Editable name */}
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
              <div
                className={styles.userName}
                title="Click to edit"
                onClick={startEdit}
              >
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
