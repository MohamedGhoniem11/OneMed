import React, { useState } from 'react'
import styles from './LabIngestionPage.module.css'

// ── Assets ───────────────────────────────────────────────────
import imgLogo          from '../assets/icons/lab/lab-logo.png'
import imgDrAhmed       from '../assets/icons/lab/lab-dr-ahmed.png'
import imgSearchPatient from '../assets/icons/lab/lab-search-patient.svg'
import imgNoPatient     from '../assets/icons/lab/lab-no-patient.svg'
import imgUploadIcon    from '../assets/icons/lab/lab-upload-icon.svg'
import imgFileIcon      from '../assets/icons/lab/lab-file-icon.svg'
import imgCloseIcon     from '../assets/icons/lab/lab-close-icon.svg'
import imgWarningIcon   from '../assets/icons/lab/lab-warning-icon.svg'
import imgCheckIcon     from '../assets/icons/lab/lab-check-icon.svg'
import imgConfirmIcon   from '../assets/icons/lab/lab-confirm-icon.svg'
import imgSearchBar     from '../assets/icons/lab/lab-search-bar.svg'
import imgBell          from '../assets/icons/lab/lab-bell.svg'
import imgSettings      from '../assets/icons/lab/lab-settings.svg'
import imgNavDashboard  from '../assets/icons/lab/lab-nav-dashboard.svg'
import imgNavPatients   from '../assets/icons/lab/lab-nav-patients.svg'
import imgNavLab        from '../assets/icons/lab/lab-nav-lab.svg'
import imgNavAppt       from '../assets/icons/lab/lab-nav-appointments.svg'
import imgNavRecords    from '../assets/icons/lab/lab-nav-records.svg'
import imgNavSettings   from '../assets/icons/lab/lab-nav-settings.svg'

// ── Table data ────────────────────────────────────────────────
const TABLE_ROWS = [
  {
    id: 1, type: 'high',
    name: 'Hemoglobin (Hb)',
    value: '14.2', units: 'g/dL', refRange: '13.8 - 17.2',
    confidence: 99, confColor: '#10b981',
  },
  {
    id: 2, type: 'high',
    name: 'White Blood Cell\n(WBC)',
    value: '6.8', units: 'x10^3/uL', refRange: '4.5 - 11.0',
    confidence: 98, confColor: '#10b981',
  },
  {
    id: 3, type: 'low',
    name: 'Platelet Count',
    value: '150', units: 'x10^3/uL', refRange: '150 - 450',
    confidence: 64, confColor: '#f59e0b',
    editable: true,
  },
  {
    id: 4, type: 'low',
    name: 'Gluc0se, Fasting',
    value: '92', units: 'mg/dL', refRange: '70 - 99',
    confidence: 58, confColor: '#f59e0b',
    editableName: true,
  },
  {
    id: 5, type: 'high',
    name: 'Cholesterol, Total',
    value: '185', units: 'mg/dL', refRange: '< 200',
    confidence: 95, confColor: '#10b981',
  },
]

const NAV_ITEMS = [
  { icon: imgNavDashboard, label: 'Dashboard',      active: false, w: 18,   h: 18   },
  { icon: imgNavPatients,  label: 'Patients',        active: false, w: 22,   h: 16   },
  { icon: imgNavLab,       label: 'Lab Results',     active: true,  w: 14,   h: 19   },
  { icon: imgNavAppt,      label: 'Appointments',    active: false, w: 18,   h: 20   },
  { icon: imgNavRecords,   label: 'Medical Records', active: false, w: 19.5, h: 16   },
]

