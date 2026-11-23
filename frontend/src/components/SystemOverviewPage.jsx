import React, { useState } from 'react'
import styles from './SystemOverviewPage.module.css'

// ── Metric icons ──────────────────────────────────────────────
import imgMetricDoctors       from '../assets/icons/admin/adm-metric-doctors.svg'
import imgMetricInstitutions  from '../assets/icons/admin/adm-metric-institutions.svg'
import imgMetricPharmacies    from '../assets/icons/admin/adm-metric-pharmacies.svg'
import imgArrowUp             from '../assets/icons/admin/adm-arrow-up.svg'

// ── Table icons ───────────────────────────────────────────────
import imgAdd                 from '../assets/icons/admin/adm-add.svg'
import imgSearch              from '../assets/icons/admin/adm-search.svg'
import imgFilter              from '../assets/icons/admin/adm-filter.svg'
import imgPharmacyIcon        from '../assets/icons/admin/adm-pharmacy-icon.svg'
import imgPhone               from '../assets/icons/admin/adm-phone.svg'
import imgDots                from '../assets/icons/admin/adm-dots.svg'

// ── Audit feed icons ──────────────────────────────────────────
import imgAuditDoctorIcon     from '../assets/icons/admin/adm-nav-staff.svg'
import imgAuditWarningIcon    from '../assets/icons/admin/adm-metric-warning.svg'
import imgAuditCheckIcon      from '../assets/icons/admin/adm-metric-uptime.svg'
import imgAuditPharmacyIcon   from '../assets/icons/admin/adm-pharmacy-icon.svg'
import imgPanelIcon           from '../assets/icons/admin/adm-api-icon.svg'

// ── TopAppBar icons (nodes 46:912, 46:926) ────────────────────
import imgBell                from '../assets/icons/header-bell.svg'
import imgSettingsIcon        from '../assets/icons/header-settings.svg'
import imgSearchBar           from '../assets/icons/header-search.svg'
import imgUserAvatar          from '../assets/images/user-profile-avatar.png'

// ── SideNav icons (nodes 46:941–46:961, 46:966) ──────────────
import imgNavLogo             from '../assets/icons/admin/adm-user-avatar.png'
import imgNavDashboard        from '../assets/icons/admin/adm-nav-dashboard.svg'
import imgNavPatients         from '../assets/icons/admin/adm-nav-patients.svg'
import imgNavLab              from '../assets/icons/admin/adm-nav-lab.svg'
import imgNavAppointments     from '../assets/icons/admin/adm-nav-appointments.svg'
import imgNavRecords          from '../assets/icons/admin/adm-nav-records.svg'
import imgNavSettings         from '../assets/icons/admin/adm-nav-settings.svg'

// node 46:926 — imgContainer15 = e2cd9.svg = adm-nav-staff.svg (user icon 16×20)
import imgAvatarIcon          from '../assets/icons/admin/adm-nav-staff.svg'

// ── Static data ───────────────────────────────────────────────
const METRICS = [
  { icon: imgMetricDoctors,      value: '1,248', label: 'Active Doctors',          change: '+12%', accent: 'rgba(0,38,87,0.05)'    },
  { icon: imgMetricInstitutions, value: '312',   label: 'Connected Institutions',  change: '+4%',  accent: 'rgba(59,130,246,0.05)' },
  { icon: imgMetricPharmacies,   value: '892',   label: 'Registered Pharmacies',   change: '+8%',  accent: 'rgba(0,106,97,0.05)'   },
]

const PHARMACY_ROWS = [
  { name: 'MediCare Plus',         id: 'PH-10042', phone: '+1 (555) 019-2834', status: 'active'   },
  { name: 'City Health Pharmacy',  id: 'PH-10087', phone: '+1 (555) 234-9812', status: 'pending'  },
  { name: 'Central Rx Connect',    id: 'PH-09921', phone: '+1 (555) 883-1120', status: 'active'   },
  { name: 'Downtown Apothecary',   id: 'PH-10105', phone: '+1 (555) 441-9002', status: 'inactive' },
]

const AUDIT_FEED = [
  { color: 'blue',  title: 'New Doctor Registered',  time: '10:42 AM', body: 'Dr. Sarah Jenkins completed onboarding for Westside Clinic.',       hasLine: true  },
  { color: 'amber', title: 'API Connection Alert',   time: '09:15 AM', body: 'High latency detected in Pharmacy Gateway connection.',               hasLine: true  },
  { color: 'green', title: 'System Update Applied',  time: 'Yesterday', body: 'Security patch v2.4.1 deployed successfully across all nodes.',      hasLine: true  },
  { color: 'teal',  title: 'Pharmacy Approved',      time: 'Yesterday', body: 'Admin JDoe approved documentation for City Health Pharmacy.',        hasLine: false },
]

