import React, { useState } from 'react'
import { formatVND, formatDate, lastUsableDate } from '../../utils/format'
import styles from '../../css/member/SubscriptionExtras.module.css'

const TYPE = { NEW: 'Đăng ký mới', RENEWAL: 'Gia hạn / đổi gói', UPGRADE: 'Nâng cấp' }
const STATUS = { EXPIRED: 'Đã hết hạn', UPGRADED: 'Đã nâng cấp', CANCELED: 'Đã hủy' }

// Các gói đã kết thúc hoặc đã hủy (gói đang dùng, chờ bắt đầu và chờ thanh toán nằm ở khung phía trên)
export default function SubscriptionHistory({ history }) {
  const [now] = useState(() => Date.now())
  if (!history.length) return null

  return (
    <section className={styles.history} aria-labelledby="sub-history-title">
      <h2 id="sub-history-title" className={styles.historyTitle}>Lịch sử gói</h2>
      <ul className={styles.rows}>
        {history.map((s) => (
          <li key={s.id} className={styles.row}>
            <div>
              <strong>{s.packageName} · {s.purchaseType === 'UPGRADE' ? '30 ngày' : `${s.months} tháng`}</strong>
              <small>
                {TYPE[s.purchaseType] || s.purchaseType}
                {s.startDate && s.endDate ? ` · ${formatDate(s.startDate)} – ${lastUsableDate(s.endDate)}` : ' · Chưa thanh toán'}
              </small>
            </div>
            <span className={styles.amount}>{formatVND(s.totalAmount)}</span>
            <span className={`${styles.state} ${s.status === 'CANCELED' ? styles.stateOff : ''}`}>
              {s.status === 'CANCELED' && !s.startDate && s.paymentExpiresAt && new Date(s.paymentExpiresAt).getTime() <= now
                ? 'Quá hạn thanh toán'
                : (STATUS[s.status] || s.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
