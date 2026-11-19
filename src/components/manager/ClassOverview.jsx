import React from 'react'
import { formatVND, formatDate } from '../../utils/format'
import { sessionEnded } from '../../utils/schedule'
import s from '../../css/manager/ClassOverview.module.css'

const LEVELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' }
const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const hm = (t) => String(t).slice(0, 5)
const weekday = (iso) => WEEKDAYS[new Date(`${iso}T00:00:00`).getDay()]

// Tổng quan một lớp đã mở: số liệu nhanh, việc cần xử lý, buổi kế tiếp và thông tin lớp.
// onGo(tab): chuyển sang tab khác của trang lớp (null thì không hiện nút chuyển)
export default function ClassOverview({ cls, sessions, weekText, roster, waitlist, perf, onGo }) {
  const registered = roster.filter((r) => r.status === 'REGISTERED').length
  const pending = roster.filter((r) => r.status === 'PENDING_PAYMENT').length
  const seats = perf?.reservedSeats ?? registered + pending

  const done = sessions.filter((x) => x.status === 'DONE').length
  const upcoming = sessions.filter((x) => x.status === 'SCHEDULED' && !sessionEnded(x))
  const awaiting = sessions.filter((x) => x.status === 'SCHEDULED' && sessionEnded(x)).length
  const kept = sessions.filter((x) => x.status === 'SCHEDULED' || x.status === 'DONE')
  const endDate = kept.reduce((max, x) => (x.sessionDate > max ? x.sessionDate : max), '')

  // Cùng cách đếm với backend: số buổi bù còn hiệu lực chưa đủ bù cho các buổi trung tâm đã hủy
  const canceled = sessions.filter((x) => x.status === 'CANCELED_BY_CENTER' && !x.makeup).length
  const madeUp = sessions.filter((x) => x.makeup && kept.includes(x)).length
  const needMakeup = Math.max(0, canceled - madeUp)

  const unmarked = perf ? Math.max(0, (perf.sessionsPast ?? 0) - (perf.sessionsMarked ?? 0)) : 0

  const next = upcoming
    .filter((x) => new Date(`${x.sessionDate}T${hm(x.endTime)}`) > new Date())
    .sort((a, b) => `${a.sessionDate}${a.startTime}`.localeCompare(`${b.sessionDate}${b.startTime}`))[0]

  const alerts = []
  if (needMakeup > 0) alerts.push({ key: 'makeup', text: `${needMakeup} buổi bị hủy chưa xếp học bù`, go: 'schedule', label: 'Xếp học bù' })
  if (unmarked > 0) alerts.push({ key: 'unmarked', text: `${unmarked} buổi đã diễn ra mà coach chưa điểm danh` })

  const studentNotes = [pending > 0 && `${pending} chờ thanh toán`, waitlist.length > 0 && `${waitlist.length} trong hàng chờ`].filter(Boolean)

  return (
    <div className={s.wrap}>
      <div className={s.kpis}>
        <div className={s.kpi}>
          <span>Học viên</span>
          <b>{seats}/{cls.maxCapacity}</b>
          <small>{studentNotes.length ? studentNotes.join(' · ') : 'Không ai chờ thanh toán hay trong hàng chờ'}</small>
        </div>
        <div className={s.kpi}>
          <span>Buổi học</span>
          <b>{done}/{cls.totalSessions}</b>
          <small>{done} đã diễn ra{awaiting > 0 ? ` · ${awaiting} chờ chốt điểm danh` : ''} · {upcoming.length} sắp diễn ra</small>
        </div>
        <div className={s.kpi}>
          <span>Chuyên cần</span>
          <b>{perf?.attendanceRate != null ? `${perf.attendanceRate}%` : '—'}</b>
          <small>{perf?.attendanceRate != null ? `${perf.sessionsMarked} buổi đã điểm danh` : 'Chưa có buổi nào được điểm danh'}</small>
        </div>
        <div className={s.kpi}>
          <span>Học phí</span>
          <b>{formatVND(cls.tuition)}</b>
          <small>cho mỗi học viên</small>
        </div>
      </div>

      <h3 className={s.heading}>Việc cần xử lý</h3>
      {alerts.length === 0 ? <p className={s.muted}>Hiện không có việc nào cần xử lý.</p> : (
        <ul className={s.alerts}>
          {alerts.map((a) => (
            <li key={a.key}>
              <span>{a.text}</span>
              {a.go && onGo && <button type="button" className={s.link} onClick={() => onGo(a.go)}>{a.label}</button>}
            </li>
          ))}
        </ul>
      )}

      <h3 className={s.heading}>Buổi kế tiếp</h3>
      {next
        ? <p className={s.next}><b>{weekday(next.sessionDate)}, {formatDate(next.sessionDate)}</b> · {hm(next.startTime)}-{hm(next.endTime)} · {next.roomName} · Coach {next.coachName}{next.makeup ? ' · Buổi học bù' : ''}</p>
        : <p className={s.muted}>Lớp không còn buổi nào sắp diễn ra.</p>}

      <h3 className={s.heading}>Thông tin lớp</h3>
      <dl className={s.info}>
        <dt>Môn</dt><dd>{cls.categoryName}{cls.level ? ` · ${LEVELS[cls.level] || cls.level}` : ''}</dd>
        <dt>Coach</dt><dd>{cls.coachName}</dd>
        <dt>Lịch hằng tuần</dt><dd>{weekText || 'Chưa có'}</dd>
        <dt>Khai giảng</dt><dd>{formatDate(cls.startDate)}</dd>
        <dt>Dự kiến kết thúc</dt><dd>{endDate ? formatDate(endDate) : 'Chưa có buổi học'}</dd>
        {cls.description && <><dt>Mô tả</dt><dd>{cls.description}</dd></>}
      </dl>
    </div>
  )
}
