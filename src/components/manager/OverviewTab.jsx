import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { classService } from '../../services/classService'
import { formatVND } from '../../utils/format'
import { PAYMENT_METHOD } from '../../utils/labels'
import { dateKey } from '../../utils/overview'
import { revenueByDay, draftClasses, todaySchedule } from '../../utils/managerOverview'
import styles from '../../css/manager/ManagerOverview.module.css'
import ui from '../../css/manager/ManagerUi.module.css'

const DAY = 86400000
const STATE_TAG = { done: 'Đã xong', now: 'Đang diễn ra', next: 'Sắp tới' }
const scrollToTodo = () => document.getElementById('manager-todo')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

// Màn tổng quan của manager: lời chào việc cần xử lý, dải số liệu, lịch hôm nay, doanh thu, lớp cần để ý
export default function OverviewTab({ onNavigate }) {
  const { token } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)

  useEffect(() => {
    const now = new Date()
    const today = dateKey(now)
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // Lịch hôm nay lỗi thì vẫn hiện phần còn lại của tổng quan
    const soft = (p) => p.catch(() => [])
    Promise.all([
      managerService.getRevenueReport(token, dateKey(new Date(now.getFullYear(), now.getMonth(), 1)), today, 'DAY'),
      managerService.getMemberReport(token, 7),
      managerService.getRefunds(token, 'PENDING'),
      classService.getOpenClasses(),
      managerService.getClasses(token),
      soft(managerService.getSessionsBetween(token, today, today)),
      soft(managerService.getCoachSlots(token, { from: dayStart.toISOString(), to: new Date(dayStart.getTime() + DAY).toISOString() })),
    ])
      .then(([revenue, members, refunds, classes, allClasses, sessions, slots]) =>
        setData({ revenue, members, refunds, classes, allClasses, schedule: todaySchedule(sessions, slots, now), now }))
      .catch((err) => toast.error(err.message || 'Không thể tải tổng quan'))
  }, [token, toast])

  if (!data) return <p className="text-muted">Đang tải tổng quan...</p>
  const { revenue, members, refunds, classes, allClasses, schedule, now } = data

  const capacity = classes.reduce((s, c) => s + c.maxCapacity, 0)
  const filled = classes.reduce((s, c) => s + (c.maxCapacity - c.seatsLeft), 0)
  const fillPct = capacity ? Math.round((filled / capacity) * 100) : 0
  const overdue = refunds.filter((r) => r.overdue).length

  const { soon, later } = draftClasses(allClasses, now)
  const todo = [
    ...soon.map(({ c, days }) => ({
      label: `${c.name} khai giảng ${days === 0 ? 'hôm nay' : `sau ${days} ngày`} nhưng chưa mở đăng ký`,
      hint: 'Lớp còn nháp, mở đăng ký hoặc dời ngày khai giảng', tab: 'classes', btn: 'Xem lớp', red: days <= 1,
    })),
    refunds.length > 0 && {
      label: `${refunds.length} khoản chờ hoàn tiền${overdue ? `, ${overdue} khoản quá hạn` : ''}`,
      hint: '', tab: 'refunds', btn: 'Xử lý', red: overdue > 0,
    },
    later > 0 && { label: `${later} lớp nháp chưa mở đăng ký`, hint: 'Chưa tới tuần khai giảng', tab: 'classes', btn: 'Xem lớp', red: false },
  ].filter(Boolean).sort((a, b) => Number(b.red) - Number(a.red))
  const first = todo[0]

  // Lớp cần để ý: sắp khai giảng mà vắng (dưới 50%) hoặc đã cháy chỗ
  const week = now.getTime() + 7 * DAY
  const notable = classes
    .map((c) => {
      const pct = Math.round(((c.maxCapacity - c.seatsLeft) / c.maxCapacity) * 100)
      if (c.seatsLeft <= 0) return { c, why: 'Cháy chỗ, nên mở thêm lớp hoặc hàng chờ', pct, full: true }
      if (new Date(c.startDate).getTime() <= week && pct < 50) return { c, why: 'Sắp khai giảng mà mới lấp đầy dưới 50%', pct }
      return null
    })
    .filter(Boolean)

  const change = revenue.changePercent == null ? null : Number(revenue.changePercent)
  const days = revenueByDay(revenue.byPeriod, now)
  const best = days.reduce((m, d) => (d.amount > m.amount ? d : m), days[0])
  const methods = revenue.byMethod || []
  const methodTotal = methods.reduce((s, m) => s + Number(m.amount), 0)
  const oneOnOne = schedule.filter((e) => e.kind === 'one').length

  const stats = [
    {
      label: 'Doanh thu tháng này', value: formatVND(revenue.totalRevenue), tab: 'reports',
      sub: change == null ? 'Chưa có kỳ trước để so' : <><span className={change >= 0 ? styles.up : styles.down}>{change >= 0 ? '▲' : '▼'} {Math.abs(change)}%</span> so với kỳ trước</>,
    },
    { label: 'Hội viên mới (30 ngày)', value: members.newMembersLast30Days, sub: `Tổng ${members.totalMembers} hội viên`, tab: 'reports' },
    { label: 'Lấp đầy lớp đang mở', value: `${fillPct}%`, sub: `${filled}/${capacity} chỗ`, tab: 'classes' },
    { label: 'Buổi diễn ra hôm nay', value: schedule.length, sub: schedule.length ? `${schedule.length - oneOnOne} lớp, ${oneOnOne} buổi 1-1` : 'Hôm nay không có buổi nào', tab: 'weekly' },
  ]

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <p className={styles.dateLine}>{now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
        <div className={styles.headline} role="heading" aria-level={1}>
          {todo.length === 0 ? <>Mọi thứ <em>ổn</em>, không có việc tồn đọng</> : <>Hôm nay có <em>{todo.length}</em> việc cần xử lý</>}
        </div>
        {first ? (
          <>
            <p className={styles.lead}>{first.red ? 'Gấp nhất: ' : 'Việc đầu tiên: '}{first.label}.</p>
            <div className={styles.actions}>
              <button type="button" className={styles.cta} onClick={() => onNavigate(first.tab)}>{first.red ? 'Xử lý việc gấp' : 'Xử lý ngay'}</button>
              {todo.length > 1 ? <button type="button" className={styles.textLink} onClick={scrollToTodo}>Xem tất cả việc</button> : null}
            </div>
          </>
        ) : <div style={{ height: '1.4rem' }} />}
        <div className={styles.stats}>
          {stats.map((s) => (
            <button key={s.label} type="button" className={styles.stat} onClick={() => onNavigate(s.tab)}>
              <small>{s.label}</small>
              <b>{s.value}</b>
              <em>{s.sub}</em>
            </button>
          ))}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Lịch hôm nay<button type="button" onClick={() => onNavigate('weekly')}>Xem lịch tuần</button></h2>
          {schedule.length === 0 ? <p className={styles.empty}>Hôm nay không có buổi lớp hay buổi 1-1 nào.</p> : schedule.map((e) => (
            <div key={e.key} className={`${styles.event} ${styles[`event_${e.state}`]}`}>
              <span className={styles.num}>{e.start}</span>
              <i aria-hidden="true" />
              <p>{e.title}<span>{e.sub}</span></p>
              <span className={`${styles.tag} ${e.state === 'now' ? styles.tagNow : ''}`}>{STATE_TAG[e.state]}</span>
            </div>
          ))}
        </section>

        <section className={styles.card} id="manager-todo">
          <h2>Việc cần xử lý</h2>
          {todo.length === 0 ? <p className={styles.empty}>Hiện không có việc nào tồn đọng.</p> : todo.map((t) => (
            <div key={t.label} className={styles.task}>
              <span className={`${styles.dot} ${t.red ? styles.red : ''}`} aria-hidden="true" />
              <p>{t.label}{t.hint ? <span>{t.hint}</span> : null}</p>
              <button type="button" className={t.red ? ui.btn : ui.btnOutline} onClick={() => onNavigate(t.tab)}>{t.btn}</button>
            </div>
          ))}
        </section>
      </div>

      <section className={styles.card}>
        <h2>Doanh thu tháng này<button type="button" onClick={() => onNavigate('reports')}>Xem báo cáo</button></h2>
        <div className={styles.total}>
          <span className={styles.num}>{formatVND(revenue.totalRevenue)}</span>
          <span>{revenue.paymentCount} giao dịch{best.amount > 0 ? ` · cao nhất ngày ${best.day}: ${formatVND(best.amount)}` : ''}</span>
        </div>
        <div className={styles.chart} role="img" aria-label="Doanh thu từng ngày trong tháng này">
          {days.map((d) => (
            <i key={d.key} className={d === best && d.amount > 0 ? styles.hi : ''} style={{ height: `${best.amount ? (d.amount / best.amount) * 100 : 0}%` }} title={`${d.day}: ${formatVND(d.amount)}`} />
          ))}
        </div>
        <div className={styles.axis}><span>Ngày 1</span><span>Hôm nay</span></div>
        {methodTotal > 0 ? (
          <>
            <div className={styles.seg}>
              {methods.map((m) => <i key={m.label} style={{ width: `${(Number(m.amount) / methodTotal) * 100}%` }} />)}
            </div>
            <div className={styles.legend}>
              {methods.map((m) => <span key={m.label}><u />{PAYMENT_METHOD[m.label] || m.label} <b>{formatVND(m.amount)}</b></span>)}
            </div>
          </>
        ) : null}
      </section>

      <section className={styles.card}>
        <h2>Lớp cần để ý<button type="button" onClick={() => onNavigate('classes')}>Xem lớp</button></h2>
        {notable.length === 0 ? <p className={styles.empty}>Không có lớp nào cần chú ý.</p> : notable.map(({ c, why, pct, full }) => (
          <div key={c.id} className={styles.row}>
            <p>{c.name}<span>{why}</span></p>
            <span className={styles.num}>{pct}%</span>
            <div className={`${styles.meter} ${full ? styles.full : ''}`}><i style={{ width: `${pct}%` }} /></div>
            <button type="button" className={ui.btnOutline} onClick={() => onNavigate('classes')}>Xem lớp</button>
          </div>
        ))}
      </section>
    </div>
  )
}
