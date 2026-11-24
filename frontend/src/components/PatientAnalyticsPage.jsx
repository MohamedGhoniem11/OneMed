import React from 'react'
import styles from './PatientAnalyticsPage.module.css'

// ── Assets ─────────────────────────────────────────────────────
import imgLogo            from '../assets/icons/analytics/pa-logo.png'
import imgBmiIcon         from '../assets/icons/analytics/pa-bmi-icon.svg'
import imgBmiArrow        from '../assets/icons/analytics/pa-bmi-arrow.svg'
import imgBmiCorner       from '../assets/icons/analytics/pa-bmi-corner.svg'
import imgHba1cIcon       from '../assets/icons/analytics/pa-hba1c-icon.svg'
import imgHba1cArrow      from '../assets/icons/analytics/pa-hba1c-arrow.svg'
import imgHba1cCorner     from '../assets/icons/analytics/pa-hba1c-corner.svg'
import imgEgfrIcon        from '../assets/icons/analytics/pa-egfr-icon.svg'
import imgEgfrDash        from '../assets/icons/analytics/pa-egfr-dash.svg'
import imgEgfrCorner      from '../assets/icons/analytics/pa-egfr-corner.svg'
import imgCrpIcon         from '../assets/icons/analytics/pa-crp-icon.svg'
import imgCrpCorner       from '../assets/icons/analytics/pa-crp-corner.svg'
import imgSystolicLine    from '../assets/icons/analytics/pa-systolic-line.svg'
import imgDiastolicLine   from '../assets/icons/analytics/pa-diastolic-line.svg'
import imgDotsBtn         from '../assets/icons/analytics/pa-dots-btn.svg'
import imgAddIcon         from '../assets/icons/analytics/pa-add-icon.svg'
import imgCheckmark       from '../assets/icons/analytics/pa-checkmark.svg'
import imgSearchIcon      from '../assets/icons/analytics/pa-search-icon.svg'
import imgBellIcon        from '../assets/icons/analytics/pa-bell-icon.svg'
import imgSettingsIcon    from '../assets/icons/analytics/pa-settings-icon.svg'
import imgNavDashboard    from '../assets/icons/analytics/pa-nav-dashboard.svg'
import imgNavPatients     from '../assets/icons/analytics/pa-nav-patients.svg'
import imgNavPrescriptions from '../assets/icons/analytics/pa-nav-prescriptions.svg'
import imgNavMessages     from '../assets/icons/analytics/pa-nav-messages.svg'
import imgNavScanner      from '../assets/icons/analytics/pa-nav-scanner.svg'
import imgNavSettings     from '../assets/icons/analytics/pa-nav-settings.svg'
import imgNavHelp         from '../assets/icons/analytics/pa-nav-help.svg'
import imgNavLogout       from '../assets/icons/analytics/pa-nav-logout.svg'

// ── Sub-components ──────────────────────────────────────────────

function SideNav() {
  return (
    <nav className={styles.sideNav}>
      {/* Logo */}
      <img src={imgLogo} alt="OneMed" className={styles.sideNavLogo} />

      {/* Nav links */}
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <img src={imgNavDashboard} alt="" className={styles.navIcon} style={{ width: '16.5px', height: '16.5px' }} />
          <span className={styles.navLabel}>Dashboard</span>
        </li>
        <li className={`${styles.navItem} ${styles.navItemActive}`}>
          <img src={imgNavPatients} alt="" className={styles.navIcon} style={{ width: '20.167px', height: '14.667px' }} />
          <span className={styles.navLabelActive}>Patients</span>
        </li>
        <li className={styles.navItem}>
          <img src={imgNavPrescriptions} alt="" className={styles.navIcon} style={{ width: '18.333px', height: '18.333px' }} />
          <span className={styles.navLabel}>Prescriptions</span>
        </li>
        <li className={styles.navItem}>
          <img src={imgNavMessages} alt="" className={styles.navIcon} style={{ width: '18.333px', height: '18.333px' }} />
          <span className={styles.navLabel}>Messages</span>
          <span className={styles.navBadge}>3</span>
        </li>
        <li className={styles.navItem}>
          <img src={imgNavScanner} alt="" className={styles.navIcon} style={{ width: '18.333px', height: '18.333px' }} />
          <span className={styles.navLabel}>Scanner Tools</span>
        </li>
        <li className={styles.navItem}>
          <img src={imgNavSettings} alt="" className={styles.navIcon} style={{ width: '18.425px', height: '18.333px' }} />
          <span className={styles.navLabel}>Settings</span>
        </li>
      </ul>

      {/* Footer */}
      <div className={styles.navFooter}>
        <button className={styles.navFooterItem}>
          <img src={imgNavHelp} alt="" style={{ width: '15px', height: '15px' }} />
          <span className={styles.navFooterLabel}>Help Center</span>
        </button>
        <button className={styles.navFooterItem}>
          <img src={imgNavLogout} alt="" style={{ width: '13.5px', height: '13.5px' }} />
          <span className={styles.navFooterLabel}>Logout</span>
        </button>
      </div>
    </nav>
  )
}

