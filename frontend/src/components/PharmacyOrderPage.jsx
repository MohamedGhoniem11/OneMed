import React, { useState } from 'react'

// ── Pharmacy / OneMed icons ──────────────────────────────────────────────────
import iconPharmacyGrey  from '../assets/icons/pharmacy/pharmacy-icon-grey.svg'
import iconPharmacyTeal  from '../assets/icons/pharmacy/pharmacy-icon-teal.svg'
import iconCheckTeal     from '../assets/icons/pharmacy/checkmark-teal.svg'
import iconRx            from '../assets/icons/pharmacy/rx-icon.svg'
import iconBackArrow     from '../assets/icons/pharmacy/back-arrow.svg'
import iconWaLink        from '../assets/icons/pharmacy/wa-link-icon.svg'

// ── WhatsApp icons ───────────────────────────────────────────────────────────
import iconWaBg          from '../assets/icons/pharmacy/wa-bg-pattern.svg'
import iconWaAvatar      from '../assets/icons/pharmacy/wa-pharmacy-avatar.svg'
import iconWaDoubleCheck from '../assets/icons/pharmacy/wa-double-check.svg'
import iconWaVideo       from '../assets/icons/pharmacy/wa-video-icon.svg'
import iconWaPhone       from '../assets/icons/pharmacy/wa-phone-icon.svg'
import iconWaDots        from '../assets/icons/pharmacy/wa-dots-icon.svg'
import iconWaEmoji       from '../assets/icons/pharmacy/wa-emoji-icon.svg'
import iconWaAttach      from '../assets/icons/pharmacy/wa-attach-icon.svg'
import iconWaSend        from '../assets/icons/pharmacy/wa-send-icon.svg'

import PageSwitcher from './PageSwitcher.jsx'
import styles from './PharmacyOrderPage.module.css'

// ── Static data ──────────────────────────────────────────────────────────────
const PHARMACIES = [
  {
    id: 1,
    name: 'City Central Care',
    info: '2.4 km • Closes 10 PM',
    icon: iconPharmacyGrey,
    iconActive: iconPharmacyGrey,
    tealBg: false,
  },
  {
    id: 2,
    name: 'MediCare Plus Pharmacy',
    info: '0.8 km • Open 24/7',
    icon: iconPharmacyTeal,
    iconActive: iconPharmacyTeal,
    tealBg: true,
  },
]

const PRESCRIPTION = {
  id: '#RX-9284',
  items: ['Amoxicillin 500mg (20 caps)', 'Ibuprofen 400mg (30 tabs)'],
}

const CHAT_MESSAGES = [
  {
    id: 1,
    type: 'outgoing',
    time: '10:42 AM',
    paragraphs: [
      'Hello MediCare Plus,',
      'I would like to order the following\nprescription from OneMed Clinic:\n*Doctor:* Dr. Ahmed Mansour\n*Patient ID:* #P-4829',
      '*Medicines:*\n1. Amoxicillin 500mg (20 caps)\n2. Ibuprofen 400mg (30 tabs)',
      'Please confirm availability and total\nprice.',
    ],
    showDoubleCheck: true,
  },
  {
    id: 2,
    type: 'incoming',
    time: '10:44 AM',
    paragraphs: [
      'Welcome to MediCare Plus! 🏥',
      'Yes, we have both items in stock.\nTotal price is: *$24.50*',
      'Would you like to pick it up or prefer\ndelivery?',
    ],
  },
]

// Renders WhatsApp-style bold text (*word*)
function WaText({ text }) {
  const parts = text.split(/(\*[^*]+\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('*') && p.endsWith('*')
          ? <strong key={i}>{p.slice(1, -1)}</strong>
          : p.split('\n').map((line, j, arr) => (
              <React.Fragment key={`${i}-${j}`}>
                {line}
                {j < arr.length - 1 && <br />}
              </React.Fragment>
            ))
      )}
    </>
  )
}

