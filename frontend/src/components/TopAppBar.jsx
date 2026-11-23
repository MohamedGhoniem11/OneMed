import React, { useState } from 'react'
import iconSearch   from '../assets/icons/header-search.svg'
import iconBell     from '../assets/icons/header-bell.svg'
import iconSettings from '../assets/icons/header-settings.svg'
// node 46:926 — user icon (adm-nav-staff.svg = e2cd9.svg = 16×20px inside circle)
import iconUser     from '../assets/icons/admin/adm-nav-staff.svg'
import styles from './TopAppBar.module.css'

export default function TopAppBar() {
  const [query, setQuery] = useState('')

  return (
    <header className={styles.bar}>

      {/* ── Left: Search input (node 46:1470) ── */}
      <div className={styles.searchWrap}>
        <img src={iconSearch} alt="" className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search system..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* ── Right: icons + user ── */}
      <div className={styles.right}>

        {/* Bell + Settings (node 46:912) */}
        <div className={styles.icons}>
          <button className={styles.iconBtn} title="Notifications">
            <img src={iconBell} alt="Notifications" className={styles.iconImg} />
            <span className={styles.greenDot} />
          </button>
          <button className={styles.iconBtn} title="Settings">
            <img src={iconSettings} alt="Settings" className={styles.iconImg} />
          </button>
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* User info + avatar icon (node 46:926) */}
        <div className={styles.userWrap}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>System Admin</span>
            <span className={styles.userRole}>Admin Level 5</span>
          </div>
          {/* bg #0b3b7c, border #c3c6d2, 40×40, icon 16×20 white */}
          <div className={styles.avatarWrap}>
            <img src={iconUser} alt="" className={styles.avatarIcon} />
          </div>
        </div>

      </div>
    </header>
  )
}
