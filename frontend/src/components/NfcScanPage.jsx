import React from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './NfcScanPage.module.css'

// ── Figma assets ─────────────────────────────────────────────
import imgNfcIcon        from '../assets/icons/nfc/nfc-icon.svg'
import imgDashboardIcon  from '../assets/icons/nfc/nfc-dashboard-icon.svg'
import imgChevronGrey    from '../assets/icons/nfc/nfc-chevron-grey.svg'
import imgEmergencyIcon  from '../assets/icons/nfc/nfc-emergency-icon.svg'
import imgChevronTeal    from '../assets/icons/nfc/nfc-chevron-teal.svg'

export default function NfcScanPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>

      {/* ── Header (node 1:1960) — backdrop-blur, brand anchor ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* Heading 1 (node 1:1961) — Inter Black 24px #002657 tracking-[-0.6px] */}
          <h1 className={styles.brandName}>OneMed</h1>
        </div>
      </header>

      {/* ── Main Content Canvas (node 1:1906) ── */}
      {/* px-[16px] py-[138px] centered, max-w-[448px] */}
      <div className={styles.canvas}>

        {/* ── NFC Scanning Area (node 1:1908) h-[208px] ── */}
        <div className={styles.nfcArea}>

          {/* NFC icon container (node 1:1915) — 128×128 */}
          <div className={styles.nfcContainer}>
            {/* Animated rings outer: border-4 rgba(0,38,87,0.2) border-solid rounded-[12px] */}
            <div className={styles.nfcRingOuter} />
            {/* Inner ring: border-2 rgba(0,38,87,0.4) inset-[8px] rounded-[12px] */}
            <div className={styles.nfcRingInner} />
            {/* Main icon box (node 1:1918): bg-[#0b3b7c] 96×96 rounded-[12px] */}
            <div className={styles.nfcBox}>
              <img src={imgNfcIcon} alt="NFC" className={styles.nfcBoxIcon} />
            </div>
          </div>

          {/* Title (node 1:1909) — Inter SemiBold 20px #002657 centered */}
          <h2 className={styles.title}>Tap your NFC tag to continue</h2>

          {/* Subtitle (node 1:1912) — Inter Regular 14px #434750 */}
          <div className={styles.subtitleWrap}>
            <p className={styles.subtitle}>Scan successful. Select an action below.</p>
          </div>

        </div>

        {/* ── Navigation Options (node 1:1922) gap-[8px] ── */}
        <div className={styles.options}>

          {/* Patient Dashboard (node 1:1923) */}
          {/* bg-white border border-[#c3c6d2] p-[17px] rounded-[8px] */}
          <button
            className={styles.optionBtn}
            onClick={() => navigate('/admin')}
          >
            {/* Icon bg #d8e3fb 40×40 rounded-[12px] */}
            <div className={styles.optionIconWrap}>
              <img src={imgDashboardIcon} alt="" className={styles.optionIcon} style={{width:13.333,height:17.5}} />
            </div>
            <div className={styles.optionText}>
              {/* Inter SemiBold 14px #111c2d tracking-[0.14px] */}
              <span className={styles.optionTitle}>Patient Dashboard</span>
              {/* Inter Medium 12px #434750 */}
              <span className={styles.optionSub}>Login required</span>
            </div>
            {/* Chevron 7.4×12px */}
            <img src={imgChevronGrey} alt="" className={styles.optionChevron} style={{width:7.4,height:12}} />
          </button>

          {/* Emergency Info (node 1:1945) */}
          {/* bg-[#f0f3ff] border-2 border-[#006a61] p-[18px] rounded-[8px] shadow */}
          <button
            className={`${styles.optionBtn} ${styles.optionBtnEmergency}`}
            onClick={() => navigate('/emergency')}
          >
            {/* Glow (node 1:1946) */}
            <div className={styles.emergencyGlow} />
            {/* Icon bg #86f2e4 40×40 rounded-[12px] */}
            <div className={`${styles.optionIconWrap} ${styles.optionIconWrapEmergency}`}>
              <img src={imgEmergencyIcon} alt="" className={styles.optionIcon} style={{width:13.333,height:17.5}} />
            </div>
            <div className={styles.optionText}>
              {/* Inter Bold 14px #002657 tracking-[0.14px] */}
              <span className={`${styles.optionTitle} ${styles.optionTitleEmergency}`}>Emergency Info</span>
              {/* Inter SemiBold 12px #006a61 */}
              <span className={`${styles.optionSub} ${styles.optionSubEmergency}`}>No login required — open access</span>
            </div>
            {/* Chevron teal 7.4×12px */}
            <img src={imgChevronTeal} alt="" className={styles.optionChevron} style={{width:7.4,height:12}} />
          </button>

        </div>
      </div>

      {/* ── Footer (node 1:1957) ── */}
      <footer className={styles.footer}>
        <span className={styles.footerText}>
          ONEMED NFC PATIENT IDENTIFICATION SYSTEM
        </span>
      </footer>

    </div>
  )
}