export default function PharmacyOrderPage() {
  const [selected, setSelected] = useState(2)

  return (
    <div className={styles.page}>

      {/* ════════════════════════════════════════
          TOP HALF — OneMed Interface
      ════════════════════════════════════════ */}
      <div className={styles.topHalf}>

        {/* OneMed App-like Header */}
        <header className={styles.oneMedHeader}>
          <button className={styles.backBtn} aria-label="Go back">
            <img src={iconBackArrow} alt="" className={styles.backIcon} />
          </button>
          <span className={styles.oneMedLogo}>OneMed</span>
        </header>

        {/* Content Area */}
        <div className={styles.contentArea}>
          <p className={styles.subtitle}>
            Prescription ready for order. Choose a partner pharmacy to send via WhatsApp.
          </p>

          {/* Pharmacy Cards */}
          <div className={styles.pharmacyList}>
            {PHARMACIES.map(ph => {
              const isActive = selected === ph.id
              return (
                <button
                  key={ph.id}
                  className={`${styles.pharmacyCard} ${isActive ? styles.pharmacyCardActive : styles.pharmacyCardInactive}`}
                  onClick={() => setSelected(ph.id)}
                >
                  {/* Avatar */}
                  <div className={`${styles.pharmacyAvatar} ${isActive ? styles.pharmacyAvatarActive : ''}`}>
                    <img
                      src={isActive ? ph.iconActive : ph.icon}
                      alt=""
                      className={styles.pharmacyAvatarIcon}
                    />
                  </div>

                  {/* Text */}
                  <div className={styles.pharmacyInfo}>
                    <span className={styles.pharmacyName}>{ph.name}</span>
                    <span className={styles.pharmacyMeta}>{ph.info}</span>
                  </div>

                  {/* Active badge */}
                  {isActive && (
                    <div className={styles.pharmacyBadge}>
                      <img src={iconCheckTeal} alt="" className={styles.checkIcon} />
                      <span className={styles.badgeLabel}>Order</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Prescription Summary Mini Card */}
          <div className={styles.rxCard}>
            <div className={styles.rxCardHeader}>
              <img src={iconRx} alt="" className={styles.rxIcon} />
              <span className={styles.rxId}>PRESCRIPTION {PRESCRIPTION.id}</span>
            </div>
            <ul className={styles.rxList}>
              {PRESCRIPTION.items.map((item, i) => (
                <li key={i} className={styles.rxItem}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Transition Bubble */}
        <div className={styles.transitionBubble}>
          <img src={iconWaLink} alt="WhatsApp" className={styles.transitionIcon} />
        </div>
      </div>

      {/* ════════════════════════════════════════
          BOTTOM HALF — WhatsApp Interface
      ════════════════════════════════════════ */}
      <div className={styles.bottomHalf}>

        {/* WhatsApp background tiled pattern */}
        <div
          className={styles.waBgPattern}
          style={{ backgroundImage: `url(${iconWaBg})` }}
        />

        {/* WhatsApp Header */}
        <header className={styles.waHeader}>
          {/* Avatar circle — pharmacy building icon on semi-transparent white bg */}
          <div className={styles.waAvatarWrap}>
            {/* pharmacy/store icon, white, 20×18px — from Figma node 46:1172 */}
            <svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M1 7V17H7V12H13V17H19V7L10 1L1 7Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M7 17V12H13V17" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.waContactInfo}>
            <span className={styles.waContactName}>MediCare Plus Pharmacy</span>
            <span className={styles.waContactSub}>Business Account</span>
          </div>
          <div className={styles.waHeaderIcons}>
            <button className={styles.waIconBtn} aria-label="Video call">
              <img src={iconWaVideo} alt="" className={styles.waHeaderIcon} />
            </button>
            <button className={styles.waIconBtn} aria-label="Voice call">
              <img src={iconWaPhone} alt="" className={styles.waHeaderIcon} />
            </button>
            <button className={styles.waIconBtn} aria-label="More options">
              <img src={iconWaDots} alt="" className={styles.waHeaderIconDots} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className={styles.chatArea}>
          {/* Date pill */}
          <div className={styles.datePill}>Today</div>

          {CHAT_MESSAGES.map(msg => (
            <div
              key={msg.id}
              className={`${styles.msgRow} ${msg.type === 'outgoing' ? styles.msgRowOut : styles.msgRowIn}`}
            >
              <div className={`${styles.msgBubble} ${msg.type === 'outgoing' ? styles.msgBubbleOut : styles.msgBubbleIn}`}>
                <div className={styles.msgBody}>
                  {msg.paragraphs.map((para, i) => (
                    <p key={i} className={styles.msgPara}>
                      <WaText text={para} />
                    </p>
                  ))}
                </div>
                <div className={styles.msgMeta}>
                  <span className={styles.msgTime}>{msg.time}</span>
                  {msg.type === 'outgoing' && (
                    <img src={iconWaDoubleCheck} alt="" className={styles.msgCheck} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* WhatsApp Input Area */}
        <div className={styles.waInput}>
          <button className={styles.waInputBtn} aria-label="Emoji">
            <img src={iconWaEmoji} alt="" />
          </button>
          <div className={styles.waInputField}>
            <span className={styles.waInputPlaceholder}>Type a message</span>
            <button className={styles.waInputBtn} aria-label="Attach">
              <img src={iconWaAttach} alt="" />
            </button>
          </div>
          <button className={styles.waSendBtn} aria-label="Send">
            <img src={iconWaSend} alt="" className={styles.waSendIcon} />
          </button>
        </div>
      </div>

      <PageSwitcher />
    </div>
  )
}
