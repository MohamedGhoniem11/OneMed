import React from 'react'
import styles from './MedicalRecordPage.module.css'

// ── Assets ───────────────────────────────────────────────────
import imgPatientPhoto   from '../assets/icons/records/rec-patient-photo.png'
import imgLogo           from '../assets/icons/records/rec-logo.png'
import imgVerified       from '../assets/icons/records/rec-verified-badge.svg'
import imgAgeIcon        from '../assets/icons/records/rec-age-icon.svg'
import imgBloodIcon      from '../assets/icons/records/rec-blood-icon.svg'
import imgWeightIcon     from '../assets/icons/records/rec-weight-icon.svg'
import imgPrintIcon      from '../assets/icons/records/rec-print-icon.svg'
import imgConsultIcon    from '../assets/icons/records/rec-new-consult-icon.svg'
import imgTimelineIcon   from '../assets/icons/records/rec-timeline-icon.svg'
import imgLabIcon        from '../assets/icons/records/rec-lab-icon.svg'
import imgExpandIcon     from '../assets/icons/records/rec-expand-icon.svg'
import imgHighFlag       from '../assets/icons/records/rec-high-flag.svg'
import imgLocIcon        from '../assets/icons/records/rec-loc-icon.svg'
import imgDoctorIcon     from '../assets/icons/records/rec-doctor-icon.svg'
import imgMedIcon        from '../assets/icons/records/rec-med-icon1.svg'
import imgAllergyIcon    from '../assets/icons/records/rec-allergy-icon.svg'
import imgPillIcon       from '../assets/icons/records/rec-pill-icon.svg'
import imgVitalsIcon     from '../assets/icons/records/rec-vitals-icon.svg'
import imgRefillIcon     from '../assets/icons/records/rec-refill-icon.svg'
import imgContactIcon    from '../assets/icons/records/rec-contact-icon.svg'
import imgCallIcon       from '../assets/icons/records/rec-call-icon.svg'
import imgNavDashboard   from '../assets/icons/records/rec-nav-dashboard.svg'
import imgNavPatients    from '../assets/icons/records/rec-nav-patients.svg'
import imgNavPrescr      from '../assets/icons/records/rec-nav-prescriptions.svg'
import imgNavMessages    from '../assets/icons/records/rec-nav-messages.svg'
import imgNavScanner     from '../assets/icons/records/rec-nav-scanner.svg'
import imgNavSettings    from '../assets/icons/records/rec-nav-settings.svg'
import imgNavHelp        from '../assets/icons/records/rec-nav-help.svg'
import imgNavLogout      from '../assets/icons/records/rec-nav-logout.svg'

