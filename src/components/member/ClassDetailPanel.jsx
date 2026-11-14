import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { formatVND } from '../../utils/format'
import styles from '../../css/member/ClassDetailPanel.module.css'

const LEVELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' }
const DAYS = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const hm = (t) => String(t || '').slice(0, 5)
const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

// Khung bên phải xem kỹ một lớp trước khi đăng ký: giới thiệu, coach, lịch tuần, đủ các buổi học, chỗ trống, học phí và luật hủy.
// Dữ liệu từ GET /api/classes/{id}; discountPct là phần trăm giảm học phí theo hạng gói của hội viên
export default function ClassDetailPanel({ classId, discountPct = 0, registered, onRegister, onClose }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const closeRef = useRef(null)

  useEffect(() => {
    setDetail(null)
    setError('')
    fetch(`/api/classes/${classId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Không tải được thông tin lớp'))))
      .then(setDetail)
      .catch((e) => setError(e.message))
  }, [classId])

  // Esc để đóng, đặt con trỏ vào nút đóng khi mở
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const c = detail?.classInfo
  const sessions = (detail?.sessions || []).filter((s) => s.status !== 'CANCELED_BY_CENTER')
  const full = c && c.seatsLeft <= 0
  const pay = c ? Math.round(Number(c.tuition) * (100 - discountPct) / 100) : 0

  return (
    <div className={styles.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="class-detail-title">
        <div className={styles.head}>
          <h2 id="class-detail-title">{c ? c.name : 'Thông tin lớp'}</h2>
          <button type="button" ref={closeRef} className={styles.close} aria-label="Đóng" onClick={onClose}><X size={18} /></button>
        </div>
        {error ? <p className={styles.muted}>{error}</p> : !c ? <p className={styles.muted}>Đang tải...</p> : (
          <div className={styles.body}>
            <p className={styles.tags}>{c.categoryName} · {LEVELS[c.level] || c.level} · {c.totalSessions} buổi · HLV {c.coachName}</p>
            {c.description ? <p className={styles.desc}>{c.description}</p> : null}
            {c.prerequisiteCourseName ? <p className={styles.note}>Nên học xong khóa "{c.prerequisiteCourseName}" trước khi vào lớp này.</p> : null}

            <section>
              <h3>Lịch mỗi tuần</h3>
              <ul className={styles.week}>
                {(detail.schedules || []).map((s) => (
                  <li key={s.id}><b>{DAYS[s.dayOfWeek] || s.dayOfWeekName}</b> {hm(s.startTime)} – {hm(s.endTime)}<span>{s.roomName}</span></li>
                ))}
              </ul>
            </section>

            <section>
              <h3>Các buổi học ({sessions.length})</h3>
              <ol className={styles.sessions}>
                {sessions.map((s) => {
                  const d = new Date(`${s.sessionDate}T00:00:00`)
                  return <li key={s.id}><b>{WEEKDAY[d.getDay()]} {dm(s.sessionDate)}</b><span>{hm(s.startTime)}</span></li>
                })}
              </ol>
            </section>

            <section className={styles.facts}>
              <div><span>Khai giảng</span><b>{new Date(`${c.startDate}T00:00:00`).toLocaleDateString('vi-VN')}</b></div>
              <div><span>Chỗ còn trống</span><b>{Math.max(0, c.seatsLeft)}/{c.maxCapacity}</b></div>
              <div><span>Học phí</span><b>{formatVND(pay)}</b>{discountPct > 0 ? <small>Đã giảm {discountPct}% theo gói của bạn, giá gốc {formatVND(c.tuition)}</small> : null}</div>
            </section>

            <p className={styles.rules}>Đăng ký xong, chỗ được giữ 2 giờ để bạn thanh toán online hoặc tại quầy. Hủy trước ngày khai giảng được hoàn đủ học phí; đã khai giảng thì không hoàn.</p>
          </div>
        )}
        {c ? (
          <div className={styles.foot}>
            {registered ? <span className={styles.joined}>Bạn đã đăng ký lớp này</span>
              : <button type="button" className={styles.primary} onClick={() => onRegister(c, full)}>{full ? 'Vào danh sách chờ' : 'Đăng ký lớp này'}</button>}
          </div>
        ) : null}
      </aside>
    </div>
  )
}
