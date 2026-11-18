import React, { useState } from 'react'
import iconSearch   from '../assets/icons/header-search.svg'
import iconBell     from '../assets/icons/header-bell.svg'
import iconSettings from '../assets/icons/header-settings.svg'
import styles from './TopAppBar.module.css'

export default function TopAppBar() {
  const [query, setQuery] = useState('')

  return (
    <header className={styles.bar}>
      {/* Left: brand name */}
      <div className={styles.brand}>OneMed Healthcare</div>

      {/* Right: search + bell + settings */}
      <div className={styles.right}>
        {/* Search input */}
        <div className={styles.searchWrap}>
          <img src={iconSearch} alt="" className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search staff, ID, or settings..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Bell with red dot */}
        <button className={styles.iconBtn} title="Notifications">
          <img src={iconBell} alt="Notifications" />
          <span className={styles.redDot} />
        </button>

        {/* Settings */}
        <button className={styles.iconBtn} title="Settings">
          <img src={iconSettings} alt="Settings" />
        </button>
      </div>
    </header>
  )
}
