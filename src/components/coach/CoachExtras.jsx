import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { coachService } from '../../services/coachService'
import WeekGrid, { addDays, isoDay, mondayOf } from '../common/WeekGrid'
import coachStyles from '../../css/coach/CoachDashboard.module.css'

const hm = (v) => String(v).slice(0, 5)
const clock = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
const SLOT_LABEL = { OPEN: 'Suất trống', HELD: 'Chờ thanh toán', BOOKED: 'Đã đặt' }
const SLOT_TONE = { OPEN: 'muted', HELD: 'warn', BOOKED: 'ok' }

// Lịch dạy theo tuần của coach: buổi lớp và buổi 1-1 trung tâm xếp, chung một bảng
export function CoachWeekCalendar() {
  const { token } = useAuth()
  const [monday, setMonday] = useState(() => mondayOf(new Date()))
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setItems(null)
    setError('')
    const from = isoDay(monday)
    const to = isoDay(addDays(monday, 6))
    Promise.all([coachService.getMyClassSessions(token, from, to), coachService.getMy1On1Slots(token)])
      .then(([sessions, slots]) => setItems([
        ...sessions.map((s) => ({
          key: `c${s.sessionId}`, date: s.sessionDate, start: hm(s.startTime), end: hm(s.endTime), kind: s.makeup ? 'Bù' : 'Lớp',
          title: `${s.className} · buổi ${s.sessionNo}`, sub: s.roomName, canceled: s.status === 'CANCELED_BY_CENTER',
          status: s.status === 'CANCELED_BY_CENTER' ? { label: 'Đã hủy', tone: 'bad' } : null,
        })),
        ...slots.filter((s) => isoDay(new Date(s.startAt)) >= from && isoDay(new Date(s.startAt)) <= to).map((s) => ({
          key: `o${s.id}`, date: isoDay(new Date(s.startAt)), start: clock(s.startAt), end: clock(s.endAt), kind: '1-1',
          title: `${s.sportName || 'Buổi 1-1'}${s.memberName ? ` · ${s.memberName}` : ''}`, sub: s.roomName || '', canceled: false,
          status: { label: SLOT_LABEL[s.status] || s.status, tone: SLOT_TONE[s.status] || 'muted' },
        })),
      ]))
      .catch((err) => setError(err.message || 'Không thể tải lịch dạy'))
  }, [token, monday])

  return (
    <section className={coachStyles.panel}>
      <p className={coachStyles.muted}>Buổi lớp và buổi 1-1 trung tâm xếp cho bạn. Suất 1-1 chưa có người đặt cũng là giờ bạn phải có mặt.</p>
      <WeekGrid monday={monday} onMondayChange={setMonday} items={items} error={error} emptyText="Tuần này bạn chưa có buổi dạy nào." />
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
