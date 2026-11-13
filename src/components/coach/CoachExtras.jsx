import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { coachService } from '../../services/coachService'
import { Link } from 'react-router-dom'
import WeekGrid, { addDays, isoDay, mondayOf } from '../common/WeekGrid'
import PaginatedList from '../../pages/training/PaginatedList'
import { displayDate } from '../../pages/training/trainingUtils'
import coachStyles from '../../css/coach/CoachDashboard.module.css'

const hm = (v) => String(v).slice(0, 5)
const clock = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
const sessionUrl = (id) => `/coach/training?tab=sessions&session=${id}`

// Buổi lớp đã kết thúc chưa (giờ trung tâm)
const classEnded = (s) => new Date(`${s.sessionDate}T${hm(s.endTime)}:00+07:00`).getTime() <= Date.now()

// Tình trạng điểm danh của một buổi lớp, nói bằng lời cho coach
function attendanceText(s) {
  if (s.status === 'CANCELED_BY_CENTER') return 'Buổi đã hủy'
  if (s.finalized) return `Đã chốt điểm danh (${s.marked}/${s.members})`
  if (s.marked) return `Đã điểm danh ${s.marked}/${s.members}, chưa chốt`
  return classEnded(s) ? 'Chưa điểm danh' : `${s.members} học viên`
}

// Chuẩn hóa buổi lớp và buổi 1-1 về một dạng để vẽ lịch tuần và danh sách
function toScheduleItems(sessions, slots) {
  return [
    ...sessions.map((s) => {
      const canceled = s.status === 'CANCELED_BY_CENTER'
      const ended = classEnded(s)
      const missing = ended && !canceled && !s.finalized
      return {
        key: `c${s.sessionId}`, date: s.sessionDate, start: hm(s.startTime), end: hm(s.endTime), kind: s.makeup ? 'Bù' : 'Lớp',
        title: `${s.className} · buổi ${s.sessionNo}`, sub: `${s.roomName} · ${attendanceText(s)}`, canceled, ended,
        status: canceled ? { label: 'Đã hủy', tone: 'bad' } : ended ? { label: missing ? 'Đã dạy · cần chốt' : 'Đã dạy', tone: missing ? 'warn' : 'ok' } : { label: 'Chưa dạy', tone: 'next' },
        to: canceled ? null : sessionUrl(s.sessionId), toLabel: ended ? (s.finalized ? 'Xem điểm danh' : 'Điểm danh') : 'Xem buổi',
      }
    }),
    ...slots.map((s) => {
      const ended = new Date(s.endAt).getTime() <= Date.now()
      const held = s.status === 'HELD'
      const room = s.roomName ? `${s.roomName}${s.floor ? ` (${s.floor})` : ''}` : 'Chưa xếp phòng'
      return {
        key: `o${s.id}`, date: isoDay(new Date(s.startAt)), start: clock(s.startAt), end: clock(s.endAt), kind: '1-1',
        title: `1-1 ${s.sportName || ''} · ${s.memberName || 'Chưa có học viên'}`,
        sub: [room, s.seriesNo ? `buổi ${s.seriesNo}/${s.seriesTotal}` : null, s.seriesTotal ? `học viên đã học ${s.seriesDone}/${s.seriesTotal}` : null].filter(Boolean).join(' · '),
        canceled: false, ended,
        status: held ? { label: 'Chờ hội viên trả tiền', tone: 'warn' } : ended ? { label: 'Đã dạy', tone: 'ok' } : { label: 'Chưa dạy', tone: 'next' },
      }
    }),
  ]
}

// Lịch dạy theo tuần của coach: buổi lớp và buổi 1-1 chung một bảng, mỗi buổi ghi đã dạy hay chưa và tình trạng điểm danh
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
      .then(([sessions, slots]) => setItems(toScheduleItems(sessions, slots.filter((s) => isoDay(new Date(s.startAt)) >= from && isoDay(new Date(s.startAt)) <= to))
        .map((x) => (x.to ? { ...x, action: <Link className={coachStyles.textLink} to={x.to}>{x.toLabel} →</Link> } : x))))
      .catch((err) => setError(err.message || 'Không thể tải lịch dạy'))
  }, [token, monday])

  return (
    <section className={coachStyles.panel}>
      <p className={coachStyles.muted}>Buổi lớp và buổi 1-1 của bạn trong tuần. Xanh là đã dạy, vàng là việc cần làm (chốt điểm danh, chờ hội viên trả tiền), đỏ là buổi bị hủy. Bấm vào buổi lớp để điểm danh.</p>
      <WeekGrid monday={monday} onMondayChange={setMonday} items={items} error={error} emptyText="Tuần này bạn chưa có buổi dạy nào."
        legend={[['Lớp', 'Buổi của lớp'], ['Bù', 'Buổi học bù'], ['1-1', 'Buổi kèm riêng']]} />
    </section>
  )
}

// Danh sách buổi chưa dạy và đã dạy (30 ngày trước đến 30 ngày tới), kèm tình trạng điểm danh
export function CoachSessionLists() {
  const { token } = useAuth()
  const [tab, setTab] = useState('upcoming')
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const today = new Date()
    Promise.all([coachService.getMyClassSessions(token, isoDay(addDays(today, -30)), isoDay(addDays(today, 30))), coachService.getMy1On1Slots(token)])
      .then(([sessions, slots]) => setItems(toScheduleItems(sessions, slots)))
      .catch((err) => setError(err.message || 'Không thể tải danh sách buổi'))
  }, [token])

  const upcoming = (items || []).filter((x) => !x.ended && !x.canceled).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const done = (items || []).filter((x) => x.ended || x.canceled).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
  const list = tab === 'upcoming' ? upcoming : done
  const needFinalize = done.filter((x) => x.status.tone === 'warn').length

  return (
    <section className={coachStyles.panel}>
      <h2>Buổi chưa dạy và đã dạy</h2>
      <p className={coachStyles.muted}>Từ 30 ngày trước đến 30 ngày tới.{needFinalize ? ` Có ${needFinalize} buổi đã dạy chưa chốt điểm danh.` : ''}</p>
      <div className={coachStyles.filterTabs} role="group" aria-label="Lọc buổi">
        <button type="button" aria-pressed={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Chưa dạy ({upcoming.length})</button>
        <button type="button" aria-pressed={tab === 'done'} onClick={() => setTab('done')}>Đã dạy ({done.length})</button>
      </div>
      {error ? <p role="alert" className={coachStyles.error}>{error}</p> : items === null ? <p role="status" className={coachStyles.muted}>Đang tải...</p>
        : list.length === 0 ? <p className={coachStyles.empty}>{tab === 'upcoming' ? 'Không có buổi nào sắp tới.' : 'Chưa có buổi nào đã dạy trong 30 ngày qua.'}</p> : (
          <PaginatedList items={list} label="buổi dạy">{(visible) => (
            <div className={coachStyles.tableWrap}><table className={coachStyles.table}>
              <thead><tr><th>Ngày</th><th>Giờ</th><th>Buổi</th><th>Phòng · Điểm danh</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>{visible.map((x) => (
                <tr key={x.key}>
                  <td>{displayDate(x.date)}</td><td>{x.start}–{x.end}</td><td><strong>{x.title}</strong></td><td>{x.sub}</td>
                  <td><span className={coachStyles.status} data-tone={x.status.tone}>{x.status.label}</span></td>
                  <td>{x.to ? <Link className={coachStyles.textLink} to={x.to}>{x.toLabel}</Link> : null}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}</PaginatedList>
        )}
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
