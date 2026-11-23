import React, { useState } from 'react'
import iconSearch      from '../assets/icons/search.svg'
import iconFilter      from '../assets/icons/filter.svg'
import iconEdit        from '../assets/icons/edit-user.svg'
import iconDelete      from '../assets/icons/delete-user.svg'
import iconChevLeft    from '../assets/icons/chevron-left.svg'
import iconChevRight   from '../assets/icons/chevron-right.svg'
import drSarahImg      from '../assets/images/dr-sarah-jenkins.png'
import elenaImg        from '../assets/images/elena-rodriguez.png'
import styles from './StaffTable.module.css'

// Figma nodes 46:1356, 46:1380 — exact names, IDs, departments, roles, statuses
const STAFF = [
  {
    id: 1, photo: drSarahImg, initials: null,
    name: 'Dr. Sarah Jenkins', staffId: 'ONM-8429',
    department: 'Cardiology',
    role: 'Attending Physician',
    roleBg: 'rgba(216,226,255,0.6)', roleColor: '#001a41',
    // node 46:1345 — Active: green dot + green text
    status: 'Active', statusColor: '#10b981', dotColor: '#10b981',
  },
  {
    id: 2, photo: null, initials: 'MK',
    name: 'Michael Kim', staffId: 'ONM-7731',
    department: 'Laboratory',
    role: 'Lab Technician',
    roleBg: 'rgba(216,227,251,0.6)', roleColor: '#111c2d',
    // On Leave: amber dot + amber text
    status: 'On Leave', statusColor: '#f59e0b', dotColor: '#f59e0b',
  },
  {
    id: 3, photo: elenaImg, initials: null,
    name: 'Elena Rodriguez', staffId: 'ONM-6612',
    department: 'Radiology',
    role: 'Radiologist',
    roleBg: 'rgba(216,226,255,0.6)', roleColor: '#001a41',
    status: 'Active', statusColor: '#10b981', dotColor: '#10b981',
  },
  {
    id: 4, photo: null, initials: 'AM',
    name: 'Ahmed Mansour', staffId: 'ONM-0001',
    department: 'Administration',
    role: 'SysAdmin',
    roleBg: '#e7e8e9', roleColor: '#191c1d',
    // Inactive: grey dot + grey text
    status: 'Inactive', statusColor: '#747781', dotColor: '#747781',
  },
]

export default function StaffTable() {
  const [filter, setFilter] = useState('')

  const filtered = STAFF.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.department.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className={styles.card}>
      {/* Card header */}
      <div className={styles.cardHead}>
        <div>
          <h3 className={styles.cardTitle}>Staff Management</h3>
          <p className={styles.cardSub}>Manage access control and institutional roles.</p>
        </div>
        <div className={styles.headActions}>
          <div className={styles.searchWrap}>
            <img src={iconSearch} alt="" className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Filter staff..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button className={styles.filterBtn}>
            <img src={iconFilter} alt="Filter" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHead}>
              <th className={styles.thAvatar}></th>
              <th className={styles.thName}>NAME &amp; ID</th>
              <th className={styles.thDept}>DEPARTMENT</th>
              <th className={styles.thRole}>ROLE</th>
              <th className={styles.thStatus}>STATUS</th>
              <th className={styles.thActions}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(staff => (
              <tr key={staff.id} className={styles.row}>
                <td className={styles.tdAvatar}>
                  {staff.photo
                    ? <img src={staff.photo} alt={staff.name} className={styles.avatar} />
                    : <div className={styles.avatarInitials}>{staff.initials}</div>
                  }
                </td>
                <td className={styles.tdName}>
                  <div className={styles.nameText}>{staff.name}</div>
                  <div className={styles.idText}>ID: {staff.staffId}</div>
                </td>
                <td className={styles.tdDept}>{staff.department}</td>
                <td className={styles.tdRole}>
                  <span
                    className={styles.roleBadge}
                    style={{ background: staff.roleBg, color: staff.roleColor }}
                  >
                    {staff.role}
                  </span>
                </td>
                <td className={styles.tdStatus}>
                  <div className={styles.statusWrap}>
                    <span className={styles.statusDot} style={{ background: staff.dotColor }} />
                    <span style={{ color: staff.statusColor }}>{staff.status}</span>
                  </div>
                </td>
                <td className={styles.tdActions}>
                  <div className={styles.actionBtns}>
                    <button className={styles.actionBtn} title="Edit">
                      <img src={iconEdit} alt="Edit" />
                    </button>
                    <button className={styles.actionBtn} title="Delete">
                      <img src={iconDelete} alt="Delete" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer pagination */}
      <div className={styles.cardFoot}>
        <span className={styles.footText}>Showing 1–{filtered.length} of 1,248</span>
        <div className={styles.pagination}>
          <button className={styles.pageBtn}><img src={iconChevLeft} alt="Prev" /></button>
          <button className={styles.pageBtn}><img src={iconChevRight} alt="Next" /></button>
        </div>
      </div>
    </div>
  )
}
