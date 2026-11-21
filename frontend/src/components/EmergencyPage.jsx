import React from 'react'
import styles from './EmergencyPage.module.css'

// ── Assets ─────────────────────────────────────────────────────
import imgPatient        from '../assets/icons/emergency/elena-patient.png'
import imgIdCard         from '../assets/icons/emergency/em-id-card.svg'
import imgAllergyIcon    from '../assets/icons/emergency/em-allergy-icon.svg'
import imgAllergyCorner  from '../assets/icons/emergency/em-allergy-corner.svg'
import imgConditions     from '../assets/icons/emergency/em-conditions-icon.svg'
import imgMedications    from '../assets/icons/emergency/em-medications-icon.svg'
import imgInsulin        from '../assets/icons/emergency/em-insulin-icon.svg'
import imgInhaler        from '../assets/icons/emergency/em-inhaler-icon.svg'
import imgPhoneRed       from '../assets/icons/emergency/em-phone-red.svg'
import imgPhoneGrey      from '../assets/icons/emergency/em-phone-grey.svg'
import imgAiIcon         from '../assets/icons/emergency/em-ai-icon.svg'

export default function EmergencyPage() {
  return (
    <div className={styles.page}>

      {/* ── Emergency Banner (node 46:973) ── */}
      <div className={styles.banner}>
        <div className={styles.bannerLogo}>OneMed</div>
        <div className={styles.bannerText}>
          <span>EMERGENCY MEDICAL INFO — NO LOGIN REQUIRED</span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className={styles.scroll}>
        <div className={styles.canvas}>

          {/* ── Section: Patient Profile (node 46:981) ── */}
          <div className={styles.sectionCard}>
            <div className={styles.avatarWrap}>
              <img src={imgPatient} alt="Elena Rodriguez" className={styles.avatarImg} />
            </div>
            <div className={styles.patientInfo}>
              <h1 className={styles.patientName}>Elena Rodriguez</h1>
              <p className={styles.patientDob}>DOB: 14 May 1982 (41 y/o)</p>
              <div className={styles.bloodBadge}>
                <img src={imgIdCard} alt="" className={styles.bloodBadgeIcon} />
                <span className={styles.bloodBadgeText}>O+ BLOOD TYPE</span>
              </div>
            </div>
          </div>

          {/* ── Section: Critical Alerts (node 46:995) ── */}
          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>Critical Alerts</h2>
            <div className={styles.allergyCard}>
              {/* corner decoration */}
              <img src={imgAllergyCorner} alt="" className={styles.allergyCorner} />
              <div className={styles.allergyHeader}>
                <img src={imgAllergyIcon} alt="" className={styles.allergyHeaderIcon} />
                <span className={styles.allergyTitle}>SEVERE ALLERGIES</span>
              </div>
              <div className={styles.allergyBody}>
                <p className={styles.allergyDrug}>Penicillin</p>
                <p className={styles.allergyDesc}>
                  Reaction: Anaphylaxis. Administer{'\n'}Epinephrine immediately.
                </p>
              </div>
            </div>
          </div>

          {/* ── Section: Conditions & Medications (node 46:1011) ── */}
          <div className={styles.section}>

            {/* Conditions card (node 46:1012) */}
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <img src={imgConditions} alt="" className={styles.cardHeaderIcon} />
                <h3 className={styles.cardHeading}>Conditions</h3>
              </div>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bullet} />
                  <span className={styles.bulletText}>Type 1 Diabetes</span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bullet} />
                  <span className={styles.bulletText}>Severe Asthma</span>
                </li>
              </ul>
            </div>

            {/* Medications card (node 46:1028) */}
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <img src={imgMedications} alt="" className={styles.cardHeaderIconTall} />
                <h3 className={styles.cardHeading}>Medications</h3>
              </div>
              <div className={styles.medList}>
                <div className={styles.medItem}>
                  <img src={imgInsulin} alt="" className={styles.medIcon} />
                  <div className={styles.medInfo}>
                    <span className={styles.medName}>Insulin (Humalog)</span>
                    <span className={styles.medNote}>With meals</span>
                  </div>
                </div>
                <div className={styles.medItem}>
                  <img src={imgInhaler} alt="" className={styles.medIconShort} />
                  <div className={styles.medInfo}>
                    <span className={styles.medName}>Albuterol (Ventolin)</span>
                    <span className={styles.medNote}>As needed for breathing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Emergency Contacts (node 46:1050) ── */}
          <div className={styles.sectionLast}>
            <h2 className={styles.sectionHeading}>Emergency Contacts</h2>
            <div className={styles.contactsCard}>
              {/* Contact 1 */}
              <div className={styles.contactRow}>
                <div className={styles.contactInfo}>
                  <span className={styles.contactName}>Carlos Rodriguez</span>
                  <span className={styles.contactRole}>Husband</span>
                </div>
                <button className={styles.callBtnRed}>
                  <img src={imgPhoneRed} alt="" className={styles.callBtnIcon} />
                  <span className={styles.callBtnLabel}>CALL</span>
                </button>
              </div>

              {/* Divider */}
              <div className={styles.contactDivider} />

              {/* Contact 2 */}
              <div className={styles.contactRow}>
                <div className={styles.contactInfo}>
                  <span className={styles.contactName}>Dr. Sarah Jenkins</span>
                  <span className={styles.contactRole}>Primary Physician</span>
                </div>
                <button className={styles.callBtnGrey}>
                  <img src={imgPhoneGrey} alt="" className={styles.callBtnIcon} />
                  <span className={styles.callBtnLabelGrey}>CALL</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom Fixed CTA (node 46:1075) ── */}
      <div className={styles.bottomCta}>
        <button className={styles.ctaButton}>
          <span className={styles.ctaLabel}>Ask Emergency First-Aid AI</span>
          <img src={imgAiIcon} alt="" className={styles.ctaIcon} />
        </button>
      </div>

    </div>
  )
}