const NAV_LINKS = [
  // node 46:941 — Dashboard (active = #006a61 + border #6bd8cb)
  { icon: imgNavDashboard,    label: 'Dashboard',       active: false, w: 18, h: 18  },
  // node 46:946 — Patients
  { icon: imgNavPatients,     label: 'Patients',         active: false, w: 22, h: 16  },
  // node 46:951 — Lab Results
  { icon: imgNavLab,          label: 'Lab Results',      active: false, w: 14, h: 19  },
  // node 46:957 — Appointments
  { icon: imgNavAppointments, label: 'Appointments',     active: false, w: 18, h: 20  },
  // node 46:961 — Medical Records
  { icon: imgNavRecords,      label: 'Medical Records',  active: true,  w: 19.5, h: 16 },
]

const STATUS_STYLES = {
  active:   { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  color: '#10b981', label: 'Active'              },
  pending:  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  color: '#f59e0b', label: 'Pending Verification' },
  inactive: { bg: '#e1e3e4',               border: '#c3c6d2',               color: '#434750', label: 'Inactive'            },
}

const AUDIT_COLORS = {
  blue:  { bg: 'rgba(0,38,87,0.1)',    icon: imgAuditDoctorIcon   },
  amber: { bg: 'rgba(245,158,11,0.1)', icon: imgAuditWarningIcon  },
  green: { bg: 'rgba(16,185,129,0.1)', icon: imgAuditCheckIcon    },
  teal:  { bg: 'rgba(0,106,97,0.1)',   icon: imgAuditPharmacyIcon },
}

