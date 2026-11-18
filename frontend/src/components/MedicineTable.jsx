import React, { useState } from 'react'
import iconEdit      from '../assets/icons/edit.svg'
import iconWarning   from '../assets/icons/warning.svg'
import iconDelete    from '../assets/icons/delete.svg'
import iconAdd       from '../assets/icons/add.svg'
import iconEditBtn   from '../assets/icons/edit-btn.svg'
import iconConfirm   from '../assets/icons/confirm.svg'
import styles from './MedicineTable.module.css'

const INITIAL_ROWS = [
  { id: 1, medicine: 'Amoxicillin',  dosage: '500mg', frequency: '1-0-1 (BID)', duration: '5 Days', warn: false },
  { id: 2, medicine: 'Paracetamol',  dosage: '650mg', frequency: 'SOS',         duration: '3 Days', warn: true  },
]

let nextId = 3

export default function MedicineTable() {
  const [rows, setRows] = useState(INITIAL_ROWS)

  function addRow() {
    setRows(prev => [...prev, { id: nextId++, medicine: '', dosage: '', frequency: '', duration: '', warn: false }])
  }

  function deleteRow(id) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  return (
    <section className={styles.pane}>
      {/* ── Top heading ── */}
      <div className={styles.topSection}>
        <div className={styles.headingGroup}>
          <h2 className={styles.sectionTitle}>Extracted Medicines</h2>
          <p className={styles.subtitle}>Review and edit the AI-extracted prescription details below.</p>
        </div>
      </div>

      {/* ── Data table ── */}
      <div className={styles.tableWrapper}>
        <div className={styles.tableCard}>
          {/* Table header */}
          <div className={styles.tableHead}>
            <div className={styles.colMedicine}>Medicine</div>
            <div className={styles.colDosage}>Dosage</div>
            <div className={styles.colFrequency}>Frequency</div>
            <div className={styles.colDuration}>Duration</div>
            <div className={styles.colAction}></div>
          </div>

          {/* Table body */}
          <div className={styles.tableBody}>
            {rows.map((row, idx) => (
              <div key={row.id} className={styles.tableRow} style={{ animationDelay: `${idx * 40}ms` }}>
                {/* Medicine */}
                <div className={styles.colMedicine}>
                  <div className={styles.inputWrap}>
                    <input
                      className={styles.cellInput}
                      value={row.medicine}
                      onChange={e => updateRow(row.id, 'medicine', e.target.value)}
                    />
                    <img src={iconEdit} alt="" className={styles.editHint} />
                  </div>
                </div>

                {/* Dosage */}
                <div className={styles.colDosage}>
                  <input
                    className={styles.cellInput}
                    value={row.dosage}
                    onChange={e => updateRow(row.id, 'dosage', e.target.value)}
                  />
                </div>

                {/* Frequency */}
                <div className={styles.colFrequency}>
                  <div className={styles.inputWrap}>
                    <input
                      className={`${styles.cellInput} ${row.warn ? styles.cellInputWarn : ''}`}
                      value={row.frequency}
                      onChange={e => updateRow(row.id, 'frequency', e.target.value)}
                    />
                    {row.warn && <img src={iconWarning} alt="Needs review" className={styles.warnIcon} />}
                  </div>
                </div>

                {/* Duration */}
                <div className={styles.colDuration}>
                  <input
                    className={styles.cellInput}
                    value={row.duration}
                    onChange={e => updateRow(row.id, 'duration', e.target.value)}
                  />
                </div>

                {/* Delete */}
                <div className={styles.colAction}>
                  <button className={styles.deleteBtn} onClick={() => deleteRow(row.id)} title="Remove row">
                    <img src={iconDelete} alt="Delete" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add row */}
            <div className={styles.addRow}>
              <button className={styles.addBtn} onClick={addRow}>
                <img src={iconAdd} alt="" />
                <span>Add Medication</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action footer ── */}
      <div className={styles.footer}>
        <button className={styles.btnOutline}>
          <img src={iconEditBtn} alt="" />
          <span>Edit Details</span>
        </button>
        <button className={styles.btnPrimary}>
          <img src={iconConfirm} alt="" />
          <span>Confirm &amp; Generate Link</span>
        </button>
      </div>
    </section>
  )
}
