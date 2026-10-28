import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { memberService } from '../../services/memberService'
import styles from '../../css/member/MemberDashboard.module.css'

const WEEKDAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const STATUS = { SCHEDULED: 'Đã lên lịch', DONE: 'Đã dạy', CANCELED_BY_CENTER: 'Trung tâm hủy' }
const iso = (d) => d.toISOString().slice(0, 10)
const dmy = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('vi-VN')

// Thời khóa biểu gộp buổi lớp và buổi 1-1 của hội viên (mặc định 7 ngày, tối đa 31 ngày)
export default function MemberTimetable() {
  const { token } = useAuth()
  const [range, setRange] = useState({ from: iso(new Date()), to: iso(new Date(Date.now() + 6 * 86400000)) })
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setItems(await memberService.getTimetable(token, range.from, range.to))
    } catch (err) {
      setItems(null)
      setError(err.message || 'Không thể tải thời khóa biểu')
    }
  }, [token, range])

  useEffect(() => {
    load()
  }, [load])

  const byDate = (items || []).reduce((acc, it) => ({ ...acc, [it.date]: [...(acc[it.date] || []), it] }), {})

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Thời Khóa Biểu</h2>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem' }}>Từ <input type="date" className={styles.input} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
        <label style={{ fontSize: '0.85rem' }}>Đến <input type="date" className={styles.input} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        <button type="button" className={styles.btnSecondary} onClick={load}>Xem</button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>Gồm buổi lớp và buổi 1-1 đã đặt, kể cả buổi học bù. Khoảng xem tối đa 31 ngày.</p>
      {error && <p role="alert" style={{ color: '#f87171' }}>{error}</p>}
      {items === null && !error && <p style={{ color: 'var(--text-muted)' }}>Đang tải...</p>}
      {items && items.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Không có buổi nào trong khoảng này.</p>}
      {Object.entries(byDate).map(([date, list]) => (
        <div key={date} style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem' }}>{WEEKDAY[new Date(`${date}T00:00:00`).getDay()]}, {dmy(date)}</h3>
          {list.map((it) => (
            <div key={`${it.type}-${it.refId}`} style={{ borderTop: '1px solid var(--border-color)', padding: '0.6rem 0', opacity: it.status === 'CANCELED_BY_CENTER' ? 0.6 : 1 }}>
              <strong>{it.startTime}-{it.endTime}</strong> · {it.type === 'ONE_ON_ONE' ? 'Buổi 1-1' : 'Lớp'}: {it.title}
              {it.roomName && ` · ${it.roomName}`} · coach {it.coachName}
              {it.makeup && <span style={{ color: '#fbbf24' }}> · buổi học bù</span>}
              {it.type === 'CLASS' && it.status !== 'SCHEDULED' && <span style={{ color: it.status === 'CANCELED_BY_CENTER' ? '#f87171' : 'var(--text-muted)' }}> · {STATUS[it.status] || it.status}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
