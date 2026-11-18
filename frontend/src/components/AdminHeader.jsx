import React from 'react'
import iconExport  from '../assets/icons/export.svg'
import iconAddUser from '../assets/icons/add-user.svg'
import styles from './AdminHeader.module.css'

export default function AdminHeader() {
  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>Administration</h1>
        <p className={styles.subtitle}>Manage institutional settings, staff access, and data integrations.</p>
      </div>
      <div className={styles.actions}>
        <button className={styles.btnOutline}>
          <img src={iconExport} alt="" />
          <span>Export Log</span>
        </button>
        <button className={styles.btnPrimary}>
          <img src={iconAddUser} alt="" />
          <span>New User</span>
        </button>
      </div>
    </div>
  )
}
