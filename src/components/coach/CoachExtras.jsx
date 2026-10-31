import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { coachService } from '../../services/coachService'
import coachStyles from '../../css/coach/CoachDashboard.module.css'

const DAY = 86400000
const isoDay = (d) => d.toLocaleDateString('sv-SE')
const hm = (v) => String(v).slice(0, 5)
const timeOf = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const SLOT_LABEL = { OPEN: 'Suất trống', HELD: 'Đang giữ chỗ', BOOKED: 'Đã đặt' }

function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

// Lịch dạy theo tuần của coach: buổi lớp và buổi 1-1 trung tâm xếp, chung một chỗ
export function CoachWeekCalendar() {
  const { token } = useAuth()
  const [monday, setMonday] = useState(() => mondayOf(new Date()))
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const sunday = new Date(monday.getTime() + 6 * DAY)
    setItems(null)
    setError('')
    Promise.all([coachService.getMyClassSessions(token, isoDay(monday), isoDay(sunday)), coachService.getMy1On1Slots(token)])
      .then(([sessions, slots]) => setItems([
        ...sessions.map((s) => ({
          key: `c${s.sessionId}`, date: s.sessionDate, start: hm(s.startTime), end: hm(s.endTime), kind: 'Lớp',
          title: `${s.className} · buổi ${s.sessionNo}${s.makeup ? ' (bù)' : ''}`, sub: s.roomName, canceled: s.status === 'CANCELED_BY_CENTER',
        })),
        ...slots.filter((s) => isoDay(new Date(s.startAt)) >= isoDay(monday) && isoDay(new Date(s.startAt)) <= isoDay(sunday)).map((s) => ({
          key: `o${s.id}`, date: isoDay(new Date(s.startAt)), start: timeOf(s.startAt), end: timeOf(s.endAt), kind: '1-1',
          title: `${s.sportName || 'Buổi 1-1'} · ${s.memberName || SLOT_LABEL[s.status] || s.status}`, sub: s.roomName || '', canceled: false,
        })),
      ].sort((a, b) => a.start.localeCompare(b.start))))
      .catch((err) => setError(err.message || 'Không thể tải lịch dạy'))
  }, [token, monday])

  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY))
  const today = isoDay(new Date())
  return (
    <section className={coachStyles.panel}>
      <div className={coachStyles.sectionHeading}>
        <div><h2>Tuần {days[0].toLocaleDateString('vi-VN')} – {days[6].toLocaleDateString('vi-VN')}</h2>
          <p className={coachStyles.muted}>Buổi lớp và buổi 1-1 trung tâm xếp cho bạn. Suất 1-1 chưa có người đặt cũng là giờ bạn phải có mặt.</p></div>
        <div className={coachStyles.actions}>
          <button className={coachStyles.button} onClick={() => setMonday(new Date(monday.getTime() - 7 * DAY))}>Tuần trước</button>
          <button className={coachStyles.button} onClick={() => setMonday(mondayOf(new Date()))}>Tuần này</button>
          <button className={coachStyles.button} onClick={() => setMonday(new Date(monday.getTime() + 7 * DAY))}>Tuần sau</button>
        </div>
      </div>
      {error ? <p role="alert" className={coachStyles.error}>{error}</p> : items === null ? <p role="status">Đang tải lịch dạy…</p> : (
        <div className={coachStyles.weekGrid}>
          {days.map((d, i) => {
            const date = isoDay(d)
            const list = items.filter((x) => x.date === date)
            return (
              <div key={date} className={coachStyles.weekDay} data-today={date === today}>
                <strong>{WEEKDAYS[i]}</strong> <span className={coachStyles.muted}>{date.slice(8)}/{date.slice(5, 7)}</span>
                {list.length === 0 ? <p className={coachStyles.muted}>Trống</p> : list.map((x) => (
                  <div key={x.key} className={coachStyles.weekItem} data-canceled={x.canceled}>
                    <span className={coachStyles.weekTag}>{x.kind}</span> <strong>{x.start}–{x.end}</strong>
                    <div>{x.title}</div>
                    <small className={coachStyles.muted}>{x.sub}</small>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function CoachProfileCard({ user }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ specialty: '', yearsExperience: '', certifications: '' })
  const [rank, setRank] = useState('')

  useEffect(() => {
    authService.getMe(token).then((me) => {
      const p = me?.coachProfile || {}
      setForm({ specialty: p.specialty || '', yearsExperience: p.yearsExperience ?? '', certifications: p.certifications || '' })
      setRank(p.coachRank || p.rank || '')
    }).catch(() => {})
  }, [token])

  const save = async (e) => {
    e.preventDefault()
    try {
      await authService.updateCoachProfile(token, {
        specialty: form.specialty,
        yearsExperience: form.yearsExperience === '' ? null : Number(form.yearsExperience),
        certifications: form.certifications,
      })
      toast.success('Đã cập nhật hồ sơ coach')
    } catch (err) {
      toast.error(err.message || 'Cập nhật hồ sơ thất bại')
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const info = [['Họ tên', user?.fullName], ['Email', user?.email], ['Điện thoại', user?.phone], ['Hạng', rank]]

  return (
    <section className={coachStyles.panel}>
      <h2>Hồ sơ huấn luyện viên</h2>
      <dl className={coachStyles.profile}>
        {info.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}
      </dl>
      <form onSubmit={save} className={coachStyles.profileForm}>
        <label>Chuyên môn<input value={form.specialty} onChange={set('specialty')} /></label>
        <label>Năm kinh nghiệm<input type="number" min="0" value={form.yearsExperience} onChange={set('yearsExperience')} /></label>
        <label>Chứng chỉ<input value={form.certifications} onChange={set('certifications')} /></label>
        <button type="submit" className={coachStyles.primaryButton}>Lưu hồ sơ</button>
      </form>
    </section>
  )
}
