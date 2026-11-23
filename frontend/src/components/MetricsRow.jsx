import React from 'react'
import iconStaff   from '../assets/icons/metric-staff.svg'
import iconRecords from '../assets/icons/metric-records.svg'
import iconWarning from '../assets/icons/metric-warning.svg'
import iconUptime  from '../assets/icons/metric-uptime.svg'
import iconArrowUp from '../assets/icons/metric-arrow-up.svg'
import styles from './MetricsRow.module.css'

const METRICS = [
  {
    id: 1,
    icon: iconStaff,
    iconBg: '#d8e2ff',
    label: 'ACTIVE HOSPITAL STAFF',
    value: '1,248',
    sub: '12 this month',
    subColor: '#10b981',
    hasArrow: true,
  },
  {
    id: 2,
    icon: iconRecords,
    iconBg: '#89f5e7',
    label: 'RECORDS UPLOADED (WEEK)',
    value: '8,402',
    sub: '15% vs last week',
    subColor: '#10b981',
    hasArrow: true,
  },
  {
    id: 3,
    icon: iconWarning,
    iconBg: 'rgba(245,158,11,0.2)',
    label: 'API SYNC ERRORS',
    value: '3',
    sub: 'Requires review',
    subColor: '#f59e0b',
    hasArrow: false,
  },
  {
    id: 4,
    icon: iconUptime,
    iconBg: 'rgba(168,85,247,0.2)',
    label: 'SYSTEM UPTIME',
    value: '99.9%',
    sub: 'Last 30 days',
    subColor: '#434750',
    hasArrow: false,
  },
]

export default function MetricsRow() {
  return (
    <div className={styles.row}>
      {METRICS.map(m => (
        <div key={m.id} className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.iconWrap} style={{ background: m.iconBg }}>
              <img src={m.icon} alt="" className={styles.icon} />
            </div>
            <div className={styles.cardLabel}>{m.label}</div>
          </div>
          <div className={styles.valueRow}>
            <div className={styles.value}>{m.value}</div>
            <div className={styles.sub} style={{ color: m.subColor }}>
              {m.hasArrow && <img src={iconArrowUp} alt="" className={styles.arrow} />}
              <span>{m.sub}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
