import React, { useState } from 'react'
import iconSearch   from '../assets/icons/header-search.svg'
import iconBell     from '../assets/icons/header-bell.svg'
import iconSettings from '../assets/icons/header-settings.svg'
import avatarImg    from '../assets/images/user-profile-avatar.png'
import styles from './TopAppBar.module.css'

export default function TopAppBar() {
  const [query, setQuery] = useState('')

  return (
    <header className={styles.bar}>

      {/* ── Left: Search input ── */}
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

        {/* Bell + Settings */}
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

        {/* User info + avatar */}
        <div className={styles.userWrap}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>System Admin</span>
            <span className={styles.userRole}>Admin Level 5</span>
          </div>
          <div className={styles.avatarWrap}>
            <img src={avatarImg} alt="avatar" className={styles.avatarImg} />
          </div>
        </div>

      </div>
    </header>
  )
}