function TopAppBar() {
  return (
    <header className={styles.topBar}>
      {/* Search */}
      <div className={styles.searchWrap}>
        <img src={imgSearchIcon} alt="" className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search patient records..."
        />
      </div>

      {/* Right side */}
      <div className={styles.topBarRight}>
        {/* Nav tabs */}
        <nav className={styles.topTabs}>
          <span className={styles.topTab}>Overview</span>
          <span className={`${styles.topTab} ${styles.topTabActive}`}>Analytics</span>
          <span className={styles.topTab}>Reports</span>
        </nav>

        {/* Divider */}
        <div className={styles.topBarDivider} />

        {/* Icons */}
        <div className={styles.topBarIcons}>
          <img src={imgBellIcon} alt="Notifications" style={{ width: '16px', height: '20px' }} />
          <img src={imgSettingsIcon} alt="Settings" style={{ width: '20px', height: '20px' }} />
        </div>
      </div>
    </header>
  )
}

function HealthCards() {
  return (
    <div className={styles.healthCards}>

      {/* BMI */}
      <div className={styles.healthCard}>
        <img src={imgBmiCorner} alt="" className={styles.cardCorner} style={{ width: '77px', height: '83px' }} />
        <div className={styles.cardLabelRow}>
          <span className={styles.cardLabel}>BMI</span>
          <span className={styles.cardIconCircle} style={{ background: 'rgba(245,158,11,0.1)' }}>
            <img src={imgBmiIcon} alt="" style={{ width: '12.833px', height: '11.083px' }} />
          </span>
        </div>
        <div className={styles.cardValue}>
          27.4
        </div>
        <div className={styles.cardTrend}>
          <img src={imgBmiArrow} alt="" style={{ width: '8px', height: '8px' }} />
          <span className={styles.cardTrendValue} style={{ color: '#f59e0b' }}>0.5</span>
          <span className={styles.cardTrendNote}>Overweight range</span>
        </div>
        <div className={styles.triProgressTrack}>
          <div className={styles.triSeg} style={{ background: '#10b981' }} />
          <div className={styles.triSeg} style={{ background: '#f59e0b' }} />
          <div className={styles.triSeg} style={{ background: '#ef4444' }} />
        </div>
      </div>

      {/* HBA1C */}
      <div className={styles.healthCard}>
        <img src={imgHba1cCorner} alt="" className={styles.cardCorner} style={{ width: '82px', height: '83.875px' }} />
        <div className={styles.cardLabelRow}>
          <span className={styles.cardLabel}>HBA1C</span>
          <span className={styles.cardIconCircle} style={{ background: 'rgba(16,185,129,0.1)' }}>
            <img src={imgHba1cIcon} alt="" style={{ width: '11.667px', height: '11.667px' }} />
          </span>
        </div>
        <div className={styles.cardValue}>
          5.8<span className={styles.cardUnit}>%</span>
        </div>
        <div className={styles.cardTrend}>
          <img src={imgHba1cArrow} alt="" style={{ width: '8px', height: '8px' }} />
          <span className={styles.cardTrendValue} style={{ color: '#10b981' }}>0.2%</span>
          <span className={styles.cardTrendNote}>vs last 3 months</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: '58%', background: '#10b981' }} />
        </div>
      </div>

      {/* EGFR */}
      <div className={styles.healthCard}>
        <img src={imgEgfrCorner} alt="" className={styles.cardCorner} style={{ width: '72px', height: '88px' }} />
        <div className={styles.cardLabelRow}>
          <span className={styles.cardLabel}>EGFR</span>
          <span className={styles.cardIconCircle} style={{ background: 'rgba(59,130,246,0.1)' }}>
            <img src={imgEgfrIcon} alt="" style={{ width: '10.533px', height: '10.5px' }} />
          </span>
        </div>
        <div className={styles.cardValue}>
          92<span className={styles.cardUnit}>mL/min</span>
        </div>
        <div className={styles.cardTrend}>
          <img src={imgEgfrDash} alt="" style={{ width: '8px', height: '1px' }} />
          <span className={styles.cardTrendValue} style={{ color: '#434750' }}>Stable</span>
          <span className={styles.cardTrendNote}>Normal kidney function</span>
        </div>
      </div>

      {/* CRP ALERT */}
      <div className={`${styles.healthCard} ${styles.healthCardAlert}`}>
        <img src={imgCrpCorner} alt="" className={styles.cardCorner} style={{ width: '82px', height: '88px' }} />
        <div className={styles.cardLabelRow}>
          <span className={`${styles.cardLabel} ${styles.cardLabelAlert}`}>ALERT: CRP HIGH</span>
          <span className={styles.cardIconCircle} style={{ background: 'rgba(239,68,68,0.1)' }}>
            <img src={imgCrpIcon} alt="" style={{ width: '11.667px', height: '11.667px' }} />
          </span>
        </div>
        <div className={styles.cardValue}>
          12.4<span className={styles.cardUnit}>mg/L</span>
        </div>
        <p className={styles.cardAlertText}>
          Elevated inflammation markers detected in recent panel (Oct 24).
        </p>
      </div>

    </div>
  )
}

