import React from 'react'
import { GraduationCap } from 'lucide-react'
import { formatVND } from '../../utils/format'
import { scheduleText } from '../../utils/schedule'
import PayOptions from './PayOptions'
import styles from '../../css/member/MyClasses.module.css'

// Danh sách lớp của hội viên: mỗi lớp một dòng, nút hủy kèm dòng nói rõ có được hoàn tiền không.
export function MyClassList({ registrations, schedules, statusLabel, isGood, isStarted, busy, onPay, onCheck, onCancel }) {
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
              {reg.status === 'WAITLISTED' && reg.waitlistPosition ? <p className={styles.meta}>Vị trí hàng chờ: {reg.waitlistPosition}</p> : null}
            </div>
            <div className={styles.side}>
              <span className={`${styles.chip} ${isGood(reg) ? styles.chipOk : styles.chipWait}`}>{statusLabel(reg)}</span>
              <div className={styles.actions}>
                {canCancel ? (
                  <button type="button" className={styles.cancel} onClick={() => onCancel(reg, started)}>{reg.status === 'REGISTERED' && started ? 'Rời lớp' : 'Hủy đăng ký'}</button>
                ) : null}
              </div>
              {canCancel ? <span className={styles.note}>{refundNote}</span> : null}
            </div>
            {reg.status === 'PENDING_PAYMENT' ? (
              <div className={styles.payWide}>
                <PayOptions deadline={reg.holdExpiresAt} whatHappens="Chỗ của bạn được giữ đến lúc đó, quá hạn chưa trả thì chỗ được nhường cho người khác." busy={busy} onPay={() => onPay(reg)} onCheck={() => onCheck(reg)} />
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