export default function SystemOverviewPage() {
  const [search, setSearch] = useState('')

  const filtered = PHARMACY_ROWS.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.page}>

      {/* ── Side Nav ─────────────────────────────────────────── */}
      <aside className={styles.sideNav}>

        {/* Logo (node 47:1082 — 195×93px full-width image) */}
        <div className={styles.navLogoImgWrap}>
          <img src={imgNavLogo} alt="OneMed" className={styles.navLogoImg} />
        </div>

        {/* Nav links (nodes 46:941 → 46:961) */}
        <nav className={styles.navLinks}>
          {NAV_LINKS.map((link) => (
            <div
              key={link.label}
              className={`${styles.navLink} ${link.active ? styles.navLinkActive : ''}`}
            >
              <img
                src={link.icon}
                alt=""
                className={styles.navLinkIcon}
                style={{ width: link.w, height: link.h }}
              />
              <span className={styles.navLinkLabel}>{link.label}</span>
            </div>
          ))}
        </nav>

        {/* Settings (node 46:966) */}
        <div className={styles.navSettings}>
          <div className={styles.navLink}>
            <img src={imgNavSettings} alt="" className={styles.navLinkIcon} style={{ width: 20, height: 20 }} />
            <span className={styles.navLinkLabel}>Settings</span>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────── */}
      <div className={styles.main}>

        {/* Top App Bar (node 46:904) */}
        <header className={styles.topBar}>
          {/* Search — left */}
          <div className={styles.topBarSearch}>
            <img src={imgSearchBar} alt="" className={styles.topBarSearchIcon} />
            <input
              type="text"
              placeholder="Search system..."
              className={styles.topBarSearchInput}
            />
          </div>

          {/* Right cluster */}
          <div className={styles.topBarRight}>

            {/* Icons (node 46:912) — bell with green dot + settings */}
            <div className={styles.topBarIcons}>
              <button className={styles.topBarIconBtn}>
                <img src={imgBell} alt="" className={styles.topBarIcon} />
                <span className={styles.topBarBadge} />
              </button>
              <button className={styles.topBarIconBtn}>
                <img src={imgSettingsIcon} alt="" className={styles.topBarIcon} />
              </button>
            </div>

            {/* Divider */}
            <div className={styles.topBarDivider} />

            {/* User info + avatar (node 46:926) */}
            <div className={styles.topBarUser}>
              <div className={styles.topBarUserInfo}>
                <span className={styles.topBarUserName}>System Admin</span>
                <span className={styles.topBarUserRole}>Admin Level 5</span>
              </div>
              {/* Avatar (node 46:926) — bg #0b3b7c, icon 16×20px, NOT a photo */}
              <div className={styles.topBarAvatar}>
                <img src={imgAvatarIcon} alt="" className={styles.topBarAvatarIcon} />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className={styles.content}>

          {/* Page Header */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>System Overview</h1>
            <p className={styles.pageSubtitle}>Real-time metrics and network management.</p>
          </div>

          {/* Metrics Row */}
          <div className={styles.metricsRow}>
            {METRICS.map((m) => (
              <div key={m.label} className={styles.metricCard}>
                <div className={styles.metricCorner} style={{ background: m.accent }} />
                <div className={styles.metricTop}>
                  <img src={m.icon} alt="" className={styles.metricIcon} />
                  <div className={styles.metricChange}>
                    <img src={imgArrowUp} alt="" className={styles.metricArrow} />
                    <span className={styles.metricChangeText}>{m.change}</span>
                  </div>
                </div>
                <div className={styles.metricValue}>{m.value}</div>
                <div className={styles.metricLabel}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Main Grid */}
          <div className={styles.grid}>

            {/* ── Pharmacy Table (col span 2) ── */}
            <div className={styles.tableCard}>
              {/* Table header */}
              <div className={styles.tableHeader}>
                <div>
                  <h2 className={styles.tableTitle}>Pharmacy Management</h2>
                  <p className={styles.tableSubtitle}>Manage integrated pharmaceutical partners.</p>
                </div>
                <button className={styles.addBtn}>
                  <img src={imgAdd} alt="" className={styles.addBtnIcon} />
                  <span>Add New Pharmacy</span>
                </button>
              </div>

              {/* Filters bar */}
              <div className={styles.filtersBar}>
                <div className={styles.searchWrap}>
                  <img src={imgSearch} alt="" className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search pharmacies..."
                    className={styles.searchInput}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button className={styles.filterBtn}>
                  <img src={imgFilter} alt="" className={styles.filterIcon} />
                  <span>Filter</span>
                </button>
              </div>

              {/* Table */}
              <div className={styles.tableBody}>
                {/* Col headers */}
                <div className={styles.tableColHeader}>
                  <div className={styles.colPharmacy}>PHARMACY NAME</div>
                  <div className={styles.colContact}>CONTACT</div>
                  <div className={styles.colStatus}>STATUS</div>
                  <div className={styles.colActions}>ACTIONS</div>
                </div>

                {/* Rows */}
                {filtered.map((row, i) => {
                  const st = STATUS_STYLES[row.status]
                  return (
                    <div key={row.id} className={`${styles.tableRow} ${i > 0 ? styles.tableRowBorder : ''}`}>
                      <div className={styles.colPharmacy}>
                        <div className={styles.pharmacyCellIcon}>
                          <img src={imgPharmacyIcon} alt="" className={styles.pharmacyCellIconImg} />
                        </div>
                        <div className={styles.pharmacyCellInfo}>
                          <span className={styles.pharmacyCellName}>{row.name}</span>
                          <span className={styles.pharmacyCellId}>ID: {row.id}</span>
                        </div>
                      </div>
                      <div className={styles.colContact}>
                        <img src={imgPhone} alt="" className={styles.contactIcon} />
                        <span className={styles.contactText}>{row.phone}</span>
                      </div>
                      <div className={styles.colStatus}>
                        <span
                          className={styles.statusBadge}
                          style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </div>
                      <div className={styles.colActions}>
                        <button className={styles.actionDots}>
                          <img src={imgDots} alt="" className={styles.actionDotsIcon} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination footer */}
              <div className={styles.tableFooter}>
                <span className={styles.paginationText}>Showing 1 to 4 of 892 entries</span>
                <div className={styles.paginationBtns}>
                  <button className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>‹</button>
                  <button className={styles.pageBtn}>›</button>
                </div>
              </div>
            </div>

            {/* ── Audit Feed Panel ── */}
            <div className={styles.sidePanel}>
              {/* Panel header */}
              <div className={styles.panelHeader}>
                <img src={imgPanelIcon} alt="" className={styles.panelHeaderIcon} />
                <h3 className={styles.panelTitle}>Recent Audit Feed</h3>
              </div>

              {/* Feed items */}
              <div className={styles.feedList}>
                {AUDIT_FEED.map((item, i) => {
                  const col = AUDIT_COLORS[item.color]
                  return (
                    <div key={i} className={styles.feedItem}>
                      <div className={styles.feedIconWrap}>
                        <div
                          className={styles.feedIconCircle}
                          style={{ background: col.bg }}
                        >
                          <img src={col.icon} alt="" className={styles.feedIcon} />
                        </div>
                        {item.hasLine && <div className={styles.feedLine} />}
                      </div>
                      <div className={styles.feedCard}>
                        <div className={styles.feedCardTop}>
                          <span className={styles.feedCardTitle}>{item.title}</span>
                          <span className={styles.feedCardTime}>{item.time}</span>
                        </div>
                        <p className={styles.feedCardBody}>{item.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className={styles.panelFooter}>
                <button className={styles.viewLogBtn}>View Full Log</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
