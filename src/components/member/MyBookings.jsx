import React from 'react'
import { GraduationCap } from 'lucide-react'
import { formatVND } from '../../utils/format'
import { scheduleText } from '../../utils/schedule'
import styles from '../../css/member/MyClasses.module.css'

// Danh sách lớp của hội viên: mỗi lớp một dòng, nút hủy kèm dòng nói rõ có được hoàn tiền không.
export function MyClassList({ registrations, schedules, statusLabel, isGood, isStarted, fmtDateTime, busy, onPay, onCheck, onCancel }) {
  if (!registrations.length) return <p className={styles.empty}>Bạn chưa đăng ký lớp học nào. Chọn lớp ở phần bên dưới để bắt đầu.</p>

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
            <span className={styles.icon} aria-hidden="true"><GraduationCap size={22} /></span>
            <div className={styles.main}>
              <h3 className={styles.name}>{reg.className || 'Lớp học'}</h3>
              <p className={styles.meta}>
                Học phí {formatVND(reg.tuition || 0)}
                {active && schedules[reg.classId] ? ` · ${scheduleText(schedules[reg.classId])}` : ''}
              </p>
              {reg.status === 'PENDING_PAYMENT' && reg.holdExpiresAt ? <p className={styles.meta}>Giữ chỗ đến {fmtDateTime(reg.paymentExpiresAt || reg.holdExpiresAt)}</p> : null}
              {reg.status === 'PENDING_PAYMENT' ? (
                <p className={styles.meta}>
                  Thanh toán: {(reg.availablePaymentMethods?.length ? reg.availablePaymentMethods : ['CASH', 'QR_GATEWAY']).map((m) => (m === 'CASH' ? 'tiền mặt tại quầy' : 'online (QR)')).join(' hoặc ')}
                  {reg.cashPaymentDeadline ? ` · tiền mặt trước ${fmtDateTime(reg.cashPaymentDeadline)} (24 giờ)` : ''}
                </p>
              ) : null}
              {reg.status === 'WAITLISTED' && reg.waitlistPosition ? <p className={styles.meta}>Vị trí hàng chờ: {reg.waitlistPosition}</p> : null}
            </div>
            <div className={styles.side}>
              <span className={`${styles.chip} ${isGood(reg) ? styles.chipOk : styles.chipWait}`}>{statusLabel(reg)}</span>
              <div className={styles.actions}>
                {reg.status === 'PENDING_PAYMENT' ? (
                  <>
                    <button type="button" className={styles.primary} disabled={busy} onClick={() => onPay(reg)}>Thanh toán online</button>
                    <button type="button" className={styles.secondary} disabled={busy} onClick={() => onCheck(reg)}>Tôi đã thanh toán</button>
                  </>
                ) : null}
                {canCancel ? (
                  <button type="button" className={styles.cancel} onClick={() => onCancel(reg, started)}>{reg.status === 'REGISTERED' && started ? 'Rời lớp' : 'Hủy đăng ký'}</button>
                ) : null}
              </div>
              {canCancel ? <span className={styles.note}>{refundNote}</span> : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
