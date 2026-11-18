import React from 'react'
import iconLogo    from '../assets/icons/logo.svg'
import iconStatus  from '../assets/icons/status-check.svg'
import styles      from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      {/* ── Left side: logo + title ── */}
      <div className={styles.left}>
        <img src={iconLogo} alt="OneMed logo" className={styles.logoIcon} />
        <div className={styles.logoText}>OneMed</div>
        <div className={styles.pageTitle}>Prescription Extraction Review</div>
      </div>

      {/* ── Right side: confidence badge + avatar ── */}
      <div className={styles.right}>
        <div className={styles.confidenceBadge}>
          <img src={iconStatus} alt="" className={styles.badgeIcon} />
          <span className={styles.badgeText}>High Confidence (94%)</span>
        </div>
        <div className={styles.avatar}>AM</div>
      </div>
    </header>
  )
}
