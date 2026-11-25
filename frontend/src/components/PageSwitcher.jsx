import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './PageSwitcher.module.css'

const pages = [
  { to: '/prescription',      emoji: '📄', label: 'Prescription' },
  { to: '/admin',             emoji: '⚙️',  label: 'Admin'        },
  { to: '/system',            emoji: '🏥', label: 'System'       },
  { to: '/lab',               emoji: '🧪', label: 'Lab'          },
  { to: '/patient-analytics', emoji: '📊', label: 'Analytics'    },
  { to: '/pharmacy-order',    emoji: '💊', label: 'Pharmacy'     },
  { to: '/emergency',         emoji: '🚨', label: 'Emergency'    },
]

export default function PageSwitcher() {
  return (
    <nav className={styles.bar}>
      <div className={styles.track}>
        {pages.map(({ to, emoji, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.emoji}>{emoji}</span>
            <span className={styles.label}>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