export default function LabIngestionPage() {
  const [activeTab, setActiveTab] = useState('upload')
  const [search, setSearch]       = useState('')
  const [globalSearch, setGlobalSearch] = useState('')

  return (
    <div className={styles.page}>

      {/* ── SideNav (node 44:210) ── */}
      <aside className={styles.sideNav}>
        {/* Logo (node 44:255) */}
        <div className={styles.logoWrap}>
          <img src={imgLogo} alt="OneMed" className={styles.logoImg} />
        </div>

        {/* Nav links (node 44:221) */}
        <nav className={styles.navLinks}>
          {NAV_ITEMS.map(item => (
            <div
              key={item.label}
              className={`${styles.navLink} ${item.active ? styles.navLinkActive : ''}`}
            >
              <img
                src={item.icon} alt=""
                className={styles.navIcon}
                style={{ width: item.w, height: item.h }}
              />
              <span className={styles.navLabel}>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Settings (node 44:247) */}
        <div className={styles.navSettings}>
          <div className={styles.navLink}>
            <img src={imgNavSettings} alt="" className={styles.navIcon} style={{ width: 20.1, height: 20 }} />
            <span className={styles.navLabel}>Settings</span>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className={styles.main}>

        {/* TopAppBar (node 44:190) */}
        <header className={styles.topBar}>
          {/* Left: brand name (node 44:191) */}
          <div className={styles.topBarBrand}>OneMed Healthcare</div>

          {/* Right (node 44:193) */}
          <div className={styles.topBarRight}>
            {/* Search (node 44:194) */}
            <div className={styles.topBarSearchWrap}>
              <img src={imgSearchBar} alt="" className={styles.topBarSearchIcon} />
              <input
                className={styles.topBarSearchInput}
                placeholder="Global Search..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
              />
            </div>
            {/* Icons + avatar (node 44:200, 44:207) */}
            <div className={styles.topBarIcons}>
              <button className={styles.topBarIconBtn}>
                <img src={imgBell} alt="" style={{ width: 16, height: 20 }} />
              </button>
              <button className={styles.topBarIconBtn}>
                <img src={imgSettings} alt="" style={{ width: 20, height: 20 }} />
              </button>
              <div className={styles.topBarAvatar}>
                <img src={imgDrAhmed} alt="Dr. Ahmed Mansour" className={styles.topBarAvatarImg} />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className={styles.content}>
          <div className={styles.workspace}>

            {/* Page Header (node 44:14) */}
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Lab Data Ingestion</h1>
              <p className={styles.pageSubtitle}>
                Upload physical lab reports or import batch datasets. System will automatically parse{' '}
                key markers and highlight unverified entries.
              </p>
            </div>

            {/* Workspace Layout (node 44:20) */}
            <div className={styles.workspaceLayout}>

              {/* ── Left Column (node 44:21) ── */}
              <div className={styles.leftCol}>

                {/* Patient Context Card (node 44:22) */}
                <div className={styles.patientCard}>
                  <div className={styles.patientCardGradient} />
                  <label className={styles.patientLabel}>TARGET PATIENT CONTEXT</label>
                  <div className={styles.patientSearchWrap}>
                    <img src={imgSearchPatient} alt="" className={styles.patientSearchIcon} />
                    <input
                      className={styles.patientSearchInput}
                      placeholder="Search Patient ID, Name, or DOB..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <div className={styles.noPatientRow}>
                    <div className={styles.noPatientAvatar}>
                      <img src={imgNoPatient} alt="" className={styles.noPatientAvatarIcon} />
                    </div>
                    <p className={styles.noPatientText}>
                      No patient selected. Search to{'\n'}link incoming data.
                    </p>
                  </div>
                </div>

                {/* Ingestion Tabs & Dropzone (node 44:40) */}
                <div className={styles.ingestionCard}>
                  {/* Tabs */}
                  <div className={styles.tabs}>
                    <button
                      className={`${styles.tab} ${activeTab === 'upload' ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab('upload')}
                    >File Upload</button>
                    <button
                      className={`${styles.tab} ${activeTab === 'batch' ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab('batch')}
                    >Batch{'\n'}Import</button>
                    <button
                      className={`${styles.tab} ${activeTab === 'manual' ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab('manual')}
                    >Manual{'\n'}Entry</button>
                  </div>

                  {/* Dropzone */}
                  <div className={styles.dropzoneArea}>
                    <div className={styles.dropzone}>
                      <div className={styles.dropzoneIconWrap}>
                        <div className={styles.dropzoneIconCircle}>
                          <img src={imgUploadIcon} alt="" className={styles.dropzoneIcon} />
                        </div>
                      </div>
                      <h4 className={styles.dropzoneTitle}>Drag &amp; Drop Lab Report</h4>
                      <p className={styles.dropzoneDesc}>
                        Supports PDF, JPG, PNG, or{'\n'}HL7 formats up to 50MB.
                      </p>
                      <button className={styles.browseBtn}>Browse Files</button>
                    </div>

                    {/* Uploaded file row */}
                    <div className={styles.fileRow}>
                      <div className={styles.fileIcon}>
                        <img src={imgFileIcon} alt="" className={styles.fileIconImg} />
                      </div>
                      <div className={styles.fileInfo}>
                        <span className={styles.fileName}>Smith_BloodPanel_Q3.pdf</span>
                        <span className={styles.fileMeta}>2.4 MB • Processing{'\n'}Complete</span>
                      </div>
                      <button className={styles.fileCloseBtn}>
                        <img src={imgCloseIcon} alt="" className={styles.fileCloseIcon} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Right Column (node 44:73) ── */}
              <div className={styles.rightCol}>
                <div className={styles.verifyCard}>

                  {/* Table Header (node 44:75) */}
                  <div className={styles.verifyHeader}>
                    <div>
                      <h3 className={styles.verifyTitle}>Data Verification</h3>
                      <p className={styles.verifySubtitle}>
                        Review OCR parsed results. Amber highlights require manual{'\n'}confirmation.
                      </p>
                    </div>
                    <div className={styles.unverifiedBadge}>
                      <img src={imgWarningIcon} alt="" className={styles.unverifiedIcon} />
                      <span className={styles.unverifiedText}>2{'\n'}Unverified</span>
                    </div>
                  </div>

                  {/* Table (node 44:86) */}
                  <div className={styles.tableWrap}>
                    {/* Col header (node 44:87) — 58px spacer then 5 columns */}
                    <div className={styles.colHeader}>
                      <div className={styles.colHeaderCell} style={{ width: 178 }}>Test Name</div>
                      <div className={styles.colHeaderCell} style={{ width: 112 }}>Value</div>
                      <div className={styles.colHeaderCell} style={{ width: 90 }}>Units</div>
                      <div className={styles.colHeaderCellRight} style={{ width: 84 }}>{'Ref.\nRange'}</div>
                      <div className={styles.colHeaderCellEnd}>Confidence</div>
                    </div>

                    {/* Rows */}
                    {TABLE_ROWS.map((row, i) => (
                      <div
                        key={row.id}
                        className={`${styles.tableRow} ${row.type === 'low' ? styles.tableRowAmber : ''} ${i > 0 ? styles.tableRowBorder : ''}`}
                      >
                        {/* Indicator cell (border-left colored) */}
                        <div
                          className={styles.indicatorCell}
                          style={{ borderLeftColor: row.type === 'low' ? '#f59e0b' : '#10b981' }}
                        >
                          <div
                            className={styles.indicatorIcon}
                            style={{ background: row.type === 'low' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.1)' }}
                          >
                            <img
                              src={row.type === 'low' ? imgWarningIcon : imgCheckIcon}
                              alt=""
                              className={row.type === 'low' ? styles.indicatorWarnImg : styles.indicatorCheckImg}
                            />
                          </div>
                        </div>

                        {/* Test Name */}
                        {row.editableName ? (
                          <div className={styles.nameCellEditable}>
                            <input className={styles.cellInputName} defaultValue={row.name} />
                          </div>
                        ) : (
                          <div className={styles.nameCell}>
                            <span className={styles.cellName}>{row.name}</span>
                          </div>
                        )}

                        {/* Value */}
                        {row.editable ? (
                          <div className={styles.valueCellEditable}>
                            <input className={styles.cellInput} defaultValue={row.value} />
                          </div>
                        ) : (
                          <div className={styles.valueCell}>
                            <span className={styles.cellValue}>{row.value}</span>
                          </div>
                        )}

                        {/* Units */}
                        <div className={styles.unitsCell}>
                          <span className={styles.cellUnits}>{row.units}</span>
                        </div>

                        {/* Ref Range */}
                        <div className={styles.refCell}>
                          {row.refRange.split(' - ').length > 1 ? (
                            <>
                              <span className={styles.cellRef}>{row.refRange.split(' - ')[0]} -</span>
                              <span className={styles.cellRef}>{row.refRange.split(' - ')[1]}</span>
                            </>
                          ) : (
                            <span className={styles.cellRef}>{row.refRange}</span>
                          )}
                        </div>

                        {/* Confidence */}
                        <div className={styles.confCell}>
                          <span style={{ color: row.confColor }} className={styles.cellConf}>
                            {row.confidence}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Action Area (node 44:182) */}
                  <div className={styles.footerArea}>
                    <button className={styles.clearBtn}>Clear Data</button>
                    <button className={styles.confirmBtn}>
                      <img src={imgConfirmIcon} alt="" className={styles.confirmIcon} />
                      Confirm &amp; Link to Patient
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