function BloodPressureChart() {
  const yLabels = ['160', '140', '120', '100', '80', '60']
  const xLabels = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']

  return (
    <div className={styles.bpChart}>
      {/* Header */}
      <div className={styles.chartHeader}>
        <div>
          <h3 className={styles.chartTitle}>Blood Pressure Trends</h3>
          <p className={styles.chartSubtitle}>Systolic vs Diastolic (6 Months)</p>
        </div>
        <div className={styles.bpLegend}>
          <span className={styles.legendDot} style={{ background: '#006a61' }} />
          <span className={styles.legendLabel}>Systolic</span>
          <span className={styles.legendDot} style={{ background: '#6bd8cb' }} />
          <span className={styles.legendLabel}>Diastolic</span>
        </div>
      </div>

      {/* Chart body */}
      <div className={styles.chartArea}>
        {/* Y-axis */}
        <div className={styles.yAxis}>
          {yLabels.map(l => (
            <span key={l} className={styles.yLabel}>{l}</span>
          ))}
        </div>

        {/* Plot area */}
        <div className={styles.plotArea}>
          {/* Normal range shading */}
          <div className={styles.normalRange}>
            <span className={styles.normalRangeLabel}>Target Range</span>
          </div>

          {/* Grid lines */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className={styles.gridLine} style={{ top: `${(i + 1) * (100 / 6)}%` }} />
          ))}

          {/* Chart lines */}
          <div className={styles.chartLines}>
            <img src={imgSystolicLine}  alt="Systolic"  className={styles.chartLineImg} />
            <img src={imgDiastolicLine} alt="Diastolic" className={styles.chartLineImg} />
          </div>

          {/* X-axis */}
          <div className={styles.xAxis}>
            {xLabels.map(l => (
              <span key={l} className={styles.xLabel}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LipidPanel() {
  const bars = [
    { label: 'Total Chol',    value: '210 mg/dL', color: '#f59e0b', fill: '85%' },
    { label: 'LDL (Bad)',     value: '135 mg/dL', color: '#ef4444', fill: '90%' },
    { label: 'HDL (Good)',    value: '55 mg/dL',  color: '#10b981', fill: '55%' },
    { label: 'Triglycerides', value: '140 mg/dL', color: '#191c1d', fill: '60%', fillColor: '#6bd8cb' },
  ]

  return (
    <div className={styles.lipidPanel}>
      {/* Header */}
      <div className={styles.lipidHeader}>
        <div>
          <h3 className={styles.chartTitle}>Lipid Panel</h3>
          <p className={styles.chartSubtitle}>Latest Result: Oct 15</p>
        </div>
        <button className={styles.dotsBtn}>
          <img src={imgDotsBtn} alt="More options" style={{ width: '2.333px', height: '9.333px' }} />
        </button>
      </div>

      {/* Bars */}
      <div className={styles.lipidBars}>
        {bars.map(({ label, value, color, fill, fillColor }) => (
          <div key={label} className={styles.lipidBarRow}>
            <div className={styles.lipidBarMeta}>
              <span className={styles.lipidBarLabel}>{label}</span>
              <span className={styles.lipidBarValue} style={{ color }}>{value}</span>
            </div>
            <div className={styles.lipidBarTrack}>
              <div
                className={styles.lipidBarFill}
                style={{ width: fill, background: fillColor || color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MedicationTimeline() {
  return (
    <div className={styles.medTimeline}>
      {/* Header */}
      <div className={styles.medTimelineHeader}>
        <div>
          <h3 className={styles.chartTitle}>Active Medication Timeline</h3>
          <p className={styles.chartSubtitle}>Current regimens and adherence</p>
        </div>
        <button className={styles.addMedBtn}>
          <img src={imgAddIcon} alt="" style={{ width: '8.167px', height: '8.167px' }} />
          ADD MEDICATION
        </button>
      </div>

      {/* Table */}
      <div className={styles.medTable}>
        {/* Column headers */}
        <div className={styles.medTableHead}>
          <div className={styles.medTableMedCol}>Medication</div>
          <div className={styles.medTableMonths}>
            {['Jul', 'Aug', 'Sep', 'Oct', 'Nov (Current)', 'Dec'].map(m => (
              <span key={m} className={styles.medTableMonth}>{m}</span>
            ))}
          </div>
        </div>

        {/* Row 1 — Lisinopril */}
        <div className={styles.medRow}>
          <div className={styles.medRowInfo}>
            <span className={styles.medName}>Lisinopril</span>
            <span className={styles.medDose}>10mg • Daily</span>
          </div>
          <div className={styles.medRowTrack}>
            <div className={styles.medBarTrack}>
              <div
                className={styles.medBar}
                style={{ background: 'rgba(59,130,246,0.8)', width: '100%', gridColumnStart: 1, gridColumnEnd: 7 }}
              >
                <span className={styles.medBarText}>Ongoing (Adherence: 95%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — Atorvastatin */}
        <div className={styles.medRow}>
          <div className={styles.medRowInfo}>
            <span className={styles.medName}>Atorvastatin</span>
            <span className={styles.medDose}>20mg • Evening</span>
          </div>
          <div className={styles.medRowTrack}>
            <div className={styles.medBarTrack}>
              <div className={styles.medBarSpacer} style={{ flex: '1 0 0' }} />
              <div
                className={styles.medBar}
                style={{ background: 'rgba(0,106,97,0.8)', flex: '3 0 0' }}
              >
                <span className={styles.medBarText}>Started Aug 15</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3 — Amoxicillin */}
        <div className={styles.medRow}>
          <div className={styles.medRowInfo}>
            <span className={styles.medName}>Amoxicillin</span>
            <span className={styles.medDose}>500mg • Complete</span>
          </div>
          <div className={styles.medRowTrack}>
            <div className={styles.medBarTrack}>
              <div className={styles.medBarSpacer} style={{ flex: '3 0 0' }} />
              <div
                className={styles.medBar}
                style={{ background: 'rgba(116,119,129,0.5)', flex: '1 0 0' }}
              >
                <img src={imgCheckmark} alt="Complete" className={styles.medBarCheck} />
              </div>
              <div className={styles.medBarSpacer} style={{ flex: '2 0 0' }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────

export default function PatientAnalyticsPage() {
  return (
    <div className={styles.page}>
      <SideNav />

      <div className={styles.mainColumn}>
        <TopAppBar />

        <div className={styles.mainContent}>
          {/* Page header */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Patient Analytics</h1>
            <p className={styles.pageSubtitle}>
              Comprehensive health data visualization for Doe, John (ID: 84729)
            </p>
          </div>

          {/* Health trend indicators */}
          <HealthCards />

          {/* Charts row */}
          <div className={styles.chartsGrid}>
            <BloodPressureChart />
            <LipidPanel />
          </div>

          {/* Medication timeline */}
          <MedicationTimeline />
        </div>
      </div>
    </div>
  )
}
