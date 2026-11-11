import React from 'react'
import { formatVND, formatDate, lastUsableDate } from '../../utils/format'
import styles from '../../css/member/SubscriptionExtras.module.css'

const TYPE = { NEW: 'Đăng ký mới', RENEWAL: 'Gia hạn / đổi gói', UPGRADE: 'Nâng cấp' }
const STATUS = { EXPIRED: 'Đã hết hạn', UPGRADED: 'Đã nâng cấp', CANCELED: 'Đã hủy' }

// Các gói đã kết thúc hoặc đã hủy (gói đang dùng, chờ bắt đầu và chờ thanh toán nằm ở khung phía trên)
export default function SubscriptionHistory({ history }) {
  if (!history.length) return null

  return (
    <section className={styles.history} aria-labelledby="sub-history-title">
      <h2 id="sub-history-title" className={styles.historyTitle}>Lịch sử gói</h2>
      <ul className={styles.rows}>
        {history.map((s) => (
          <li key={s.id} className={styles.row}>
            <div>
              <strong>{s.packageName} · {s.purchaseType === 'UPGRADE' ? '30 ngày' : `${s.months} tháng`}</strong>
              <small>{TYPE[s.purchaseType] || s.purchaseType}{s.startDate && s.endDate ? ` · ${formatDate(s.startDate)} – ${lastUsableDate(s.endDate)}` : ''}</small>
            </div>
            <span className={styles.amount}>{formatVND(s.totalAmount)}</span>
            <span className={`${styles.state} ${s.status === 'CANCELED' ? styles.stateOff : ''}`}>{STATUS[s.status] || s.status}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
