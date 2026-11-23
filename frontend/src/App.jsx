import React from 'react'
import Header        from './components/Header.jsx'
import ImageViewer   from './components/ImageViewer.jsx'
import MedicineTable from './components/MedicineTable.jsx'
import PageSwitcher  from './components/PageSwitcher.jsx'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.splitPane}>
        <ImageViewer />
        <MedicineTable />
      </main>
      <PageSwitcher />
    </div>
  )
}
