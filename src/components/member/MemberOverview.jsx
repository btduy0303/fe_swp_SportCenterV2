import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarPlus, Check, Clock3, Flame, Minus, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { memberService } from '../../services/memberService'
import { useTrainingData } from '../../pages/training/useTrainingData'
import { addDays, buildWeek, dateKey, mondayOf, recentWeeks, streak, tierInfo } from '../../utils/overview'
import { formatDate, lastUsableDate, subscriptionProgress } from '../../utils/format'
import MemberTimetable from './MemberTimetable'
import TierLadder from './TierLadder'
import styles from '../../css/member/MemberOverview.module.css'

const DAY_ICON = { ok: Check, now: Flame, miss: X, plan: Clock3, rest: Minus }
const SUB_STATUS = { ACTIVE: 'Đang sử dụng', PENDING: 'Chờ thanh toán', SCHEDULED: 'Chờ bắt đầu' }
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const RESULT_LABEL = { y: 'Có mặt', a: 'Vắng', e: 'Có phép', n: 'Không có buổi' }
const dm = (key) => `${key.slice(8)}/${key.slice(5, 7)}`

function greeting(hour) {
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 14) return 'Chào buổi trưa'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

// Trang Tổng quan: banner tuần này, tỷ lệ tham dự, lịch điểm danh 5 tuần, gói tập và lớp đang học.
// subscription, classRegistrations đã được MemberDashboard tải sẵn; điểm danh lấy từ /api/member/training.
export default function MemberOverview({ user, subscriptions, packages, classRegistrations, onGo }) {
  const { token } = useAuth()
  const [today] = useState(() => new Date())
  const [timetable, setTimetable] = useState(null)
  const [timetableFailed, setTimetableFailed] = useState(false)
  const { data, error } = useTrainingData(token, 'member/training')

  useEffect(() => {
    const monday = mondayOf(today)
    memberService.getTimetable(token, dateKey(monday), dateKey(addDays(monday, 6)))
      .then(setTimetable)
      .catch(() => { setTimetable([]); setTimetableFailed(true) })
  }, [token, today])

  const attendance = data?.attendance?.items
  const ready = !!attendance && timetable !== null
  const week = ready ? buildWeek(today, timetable, attendance) : null
  const streakCount = ready ? streak(attendance, today) : 0
  const cells = ready ? recentWeeks(today, attendance) : []
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  const stats = data?.statistics
  const dateLine = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(today)
  const remaining = week ? week.total - week.done : 0
  const goalPercent = week && week.total ? Math.round((week.done / week.total) * 100) : 0
  const active = subscriptions.find((x) => x.status === 'ACTIVE')
  const pending = subscriptions.find((x) => x.status === 'PENDING')
  const scheduled = subscriptions.find((x) => x.status === 'SCHEDULED')
  const current = active || pending || scheduled || null
  const { tiers, index: tierIndex, next: nextTier } = tierInfo(packages, current?.tierLevel)
  const progress = active?.startDate && active?.endDate ? subscriptionProgress(active.startDate, active.endDate) : null
  const activeClasses = classRegistrations.filter((r) => r.status === 'REGISTERED' && r.classStatus !== 'COMPLETED' && r.classStatus !== 'CANCELED')

  let subLine = 'Đặt lớp để bắt đầu tuần mới.'
  if (week?.todaySession) subLine = `Hôm nay có ${week.todaySession.title} lúc ${week.todaySession.startTime}.`
  else if (remaining > 0) subLine = `Còn ${remaining} buổi nữa trong tuần này.`
  else if (week?.total) subLine = 'Bạn đã hoàn thành các buổi của tuần này.'

  return (
    <div className={styles.overview}>
      <section className={styles.hero} aria-label="Tuần này của bạn">
        <div className={styles.slab}>
          {streakCount ? <><strong>{streakCount}</strong><span>buổi liên tiếp</span></> : <span>Bắt đầu chuỗi buổi tập đầu tiên</span>}
        </div>
        <svg className={styles.art} viewBox="0 0 190 110" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <g transform="rotate(-18 60 62)"><rect x="8" y="48" width="12" height="28" rx="2" /><rect x="20" y="40" width="12" height="44" rx="2" /><line x1="32" y1="62" x2="88" y2="62" /><rect x="88" y="40" width="12" height="44" rx="2" /><rect x="100" y="48" width="12" height="28" rx="2" /></g>
          <path d="M132 50c-14 0-22 10-22 24 0 14 10 24 24 24s24-10 24-24c0-14-8-24-22-24z" /><path d="M122 52c0-12 6-18 12-18s12 6 12 18" /><line x1="124" y1="80" x2="144" y2="80" />
          <circle cx="168" cy="26" r="13" /><line x1="168" y1="26" x2="168" y2="18" /><line x1="168" y1="26" x2="174" y2="29" /><line x1="165" y1="9" x2="171" y2="9" />
        </svg>
        <div className={styles.heroText}>
          <p className={styles.dateLine}>{dateLine} · {greeting(today.getHours())}, {user?.fullName || 'Hội viên'}</p>
          <div className={styles.headline} role="heading" aria-level={1}>
            {week && !timetableFailed ? (week.total ? <>Tuần này <em>{week.done}/{week.total}</em> buổi</> : 'Tuần này chưa có buổi') : 'Tuần này của bạn'}
          </div>
          <p className={styles.sub}>{error ? 'Chưa tải được dữ liệu tập luyện.' : timetableFailed ? 'Chưa tải được thời khóa biểu tuần này.' : subLine}</p>
        </div>

        {ready ? (
          <>
            <ol className={styles.week} aria-label="Bảy ngày trong tuần">
              {week.days.map((d) => {
                const Icon = DAY_ICON[d.state]
                return (
                  <li key={d.key} className={`${styles.day} ${styles[`day_${d.state}`]}`} aria-current={d.state === 'now' ? 'date' : undefined}>
                    <b>{d.label}</b><Icon size={20} aria-hidden="true" /><span>{d.note}</span>
                  </li>
                )
              })}
            </ol>
            <div className={styles.goal}>
              <span>Buổi đã đi trong tuần</span>
              <div className={styles.bar} role="img" aria-label={`Đã đi ${week.done} trên ${week.total} buổi`}><i style={{ width: `${goalPercent}%` }} /></div>
              <span>{week.done}/{week.total} buổi</span>
            </div>
          </>
        ) : <div className={styles.skeleton} aria-busy="true" aria-label="Đang tải lịch tuần" />}

        <div className={styles.pkg}>
          {current ? (
            <>
              {tiers.length ? (
                <TierLadder count={tiers.length} index={tierIndex} />
              ) : null}
              <div className={styles.pkgInfo}>
                <div className={styles.pkgHead}>
                  <strong className={styles.pkgName}>{current.packageName || 'Gói tập'}</strong>
                  {tiers.length ? <span className={styles.rank}>HẠNG {tierIndex}/{tiers.length}</span> : null}
                  <span className={`${styles.chip} ${current.status === 'ACTIVE' ? styles.chipOk : styles.chipWarn}`}>{SUB_STATUS[current.status] || current.status}</span>
                </div>
                {progress ? (
                  <div className={styles.goal}>
                    <span>Gói đã dùng {progress.percent}%</span>
                    <div className={styles.bar} role="img" aria-label={`Đã dùng ${progress.percent}% gói`}><i style={{ width: `${Math.max(2, progress.percent)}%` }} /></div>
                    <span className={progress.daysLeft <= 7 ? styles.warnText : ''}>{progress.daysLeft <= 7 ? `Sắp hết hạn, còn ${progress.daysLeft} ngày` : `Còn ${progress.daysLeft} ngày`}</span>
                  </div>
                ) : <p className={styles.muted}>{current.endDate ? `Dùng đến hết ${lastUsableDate(current.endDate)}` : 'Ngày bắt đầu có sau khi thanh toán'}</p>}
                {pending && pending.id !== current.id ? <p className={styles.notice}>Bạn có đơn {pending.packageName} đang chờ thanh toán.</p> : null}
                {scheduled && scheduled.id !== current.id ? <p className={styles.notice}>Gói kế tiếp: {scheduled.packageName}, bắt đầu {formatDate(scheduled.startDate)}.</p> : null}
              </div>
              {tiers.length ? (
                <div className={styles.nextTier}>
                  {nextTier ? (
                    <><span>Hạng kế tiếp</span><button type="button" onClick={() => onGo('subscription')}>{nextTier.name}<ArrowUpRight size={16} aria-hidden="true" /></button></>
                  ) : <><span>Hạng cao nhất</span><strong>Bạn đang ở đỉnh</strong></>}
                </div>
              ) : null}
            </>
          ) : <p className={styles.muted}>Bạn chưa có gói hội viên. Chọn một gói để đăng ký lớp và nhận ưu đãi học phí.</p>}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cta} onClick={() => onGo('classes')}><CalendarPlus size={17} aria-hidden="true" />Đặt lớp</button>
          <button type="button" className={styles.textLink} onClick={() => onGo('subscription')}>{!current ? 'Chọn gói tập' : current.status === 'PENDING' ? 'Thanh toán đơn chờ' : 'Gia hạn gói'}</button>
        </div>
        <div className={styles.stripe} aria-hidden="true" />
      </section>

      <section className={styles.timetable} aria-label="Thời khóa biểu">
        <h2 className={styles.sectionTitle}>Thời khóa biểu</h2>
        <MemberTimetable />
      </section>

      <div className={styles.grid2}>
        <section className={styles.card} aria-label="Tỷ lệ tham dự">
          <h2 className={styles.cardTitle}>Tỷ lệ tham dự</h2>
          {stats?.attendanceRate == null ? <p className={styles.muted}>Chưa có dữ liệu. Tỷ lệ hiện sau buổi đầu tiên được điểm danh.</p> : (
            <>
              <p className={styles.rate}>{Math.round(stats.attendanceRate)}%</p>
              <p className={styles.muted}>Buổi có mặt trên số buổi đã điểm danh</p>
              <div className={styles.bar} role="img" aria-label={`Tỷ lệ tham dự ${stats.attendanceRate}%`}><i style={{ width: `${stats.attendanceRate}%` }} /></div>
            </>
          )}
          <dl className={styles.mini}>
            <div><dt>Buổi đã đi</dt><dd>{stats ? `${stats.attendedSessions}/${stats.markedSessions}` : '—'}</dd></div>
            <div><dt>Chuỗi liên tiếp</dt><dd>{ready ? streakCount : '—'}</dd></div>
            <div><dt>Bài hoàn thành</dt><dd>{stats ? stats.completedActivities : '—'}</dd></div>
          </dl>
        </section>

        <section className={styles.card} aria-label="Lớp đang học">
          <h2 className={styles.cardTitle}>Lớp đang học</h2>
          <p className={styles.big}>{activeClasses.length}</p>
          <p className={styles.muted}>{activeClasses.length ? activeClasses.slice(0, 3).map((r) => r.className || 'Lớp học').join(', ') : 'Bạn chưa đăng ký lớp nào.'}</p>
          <button type="button" className={styles.textLink} onClick={() => onGo('classes')}>{activeClasses.length ? 'Xem lớp của bạn' : 'Tìm lớp học'}</button>
        </section>
      </div>

      <section className={styles.card} aria-label="Điểm danh 5 tuần gần đây">
        <h2 className={styles.cardTitle}>Điểm danh 5 tuần gần đây</h2>
        {ready ? (
          <div className={styles.cal} role="table" aria-label="Mỗi hàng là một tuần, từ thứ Hai đến Chủ nhật">
            <div className={styles.calRow}>
              <span />
              {WEEKDAYS.map((d) => <span key={d} className={styles.calHead}>{d}</span>)}
            </div>
            {weeks.map((w, i) => (
              <div key={w[0].key} className={styles.calRow} role="row">
                <span className={styles.weekLabel}>{i === weeks.length - 1 ? <b>Tuần này</b> : null}{dm(w[0].key)} – {dm(w[6].key)}</span>
                {w.map((c) => (
                  <i key={c.key} className={`${styles.cell} ${styles[`cell_${c.state === 't' ? c.result : c.state}`]} ${c.state === 't' ? styles.cell_t : ''}`} title={`${dm(c.key)}: ${c.state === 'f' ? 'Chưa tới' : RESULT_LABEL[c.result]}`}>{c.day}</i>
                ))}
              </div>
            ))}
          </div>
        ) : <div className={styles.skeleton} aria-busy="true" />}
        <p className={styles.legend}>
          <span><s className={styles.cell_y} />Có mặt</span>
          <span><s className={styles.cell_a} />Vắng</span>
          <span><s className={styles.cell_e} />Có phép</span>
          <span><s className={styles.cell_n} />Không có buổi</span>
          <span><s className={styles.cell_t} />Hôm nay</span>
        </p>
      </section>

    </div>
  )
}
