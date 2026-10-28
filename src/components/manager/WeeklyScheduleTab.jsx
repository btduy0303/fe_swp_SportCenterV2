import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { DAY_LONG, hhmm } from '../../utils/schedule'
import styles from '../../css/manager/ManagerDashboard.module.css'

const DAY = 86400000
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

// Lịch tuần: mọi buổi học của mọi lớp, xếp theo ngày để thấy cả tuần có gì
export default function WeeklyScheduleTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [sessions, setSessions] = useState(null)
  const [monday, setMonday] = useState(() => mondayOf(new Date()))

  useEffect(() => {
    managerService.getClasses(token)
      .then((classes) => Promise.all(classes.filter((c) => !['DRAFT', 'CANCELED'].includes(c.status))
        .map((c) => managerService.getClassSessions(token, c.id).then((list) => list.map((s) => ({ ...s, className: c.name }))))))
      .then((lists) => setSessions(lists.flat()))
      .catch((err) => toast.error(err.message || 'Không thể tải lịch tuần'))
  }, [token, toast])

  if (!sessions) return <p style={{ color: 'var(--text-muted)' }}>Đang tải lịch tuần...</p>

  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY))
  const shift = (weeks) => setMonday(new Date(monday.getTime() + weeks * 7 * DAY))
  const today = iso(new Date())
  const total = sessions.filter((s) => s.sessionDate >= iso(days[0]) && s.sessionDate <= iso(days[6])).length

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Lịch Tuần {iso(days[0])} đến {iso(days[6])}</h2>
        <div className={styles.actions}>
          <button type="button" className={styles.btnAction} onClick={() => shift(-1)}>Tuần trước</button>
          <button type="button" className={styles.btnAction} onClick={() => setMonday(mondayOf(new Date()))}>Tuần này</button>
          <button type="button" className={styles.btnAction} onClick={() => shift(1)}>Tuần sau</button>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        {total === 0 ? 'Tuần này chưa có buổi học nào.' : `Tuần này có ${total} buổi học. Buổi bị hủy hiện màu đỏ.`}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
        {days.map((d, i) => {
          const date = iso(d)
          const list = sessions.filter((s) => s.sessionDate === date).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
          return (
            <div key={date} style={{ border: `1px solid ${date === today ? 'var(--accent, #ff4d00)' : 'var(--border-color)'}`, padding: '0.75rem', minHeight: 140 }}>
              <strong>{DAY_LONG[i + 1]}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.6rem' }}>{date.slice(8)}/{date.slice(5, 7)}</div>
              {list.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Trống</span>}
              {list.map((s) => (
                <div key={s.id} style={{ borderLeft: `3px solid ${s.status.startsWith('CANCELED') ? '#f87171' : 'var(--accent, #ff4d00)'}`, paddingLeft: '0.5rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                  <strong>{hhmm(s.startTime)}-{hhmm(s.endTime)}</strong><br />
                  {s.className}<br />
                  <span style={{ color: 'var(--text-muted)' }}>{s.roomName} · {s.coachName}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
