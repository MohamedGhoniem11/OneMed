import React from 'react'
import SideNav        from './components/SideNav.jsx'
import TopAppBar      from './components/TopAppBar.jsx'
import AdminHeader    from './components/AdminHeader.jsx'
import MetricsRow     from './components/MetricsRow.jsx'
import StaffTable     from './components/StaffTable.jsx'
import ApiConnections from './components/ApiConnections.jsx'
import PageSwitcher   from './components/PageSwitcher.jsx'
import bgMap          from './assets/images/background-map.png'
import styles from './AppAdmin.module.css'

export default function AppAdmin() {
  return (
    <div className={styles.page}>
      <SideNav />

      <div className={styles.main}>
        <TopAppBar />

        <div className={styles.content}>
          <div className={styles.mapBg}>
            <img src={bgMap} alt="" className={styles.mapImg} />
          </div>

          <div className={styles.pageHeader}>
            <AdminHeader />
          </div>

          <MetricsRow />

          <div className={styles.grid}>
            <StaffTable />
            <ApiConnections />
          </div>
        </div>
      </div>

      <PageSwitcher />
    </div>
  )
}
