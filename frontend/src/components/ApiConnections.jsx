import React from 'react'
import iconApi      from '../assets/icons/api-icon.svg'
import iconWebhook  from '../assets/icons/webhook-icon.svg'
import styles from './ApiConnections.module.css'

const CONNECTIONS = [
  {
    id: 1,
    type: 'label',
    typeBg: '#0b3b7c',
    typeColor: '#fff',
    typeBorder: 'transparent',
    typeLabel: 'FHIR',
    name: 'Epic HIS Integration',
    endpoint: 'Endpoint: https://api.epic.com/interconnect-fhir...',
    lastSync: 'Last sync: 2 min ago',
    syncColor: '#434750',
    action: 'CONFIGURE',
    statusDot: '#10b981',
    statusLabel: 'CONNECTED',
    statusColor: '#10b981',
    dashed: false,
  },
  {
    id: 2,
    type: 'label',
    typeBg: '#e7e8e9',
    typeColor: '#191c1d',
    typeBorder: '#747781',
    typeLabel: 'CSV',
    name: 'Legacy Lab Drop',
    endpoint: 'SFTP: //192.168.1.104/lab_results_inbound',
    lastSync: 'Sync failed (1 hr ago)',
    syncColor: '#ef4444',
    action: 'REVIEW',
    statusDot: '#f59e0b',
    statusLabel: 'WARNING',
    statusColor: '#f59e0b',
    dashed: false,
  },
]

export default function ApiConnections() {
  return (
    <div className={styles.card}>
      {/* Card header */}
      <div className={styles.cardHead}>
        <div className={styles.headRow}>
          <img src={iconApi} alt="" className={styles.headIcon} />
          <h3 className={styles.cardTitle}>API Connections</h3>
        </div>
        <p className={styles.cardSub}>Configure data import endpoints and webhooks.</p>
      </div>

      {/* Connections list */}
      <div className={styles.list}>
        {CONNECTIONS.map(conn => (
          <div key={conn.id} className={styles.connCard}>
            {/* Status badge top-right */}
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} style={{ background: conn.statusDot }} />
              <span className={styles.statusLabel} style={{ color: conn.statusColor }}>
                {conn.statusLabel}
              </span>
            </div>

            {/* Type box + name */}
            <div className={styles.connTop}>
              <div
                className={styles.typeBox}
                style={{
                  background: conn.typeBg,
                  color: conn.typeColor,
                  border: `1px solid ${conn.typeBorder}`,
                }}
              >
                {conn.typeLabel}
              </div>
              <div className={styles.connName}>{conn.name}</div>
            </div>

            {/* Endpoint */}
            <div className={styles.endpoint}>{conn.endpoint}</div>

            {/* Footer */}
            <div className={styles.connFoot}>
              <span className={styles.syncText} style={{ color: conn.syncColor }}>
                {conn.lastSync}
              </span>
              <button className={styles.actionLink}>{conn.action}</button>
            </div>
          </div>
        ))}

        {/* Connection 3 — New JSON Webhook (exact Figma design) */}
        <div className={styles.connCardDashed}>
          <div className={styles.connTop}>
            <div className={styles.webhookIconBox}>
              <img src={iconWebhook} alt="" className={styles.webhookIcon} />
            </div>
            <div className={styles.webhookName}>New JSON Webhook</div>
          </div>

          <div className={styles.webhookDesc}>
            Set up a new incoming webhook for patient intake forms.
          </div>

          <button className={styles.addConnBtn}>+ ADD CONNECTION</button>
        </div>
      </div>
    </div>
  )
}
