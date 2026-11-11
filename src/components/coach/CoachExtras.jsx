import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { coachService } from '../../services/coachService'
import WeekGrid, { addDays, isoDay, mondayOf } from '../common/WeekGrid'
import coachStyles from '../../css/coach/CoachDashboard.module.css'

const hm = (v) => String(v).slice(0, 5)
const clock = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
const SLOT_LABEL = { OPEN: 'Suất trống', HELD: 'Chờ thanh toán', BOOKED: 'Buổi 1-1', DONE: 'Đã dạy', CANCELED: 'Đã hủy' }
const SLOT_TONE = { OPEN: 'muted', HELD: 'warn', BOOKED: 'one-on-one', DONE: 'ok', CANCELED: 'bad' }
const ATT = { PRESENT: 'Có mặt', ABSENT: 'Vắng', LATE: 'Muộn', EXCUSED: 'Có phép', DECLINED_MAKEUP: 'Từ chối buổi bù' }
const attSummary = (list) => list.length ? Object.entries(ATT).map(([k, label]) => [label, list.filter((a) => a.status === k).length]).filter(([, n]) => n).map(([label, n]) => `${label} ${n}`).join(' · ') : 'Chưa có điểm danh'

// Trạng thái buổi dạy thực tế của Coach: tính toán kết hợp thời gian kết thúc buổi với trạng thái backend
function coachSessionStatus(s) {
  if (s.canceled || s.status === 'CANCELED' || s.status === 'CANCELED_BY_CENTER' || s.teachingStatus === 'CANCELED') {
    return { label: 'Đã hủy', tone: 'bad' }
  }
  if (s.teachingStatus === 'TAUGHT' || s.status === 'DONE') {
    return { label: 'Đã dạy', tone: 'ok' }
  }
  const endIso = s.endAt ? new Date(s.endAt).getTime() : new Date(`${s.date || s.sessionDate}T${s.end || s.endTime}:00+07:00`).getTime()
  const isPast = !isNaN(endIso) && endIso <= Date.now()
  if (isPast) {
    return { label: 'Đã hoàn thành', tone: 'ok' }
  }
  return { label: 'Sắp dạy', tone: 'next' }
}

// Lịch dạy theo tuần của coach: buổi lớp và buổi 1-1 trung tâm xếp, chung một bảng
export function CoachWeekCalendar() {
  const { token } = useAuth()
  const [monday, setMonday] = useState(() => mondayOf(new Date()))
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    setItems(null)
    setError('')
    const from = isoDay(monday)
    const to = isoDay(addDays(monday, 6))
    Promise.all([coachService.getMyClassSessions(token, from, to), coachService.getMy1On1Slots(token)])
      .then(([sessions, slots]) => { setSessions(sessions); setItems([
        ...sessions.map((s) => ({
          key: `c${s.sessionId}`, date: s.sessionDate, start: hm(s.startTime), end: hm(s.endTime), kind: s.makeup ? 'Bù' : 'Lớp',
          title: `${s.className} · buổi ${s.sessionNo}`, sub: `${s.roomName || ''} · ${attSummary(s.attendance || [])}`, canceled: s.status === 'CANCELED_BY_CENTER', teaching: s.teachingStatus,
          status: coachSessionStatus(s),
        })),
        ...slots.filter((s) => isoDay(new Date(s.startAt)) >= from && isoDay(new Date(s.startAt)) <= to).map((s) => ({
          key: `o${s.id}`, date: isoDay(new Date(s.startAt)), start: clock(s.startAt), end: clock(s.endAt), kind: '1-1',
          title: `${s.sportName || 'Buổi 1-1'}${s.memberName ? ` · ${s.memberName}` : ''}`, sub: s.roomName || '', canceled: false, teaching: s.teachingStatus,
          status: s.status === 'BOOKED' ? coachSessionStatus(s) : { label: SLOT_LABEL[s.status] || s.status, tone: SLOT_TONE[s.status] || 'muted' },
        })),
      ]) })
      .catch((err) => setError(err.message || 'Không thể tải lịch dạy'))
  }, [token, monday])

  const shownSessions = sessions.filter((s) => filter === 'all' || s.teachingStatus === filter)
  return (
    <section className={coachStyles.panel}>
      <p className={coachStyles.muted}>Buổi lớp và buổi 1-1 trung tâm xếp cho bạn. Buổi 1-1 chỉ xuất hiện khi hội viên đã được duyệt yêu cầu, hãy có mặt đúng giờ.</p>
      <label>Hiển thị <select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Tất cả</option><option value="NOT_TAUGHT">Chưa hoàn tất</option><option value="TAUGHT">Đã dạy</option></select></label>
      <WeekGrid monday={monday} onMondayChange={setMonday} items={items && items.filter((i) => filter === 'all' || (filter === 'TAUGHT' ? i.status?.tone === 'ok' : i.status?.tone !== 'ok'))} error={error} emptyText="Tuần này bạn chưa có buổi dạy nào." />
      {shownSessions.length ? <div><h3>Điểm danh các buổi lớp trong tuần</h3>{shownSessions.map((s) => <details key={s.sessionId}><summary>{s.sessionDate} {hm(s.startTime)} · {s.className} · buổi {s.sessionNo} · {coachSessionStatus(s).label} · {attSummary(s.attendance || [])}</summary>{(s.attendance || []).length ? <ul>{s.attendance.map((a) => <li key={a.attendanceId}>{a.memberName}: {ATT[a.status] || a.status}{a.notes ? ` · ${a.notes}` : ''}</li>)}</ul> : <p className={coachStyles.muted}>Chưa có điểm danh.</p>}</details>)}</div> : null}
    </section>
  )
}

export function CoachProfileCard({ user }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ specialty: '', yearsExperience: '', certifications: '' })
  // Các môn quản lý gán cho coach, chỉ để xem; coach không tự sửa vì nó quyết định quyền được xếp lịch dạy
  const [sports, setSports] = useState([])

  useEffect(() => {
    authService.getMe(token).then((me) => {
      const p = me?.coachProfile || {}
      setForm({ specialty: p.specialty || '', yearsExperience: p.yearsExperience ?? '', certifications: p.certifications || '' })
      setSports((p.sports || []).map((s) => s.name))
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
  const info = [['Họ tên', user?.fullName], ['Email', user?.email], ['Điện thoại', user?.phone], ['Môn được dạy', sports.join(', ') || 'Quản lý chưa gán môn nào']]

  return (
    <section className={coachStyles.panel}>
      <h2>Hồ sơ huấn luyện viên</h2>
      <dl className={coachStyles.profile}>
        {info.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}
      </dl>
      <form onSubmit={save} className={coachStyles.profileForm}>
        <label>Năm kinh nghiệm<input type="number" min="0" value={form.yearsExperience} onChange={set('yearsExperience')} /></label>
        <label>Chứng chỉ<input value={form.certifications} onChange={set('certifications')} /></label>
        <button type="submit" className={coachStyles.primaryButton}>Lưu hồ sơ</button>
      </form>
    </section>
  )
}