export default function MedicalRecordPage() {
  return (
    <div className={styles.page}>

      {/* ── SideNav (node 1:2488) ── */}
      <aside className={styles.sideNav}>
        {/* Logo (node 44:261) */}
        <div className={styles.logoWrap}>
          <img src={imgLogo} alt="OneMed" className={styles.logoImg} />
        </div>

        {/* Nav links (node 1:2500) */}
        <nav className={styles.navLinks}>
          {/* Dashboard */}
          <div className={styles.navItem}>
            <img src={imgNavDashboard} alt="" className={styles.navIcon} style={{width:16.5,height:16.5}} />
            <span className={styles.navLabel}>Dashboard</span>
          </div>
          {/* Patients — ACTIVE */}
          <div className={`${styles.navItem} ${styles.navItemActive}`}>
            <div className={styles.navItemActiveBg} />
            <img src={imgNavPatients} alt="" className={styles.navIcon} style={{width:20.167,height:14.667}} />
            <span className={`${styles.navLabel} ${styles.navLabelActive}`}>Patients</span>
          </div>
          {/* Prescriptions */}
          <div className={styles.navItem}>
            <img src={imgNavPrescr} alt="" className={styles.navIcon} style={{width:18.333,height:18.333}} />
            <span className={styles.navLabel}>Prescriptions</span>
          </div>
          {/* Messages + badge */}
          <div className={styles.navItem}>
            <img src={imgNavMessages} alt="" className={styles.navIcon} style={{width:18.333,height:18.333}} />
            <span className={`${styles.navLabel} ${styles.navLabelFlex}`}>Messages</span>
            <span className={styles.navBadge}>3</span>
          </div>
          {/* Scanner Tools */}
          <div className={styles.navItem}>
            <img src={imgNavScanner} alt="" className={styles.navIcon} style={{width:18.333,height:18.333}} />
            <span className={styles.navLabel}>Scanner Tools</span>
          </div>
          {/* Settings */}
          <div className={styles.navItem}>
            <img src={imgNavSettings} alt="" className={styles.navIcon} style={{width:18.425,height:18.333}} />
            <span className={styles.navLabel}>Settings</span>
          </div>
        </nav>

        {/* CTA spacer */}
        <div className={styles.navCta} />

        {/* Footer links (node 1:2538) */}
        <div className={styles.navFooter}>
          <div className={styles.navFooterItem}>
            <img src={imgNavHelp} alt="" style={{width:15,height:15,filter:'brightness(0) invert(1)',opacity:0.6}} />
            <span className={styles.navFooterLabel}>Help Center</span>
          </div>
          <div className={styles.navFooterItem}>
            <img src={imgNavLogout} alt="" style={{width:13.5,height:13.5,filter:'brightness(0) invert(1)',opacity:0.6}} />
            <span className={styles.navFooterLabel}>Logout</span>
          </div>
        </div>
      </aside>

      {/* ── Main workspace ── */}
      <div className={styles.main}>

        {/* TopAppBar (node 1:2186) */}
        <header className={styles.topBar}>
          {/* Patient demographics (node 1:2188) */}
          <div className={styles.patientAnchor}>
            {/* Avatar (node 1:2189) */}
            <div className={styles.avatarWrap}>
              <img src={imgPatientPhoto} alt="Ahmed El-Sayed" className={styles.avatarImg} />
              <div className={styles.avatarBadge}>
                <img src={imgVerified} alt="" className={styles.avatarBadgeIcon} />
              </div>
            </div>

            {/* Info (node 1:2193) */}
            <div className={styles.patientInfo}>
              <div className={styles.patientNameRow}>
                <span className={styles.patientName}>Ahmed El-Sayed</span>
                <span className={styles.patientId}>ID: 29012010101234</span>
              </div>
              <div className={styles.patientMeta}>
                <span className={styles.metaItem}>
                  <img src={imgAgeIcon} alt="" className={styles.metaIcon} />
                  <span>45 yrs, Male</span>
                </span>
                <span className={styles.metaDot} />
                <span className={styles.metaItem}>
                  <img src={imgBloodIcon} alt="" className={styles.metaIcon} />
                  <span className={styles.metaBlood}>Blood: O+</span>
                </span>
                <span className={styles.metaDot} />
                <span className={styles.metaItem}>
                  <img src={imgWeightIcon} alt="" className={styles.metaIcon} />
                  <span>82 kg / 178 cm</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actions (node 1:2213) */}
          <div className={styles.topBarActions}>
            <button className={styles.bellBtn}>
              <img src={imgAllergyIcon} alt="" style={{width:16,height:20}} />
              <span className={styles.bellDot} />
            </button>
            <div className={styles.topBarDivider} />
            <button className={styles.printBtn}>
              <img src={imgPrintIcon} alt="" style={{width:16.667,height:15}} />
              <span>Print Record</span>
            </button>
            <button className={styles.consultBtn}>
              <img src={imgConsultIcon} alt="" style={{width:16.667,height:16.667}} />
              <span>New Consultation</span>
            </button>
          </div>
        </header>

        {/* Main content area (node 1:2228) */}
        <div className={styles.content}>
          <div className={styles.grid}>

            {/* ── Left Panel: Clinical Timeline (col 1-8, node 1:2230) ── */}
            <div className={styles.leftPanel}>
              {/* Timeline header (node 1:2231) */}
              <div className={styles.timelineHeader}>
                <div className={styles.timelineHeaderLeft}>
                  <img src={imgTimelineIcon} alt="" style={{width:18,height:18}} />
                  <h3 className={styles.timelineTitle}>Clinical Timeline</h3>
                </div>
                <div className={styles.timelineFilters}>
                  <button className={`${styles.filterBtn} ${styles.filterBtnActive}`}>All</button>
                  <button className={styles.filterBtn}><span className={styles.filterDot} style={{background:'#002657'}} />Lab</button>
                  <button className={styles.filterBtn}><span className={styles.filterDot} style={{background:'#006a61'}} />Rx</button>
                  <button className={styles.filterBtn}><span className={styles.filterDot} style={{background:'#9333ea'}} />IMG</button>
                </div>
              </div>

              {/* Timeline scrollable (node 1:2249) */}
              <div className={styles.timelineScroll}>
                <div className={styles.timelineItems}>
                  {/* Vertical line */}
                  <div className={styles.timelineVLine} />

                  {/* Item 1: Lab Results (node 1:2252) */}
                  <div className={styles.timelineItem}>
                    <div className={`${styles.timelineNode} ${styles.timelineNodeLab}`}>
                      <span className={`${styles.timelineNodeDot} ${styles.timelineNodeDotLab}`} />
                    </div>
                    <div className={styles.timelineCard}>
                      <div className={styles.timelineCardHeader}>
                        <div className={styles.timelineCardMeta}>
                          <span className={`${styles.typeBadge} ${styles.typeBadgeLab}`}>LAB RESULTS</span>
                          <span className={styles.timelineDate}>Today, 09:30 AM</span>
                        </div>
                        <button className={styles.expandBtn}>
                          <img src={imgExpandIcon} alt="" style={{width:18.333,height:12.5}} />
                        </button>
                      </div>
                      <h4 className={styles.timelineCardTitle}>Comprehensive Metabolic Panel (CMP)</h4>
                      <div className={styles.timelineCardLoc}>
                        <img src={imgLocIcon} alt="" style={{width:12,height:12}} />
                        <span>Cairo Central Lab</span>
                      </div>
                      {/* Lab results mini table */}
                      <div className={styles.labTable}>
                        <div className={styles.labTableHeader}>
                          <div className={styles.labCol1}>Test</div>
                          <div className={styles.labCol2}>Result</div>
                          <div className={styles.labCol3}>Reference</div>
                        </div>
                        <div className={styles.labTableRow}>
                          <div className={styles.labCol1}>Glucose, Fasting</div>
                          <div className={styles.labCol2}>
                            <span className={styles.labValueHigh}>115 mg/dL</span>
                            <img src={imgHighFlag} alt="" style={{width:9.333,height:9.333}} />
                          </div>
                          <div className={styles.labCol3}>70 - 99</div>
                        </div>
                        <div className={`${styles.labTableRow} ${styles.labTableRowBorder}`}>
                          <div className={styles.labCol1}>Creatinine</div>
                          <div className={styles.labCol2}><span className={styles.labValueNormal}>0.9 mg/dL</span></div>
                          <div className={styles.labCol3}>0.7 - 1.3</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item 2: Imaging (node 1:2299) */}
                  <div className={styles.timelineItem}>
                    <div className={`${styles.timelineNode} ${styles.timelineNodeImg}`}>
                      <span className={`${styles.timelineNodeDot} ${styles.timelineNodeDotImg}`} />
                    </div>
                    <div className={styles.timelineCard}>
                      <div className={styles.timelineCardMeta}>
                        <span className={`${styles.typeBadge} ${styles.typeBadgeImg}`}>IMAGING</span>
                        <span className={styles.timelineDate}>Oct 12, 2023, 14:15 PM</span>
                      </div>
                      <h4 className={styles.timelineCardTitle}>Chest X-Ray (PA &amp; Lateral)</h4>
                      <div className={styles.timelineCardLoc}>
                        <img src={imgLocIcon} alt="" style={{width:12,height:12}} />
                        <span>Al-Safa Radiology Center</span>
                      </div>
                      <div className={styles.imagingNote}>
                        <strong>Impression:</strong> No acute cardiopulmonary abnormality. Clear lung fields bilaterally. Cardiac silhouette size is within normal limits.
                      </div>
                    </div>
                  </div>

                  {/* Item 3: Prescription (node 1:2319) */}
                  <div className={styles.timelineItem}>
                    <div className={`${styles.timelineNode} ${styles.timelineNodeRx}`}>
                      <span className={`${styles.timelineNodeDot} ${styles.timelineNodeDotRx}`} />
                    </div>
                    <div className={styles.timelineCard}>
                      <div className={styles.timelineCardMeta}>
                        <span className={`${styles.typeBadge} ${styles.typeBadgeRx}`}>PRESCRIPTION</span>
                        <span className={styles.timelineDate}>Sep 05, 2023</span>
                      </div>
                      <h4 className={styles.timelineCardTitle}>Internal Medicine Clinic Visit</h4>
                      <div className={styles.timelineCardLoc}>
                        <img src={imgDoctorIcon} alt="" style={{width:10.667,height:10.667}} />
                        <span>Dr. Youssef Kamal</span>
                      </div>
                      <div className={styles.rxList}>
                        <div className={styles.rxItem}>
                          <div className={styles.rxIconWrap}>
                            <img src={imgMedIcon} alt="" style={{width:13.5,height:13.5}} />
                          </div>
                          <div className={styles.rxInfo}>
                            <span className={styles.rxName}>Metformin 500mg</span>
                            <span className={styles.rxDose}>1 tablet twice daily with meals</span>
                          </div>
                          <span className={styles.rxDays}>30 Days</span>
                        </div>
                        <div className={styles.rxItem}>
                          <div className={styles.rxIconWrap}>
                            <img src={imgPillIcon} alt="" style={{width:15,height:16.5}} />
                          </div>
                          <div className={styles.rxInfo}>
                            <span className={styles.rxName}>Lisinopril 10mg</span>
                            <span className={styles.rxDose}>1 tablet daily in the morning</span>
                          </div>
                          <span className={styles.rxDays}>90 Days</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* End marker (node 1:2361) */}
                  <div className={styles.timelineEnd}>
                    <div className={styles.timelineEndDot} />
                    <span className={styles.timelineEndText}>End of recent history (Showing last 6 months)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Panel: Clinical Summaries (col 9-12, node 1:2365) ── */}
            <div className={styles.rightPanel}>

              {/* Critical Allergies (node 1:2366) */}
              <div className={styles.allergyCard}>
                <div className={styles.allergyCorner} />
                <div className={styles.allergyIconWrap}>
                  <img src={imgAllergyIcon} alt="" style={{width:22,height:21}} />
                </div>
                <div className={styles.allergyContent}>
                  <h4 className={styles.allergyTitle}>CRITICAL ALLERGIES</h4>
                  <div className={styles.allergyBadges}>
                    <span className={styles.allergyBadgeFilled}>Penicillin</span>
                    <span className={styles.allergyBadgeOutline}>Latex (Mild)</span>
                  </div>
                </div>
              </div>

              {/* Active Medications (node 1:2378) */}
              <div className={styles.sideCard}>
                <div className={styles.sideCardHeader}>
                  <div className={styles.sideCardHeaderLeft}>
                    <img src={imgPillIcon} alt="" style={{width:11.667,height:15}} />
                    <span className={styles.sideCardTitle}>Active Medications</span>
                  </div>
                  <button className={styles.editBtn}>Edit</button>
                </div>
                <div className={styles.sideCardBody}>
                  {/* Med 1 — green dot */}
                  <div className={`${styles.medItem} ${styles.medItemBorder}`}>
                    <div className={styles.medDotWrap}>
                      <span className={styles.medDot} style={{background:'#006a61'}} />
                    </div>
                    <div className={styles.medInfo}>
                      <div className={styles.medNameRow}>
                        <span className={styles.medName}>Metformin</span>
                        <span className={styles.medDose}>500mg</span>
                      </div>
                      <span className={styles.medSig}>PO BID with meals</span>
                      <span className={styles.medDate}>Started: Sep 05, 2023</span>
                    </div>
                  </div>
                  {/* Med 2 — green dot */}
                  <div className={`${styles.medItem} ${styles.medItemBorder}`}>
                    <div className={styles.medDotWrap}>
                      <span className={styles.medDot} style={{background:'#006a61'}} />
                    </div>
                    <div className={styles.medInfo}>
                      <div className={styles.medNameRow}>
                        <span className={styles.medName}>Lisinopril</span>
                        <span className={styles.medDose}>10mg</span>
                      </div>
                      <span className={styles.medSig}>PO QD in AM</span>
                      <span className={styles.medDate}>Started: Sep 05, 2023</span>
                    </div>
                  </div>
                  {/* Med 3 — grey dot + refill warning */}
                  <div className={styles.medItem}>
                    <div className={styles.medDotWrap}>
                      <span className={styles.medDot} style={{background:'#747781'}} />
                    </div>
                    <div className={styles.medInfo}>
                      <div className={styles.medNameRow}>
                        <span className={styles.medName}>Atorvastatin</span>
                        <span className={styles.medDose}>20mg</span>
                      </div>
                      <span className={styles.medSig}>PO QHS</span>
                      <div className={styles.medRefill}>
                        <img src={imgRefillIcon} alt="" style={{width:10,height:10}} />
                        <span className={styles.medRefillText}>Refill Needed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest Vitals (node 1:2422) */}
              <div className={styles.sideCard}>
                <div className={styles.sideCardHeader}>
                  <div className={styles.sideCardHeaderLeft}>
                    <img src={imgVitalsIcon} alt="" style={{width:16.667,height:13.333}} />
                    <span className={styles.sideCardTitle}>Latest Vitals</span>
                  </div>
                  <span className={styles.vitalsTime}>Taken Today, 09:15 AM</span>
                </div>
                <div className={styles.vitalsGrid}>
                  <div className={styles.vitalCell}>
                    <span className={styles.vitalLabel}>Blood Pressure</span>
                    <div className={styles.vitalValue}><span>128/82</span><span className={styles.vitalUnit}>mmHg</span></div>
                  </div>
                  <div className={`${styles.vitalCell} ${styles.vitalCellBorder}`}>
                    <span className={styles.vitalLabel}>Heart Rate</span>
                    <div className={styles.vitalValue}><span>74</span><span className={styles.vitalUnit}>bpm</span></div>
                  </div>
                  <div className={`${styles.vitalCell} ${styles.vitalCellBorder}`}>
                    <span className={styles.vitalLabel}>Temperature</span>
                    <div className={styles.vitalValue}><span>37.1</span><span className={styles.vitalUnit}>°C</span></div>
                  </div>
                  <div className={`${styles.vitalCell} ${styles.vitalCellBorder}`}>
                    <span className={styles.vitalLabel}>SpO2</span>
                    <div className={styles.vitalValue}><span>98</span><span className={styles.vitalUnit}>%</span></div>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts (node 1:2456) */}
              <div className={styles.sideCard} style={{marginBottom:16}}>
                <div className={styles.sideCardHeader}>
                  <div className={styles.sideCardHeaderLeft}>
                    <img src={imgContactIcon} alt="" style={{width:20,height:15}} />
                    <span className={styles.sideCardTitle}>Emergency Contacts</span>
                  </div>
                </div>
                <div className={styles.sideCardBody}>
                  <div className={styles.contactItem}>
                    <div className={styles.contactAvatar}>
                      <img src={imgContactIcon} alt="" style={{width:16,height:16,filter:'brightness(0) invert(1)'}} />
                    </div>
                    <div className={styles.contactInfo}>
                      <span className={styles.contactName}>Fatima El-Sayed</span>
                      <span className={styles.contactRole}>Spouse • Primary</span>
                    </div>
                    <button className={styles.callBtn}>
                      <img src={imgCallIcon} alt="" style={{width:13.5,height:13.5}} />
                    </button>
                  </div>
                  <div className={styles.contactItem}>
                    <div className={styles.contactAvatar}>
                      <img src={imgContactIcon} alt="" style={{width:16,height:16,filter:'brightness(0) invert(1)'}} />
                    </div>
                    <div className={styles.contactInfo}>
                      <span className={styles.contactName}>Omar El-Sayed</span>
                      <span className={styles.contactRole}>Son</span>
                    </div>
                    <button className={styles.callBtn}>
                      <img src={imgCallIcon} alt="" style={{width:13.5,height:13.5}} />
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
