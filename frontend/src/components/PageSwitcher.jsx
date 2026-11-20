import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './PageSwitcher.module.css'

export default function PageSwitcher() {
  return (
    <div className={styles.switcher}>
      <NavLink
        to="/prescription"
        className={({ isActive }) => `${styles.btn} ${isActive ? styles.active : ''}`}
      >
        📄 Prescription Review
      </NavLink>
      <NavLink
        to="/admin"
        className={({ isActive }) => `${styles.btn} ${isActive ? styles.active : ''}`}
      >
        ⚙️ Administration
      </NavLink>
      <NavLink
        to="/pharmacy-order"
        className={({ isActive }) => `${styles.btn} ${isActive ? styles.active : ''}`}
      >
        💊 Pharmacy Order
      </NavLink>
    </div>
  )
}
