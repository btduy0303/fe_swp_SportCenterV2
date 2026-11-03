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
      <h3 id="sub-history-title" className={styles.heading}>Lịch sử gói</h3>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr><th>Gói</th><th>Thời gian</th><th>Loại đơn</th><th>Số tiền</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            {history.map((s) => (
              <tr key={s.id}>
                <td>{s.packageName} · {s.months} tháng</td>
                <td>{s.startDate && s.endDate ? `${formatDate(s.startDate)} – ${lastUsableDate(s.endDate)}` : '—'}</td>
                <td>{TYPE[s.purchaseType] || s.purchaseType}</td>
                <td>{formatVND(s.totalAmount)}</td>
                <td>{STATUS[s.status] || s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
