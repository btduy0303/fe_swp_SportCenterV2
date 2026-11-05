import React from 'react'
import { formatVND } from '../../utils/format'
import { scheduleText } from '../../utils/schedule'
import styles from '../../css/member/MyBookings.module.css'

function Badge({ good, children }) {
  return <span className={`${styles.badge} ${good ? styles.good : ''}`}>{children}</span>
}

// Danh sách lớp của hội viên: mỗi lớp một dòng, nút hủy nổi bật kèm dòng nói rõ có được hoàn tiền không.
export function MyClassList({ registrations, schedules, statusLabel, isGood, isStarted, fmtDateTime, busy, onPay, onCheck, onCancel }) {
  if (!registrations.length) return <p className={styles.empty}>Bạn chưa đăng ký lớp học nào.</p>

  return (
    <div className={styles.list}>
      {registrations.map((reg) => {
        const started = isStarted(reg)
        const canCancel = reg.status === 'PENDING_PAYMENT' || reg.status === 'WAITLISTED'
          || (reg.status === 'REGISTERED' && reg.classStatus !== 'COMPLETED' && reg.classStatus !== 'CANCELED')
        const refundNote = reg.status === 'REGISTERED'
          ? (started ? 'Lớp đã khai giảng, rời lớp không hoàn tiền' : 'Hoàn 100% học phí')
          : 'Chưa thanh toán, hủy không mất phí'
        const active = reg.status === 'REGISTERED' || reg.status === 'PENDING_PAYMENT'
        return (
          <article key={reg.id} className={styles.row}>
            <div className={styles.main}>
              <h3 className={styles.name}>{reg.className || 'Lớp học'}</h3>
              <p className={styles.meta}>
                Học phí {formatVND(reg.tuition || 0)}
                {active && schedules[reg.classId] ? ` · ${scheduleText(schedules[reg.classId])}` : ''}
              </p>
              {reg.status === 'PENDING_PAYMENT' && reg.holdExpiresAt && <p className={styles.meta}>Giữ chỗ đến {fmtDateTime(reg.holdExpiresAt)}</p>}
              {reg.status === 'WAITLISTED' && reg.waitlistPosition && <p className={styles.meta}>Vị trí hàng chờ: {reg.waitlistPosition}</p>}
            </div>
            <div className={styles.side}>
              <Badge good={isGood(reg)}>{statusLabel(reg)}</Badge>
              {reg.status === 'PENDING_PAYMENT' && (
                <>
                  <button type="button" className={styles.primary} disabled={busy} onClick={() => onPay(reg)}>Thanh Toán Online</button>
                  <button type="button" className={styles.secondary} disabled={busy} onClick={() => onCheck(reg)}>Tôi Đã Thanh Toán</button>
                </>
              )}
              {canCancel && (
                <>
                  <button type="button" className={styles.danger} onClick={() => onCancel(reg, started)}>{reg.status === 'REGISTERED' && started ? 'Rời lớp' : 'Hủy đăng ký'}</button>
                  <span className={styles.note}>{refundNote}</span>
                </>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
