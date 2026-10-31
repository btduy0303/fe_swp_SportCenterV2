import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { DAY_LONG, hhmm } from '../../utils/schedule'
import styles from '../../css/manager/ManagerDashboard.module.css'

const DAY = 86400000
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const localTime = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })

function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

// Lịch tuần: mọi buổi lớp và buổi 1-1 của trung tâm trong tuần, xếp theo ngày
export default function WeeklyScheduleTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [monday, setMonday] = useState(() => mondayOf(new Date()))

  useEffect(() => {
    const sunday = new Date(monday.getTime() + 6 * DAY)
    setItems(null)
    Promise.all([
      managerService.getSessionsBetween(token, iso(monday), iso(sunday)),
      managerService.getCoachSlots(token, { from: monday.toISOString(), to: new Date(sunday.getTime() + DAY).toISOString() }),
    ])
      .then(([sessions, slots]) => setItems([
        ...sessions.map((s) => ({
          key: `c${s.id}`, date: s.sessionDate, start: hhmm(s.startTime), end: hhmm(s.endTime), kind: 'Lớp',
          title: s.className, sub: `${s.roomName} · ${s.coachName}`, canceled: s.status.startsWith('CANCELED'),
        })),
        // Suất 1-1 còn trống không chiếm lịch thật, chỉ hiện buổi đã có người giữ hoặc đặt
        ...slots.filter((s) => s.status === 'HELD' || s.status === 'BOOKED').map((s) => ({
          key: `o${s.id}`, date: iso(new Date(s.startAt)), start: localTime(s.startAt), end: localTime(s.endAt), kind: '1-1',
          title: `${s.sportName || 'Buổi 1-1'} · ${s.memberName}`, sub: `${s.roomName || ''} · ${s.coachName}`, canceled: false,
        })),
      ].sort((a, b) => a.start.localeCompare(b.start))))
      .catch((err) => toast.error(err.message || 'Không thể tải lịch tuần'))
  }, [token, toast, monday])

  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY))
  const shift = (weeks) => setMonday(new Date(monday.getTime() + weeks * 7 * DAY))
  const today = iso(new Date())

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Lịch Tuần {days[0].toLocaleDateString('vi-VN')} đến {days[6].toLocaleDateString('vi-VN')}</h2>
        <div className={styles.actions}>
          <button type="button" className={styles.btnAction} onClick={() => shift(-1)}>Tuần trước</button>
          <button type="button" className={styles.btnAction} onClick={() => setMonday(mondayOf(new Date()))}>Tuần này</button>
          <button type="button" className={styles.btnAction} onClick={() => shift(1)}>Tuần sau</button>
        </div>
      </div>
      {!items ? <p className={styles.hint}>Đang tải lịch tuần...</p> : (
        <>
          <p className={styles.hint}>
            {items.length === 0 ? 'Tuần này chưa có buổi nào.' : `Tuần này có ${items.filter((x) => x.kind === 'Lớp').length} buổi lớp và ${items.filter((x) => x.kind === '1-1').length} buổi 1-1 đã đặt. Buổi bị hủy bị gạch.`}
          </p>
          <div className={styles.weekGrid}>
            {days.map((d, i) => {
              const date = iso(d)
              const list = items.filter((x) => x.date === date)
              return (
                <div key={date} className={`${styles.weekDay} ${date === today ? styles.weekToday : ''}`}>
                  <strong>{DAY_LONG[i + 1]}</strong>
                  <div className={styles.hint}>{date.slice(8)}/{date.slice(5, 7)}</div>
                  {list.length === 0 && <span className={styles.hint}>Trống</span>}
                  {list.map((x) => (
                    <div key={x.key} className={`${styles.weekItem} ${x.canceled ? styles.weekCanceled : ''}`}>
                      <span className={styles.tag}>{x.kind}</span> <strong>{x.start}-{x.end}</strong><br />
                      {x.title}<br />
                      <span className={styles.hint}>{x.sub}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
