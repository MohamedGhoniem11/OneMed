import React from 'react'
import iconZoomIn   from '../assets/icons/zoom-in.svg'
import iconZoomOut  from '../assets/icons/zoom-out.svg'
import iconRotate   from '../assets/icons/rotate.svg'
import prescriptionImg from '../assets/images/prescription.png'
import styles from './ImageViewer.module.css'

export default function ImageViewer() {
  return (
    <section className={styles.pane}>
      {/* ── Section header ── */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Source Document</h2>
        <div className={styles.toolbar}>
          <button className={styles.toolBtn} title="Zoom in">
            <img src={iconZoomIn} alt="Zoom in" />
          </button>
          <button className={styles.toolBtn} title="Zoom out">
            <img src={iconZoomOut} alt="Zoom out" />
          </button>
          <button className={styles.toolBtn} title="Rotate">
            <img src={iconRotate} alt="Rotate" />
          </button>
        </div>
      </div>

      {/* ── Prescription image ── */}
      <div className={styles.imageFrame}>
        <img
          src={prescriptionImg}
          alt="Handwritten medical prescription"
          className={styles.prescriptionImg}
        />
      </div>
    </section>
  )
}
