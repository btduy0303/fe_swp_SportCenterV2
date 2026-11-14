import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import { PAYMENT_METHOD, REVENUE_ITEM, periodLabel, refundReasonVi } from '../../utils/labels'
import { STATUS_VI } from '../../utils/schedule'
import { downloadCsv } from '../../utils/csv'
import { dateKey } from '../../utils/overview'
import styles from '../../css/manager/ManagerReports.module.css'

// Từng giao dịch: ai trả, ai thu, hóa đơn nào, và nếu có hoàn tiền thì hoàn bao nhiêu, vì sao, ai hoàn, lúc nào
function PaymentRows({ rows }) {
  if (rows.length === 0) return <p className={styles.empty}>Không có giao dịch.</p>
  return rows.map((r) => (
    <div key={r.paymentId} className={styles.payRow}>
      <span>{new Date(r.paidAt).toLocaleString('vi-VN')}</span>
      <span><b>{r.payerName}</b> · {r.className ? `Học phí lớp ${r.className}` : REVENUE_ITEM[r.item] || r.item}</span>
      <span>{r.receivedByName ? `Lễ tân ${r.receivedByName} thu` : 'Thanh toán online'} · {r.invoiceNumber}</span>
      {Number(r.refundedAmount) > 0 && (
        <span className={styles.refundNote}>
          Đã hoàn {formatVND(r.refundedAmount)}{r.refundReason ? ` · ${refundReasonVi(r.refundReason)}` : ''}
          {r.refundedByName ? ` · ${r.refundedByName} hoàn lúc ${new Date(r.refundedAt).toLocaleString('vi-VN')}` : ''}
        </span>
      )}
      {Number(r.pendingRefundAmount) > 0 && <span className={styles.refundNote}>Đang chờ hoàn {formatVND(r.pendingRefundAmount)}</span>}
      <b>{formatVND(r.amount)}</b>
    </div>
  ))
}

// Ô số liệu hoàn tiền: bấm để xem từng khoản (refund = DONE hoặc PENDING)
function RefundStat({ title, amount, count, refund, range }) {
  const { token } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const toggle = async () => {
    if (rows) { setRows(null); return }
    try {
      setRows(await managerService.getRevenuePayments(token, range.from, range.to, { refund }))
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách giao dịch')
    }
  }
  return (
    <div className={`${styles.stat} ${styles.statBtn}`}>
      <button type="button" onClick={toggle} aria-expanded={!!rows}>
        <small>{title}</small><b>{formatVND(amount)}</b><em>{count} khoản · bấm để xem chi tiết</em>
      </button>
      {rows && <div className={styles.payRows}><PaymentRows rows={rows} /></div>}
    </div>
  )
}

// Một nhóm doanh thu (theo phương thức, theo khoản thu): mỗi dòng có tiền, số giao dịch và thanh tỉ lệ.
// Bấm vào một dòng thì sổ ra từng giao dịch của dòng đó (ai trả, ai thu, hóa đơn nào).
// Ô "Đi học" của lớp khi chưa có con số: lớp chưa khai giảng ghi "Chưa bắt đầu", đã học mà chưa có buổi điểm danh ghi rõ, lớp hủy ghi "Lớp đã hủy"
function attendanceText(c) {
  if (c.attendanceRate != null) return `${c.attendanceRate}%`
  if (c.status === 'CANCELED') return 'Lớp đã hủy'
  const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  if (c.status === 'DRAFT' || (c.startDate && c.startDate > todayIso)) return 'Chưa bắt đầu'
  return 'Chưa có buổi điểm danh'
}

// Ô "Đi học": phần trăm lượt có mặt kèm thanh và số lượt; nhắc ngắn khi coach còn buổi chưa điểm danh.
// mLabel chỉ hiện trên màn hình hẹp, nơi tiêu đề cột bị ẩn
function AttendanceCell({ c, onUnmarked }) {
  if (c.attendanceRate == null) return <span className={styles.attNone}><span className={styles.mLabel}>Đi học: </span>{attendanceText(c)}</span>
  const unmarked = Math.max(0, (c.sessionsPast ?? 0) - (c.sessionsMarked ?? 0))
  return (
    <div className={styles.att} title={`${c.presentRecords} trên ${c.markedRecords} lượt điểm danh có mặt, ${c.sessionsMarked}/${c.totalSessions} buổi đã điểm danh`}>
      <span><span className={styles.mLabel}>Đi học </span><b className={styles.pct}>{c.attendanceRate}%</b></span>
      <div className={`${styles.meter} ${c.attendanceRate < 70 ? styles.low : ''}`}><i style={{ width: `${c.attendanceRate}%` }} /></div>
      <small>{c.presentRecords}/{c.markedRecords} lượt có mặt</small>
      {unmarked > 0 ? <button type="button" className={styles.attWarn} onClick={() => onUnmarked(c)}>Thiếu điểm danh {unmarked} buổi</button> : null}
    </div>
  )
}

// filterKey: 'method' hoặc 'item', là tên tham số lọc gửi lên BE.
function Breakdown({ title, lead, list, nameOf, filterKey, range, empty = 'Chưa có giao dịch.' }) {
  const { token } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(null)
  const [rows, setRows] = useState([])
  const total = (list || []).reduce((s, l) => s + Number(l.amount), 0)

  const toggle = async (label) => {
    if (open === label) { setOpen(null); return }
    setOpen(label)
    setRows([])
    try {
      setRows(await managerService.getRevenuePayments(token, range.from, range.to, { [filterKey]: label }))
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách giao dịch')
    }
  }

  return (
    <section className={styles.card}>
      <h2>{title}<span>{formatVND(total)}</span></h2>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
      {(list || []).length === 0 ? <p className={styles.empty}>{empty}</p> : list.map((l) => (
        <React.Fragment key={l.label}>
          <button type="button" className={`${styles.line} ${styles.lineBtn}`} aria-expanded={open === l.label} onClick={() => toggle(l.label)}>
            <span>{open === l.label ? '▾' : '▸'} {nameOf(l.label)}</span>
            <b>{formatVND(l.amount)}</b>
            <small>{l.paymentCount} giao dịch · bấm để xem chi tiết</small>
            <div className={styles.share}><i style={{ width: `${total ? (Number(l.amount) / total) * 100 : 0}%` }} /></div>
          </button>
          {open === l.label && (
            <div className={styles.payRows}>
              <PaymentRows rows={rows} />
            </div>
          )}
        </React.Fragment>
      ))}
    </section>
  )
}

// Báo cáo doanh thu theo khoảng ngày, hiệu quả từng lớp và thống kê hội viên
export default function ReportsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [range, setRange] = useState(() => {
    const now = new Date()
    return { from: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: dateKey(now), groupBy: 'DAY' }
  })
  const [revenue, setRevenue] = useState(null)
  const [members, setMembers] = useState(null)
  const [perf, setPerf] = useState([])

  const load = async () => {
    try {
      const [rev, mem, classPerf] = await Promise.all([
        managerService.getRevenueReport(token, range.from, range.to, range.groupBy),
        managerService.getMemberReport(token, 7),
        managerService.getClassPerformance(token).catch(() => []),
      ])
      setRevenue(rev)
      setMembers(mem)
      setPerf(Array.isArray(classPerf) ? classPerf : [])
    } catch (err) {
      toast.error(err.message || 'Không thể tải báo cáo')
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Xuất báo cáo doanh thu đang xem: tổng, theo phương thức, theo khoản thu và theo kỳ
  const oneOnOne = (revenue?.bySource || []).filter((l) => l.label === 'One-on-one')
  const exportRevenue = () => {
    const part = (title, list, nameOf) => (list || []).map((l) => [title, nameOf(l.label), l.amount, l.paymentCount])
    downloadCsv(`doanh-thu-${range.from}-den-${range.to}.csv`, [
      ['Nhóm', 'Mục', 'Số tiền (đ)', 'Số giao dịch'],
      ['Tổng', `${range.from} đến ${range.to}`, revenue.totalRevenue, revenue.paymentCount],
      ...part('Theo phương thức', revenue.byMethod, (x) => PAYMENT_METHOD[x] || x),
      ...part('Gói hội viên', revenue.byMembershipPackage, (x) => x),
      ...part('Học phí lớp', revenue.byClass, (x) => x),
      ...part('Buổi 1-1', oneOnOne, () => 'Buổi 1-1'),
      ...part('Theo kỳ', revenue.byPeriod, periodLabel),
    ])
  }

  const exportClasses = () => downloadCsv('hieu-qua-lop.csv', [
    ['Lớp', 'Môn', 'Coach', 'Trạng thái', 'Khai giảng', 'Đã giữ chỗ', 'Sức chứa', 'Chỗ đã đăng ký (%)', 'Đi học (%)', 'Lượt có mặt', 'Lượt đã điểm danh', 'Buổi đã điểm danh', 'Buổi đã diễn ra', 'Tổng số buổi'],
    ...perf.map((c) => [c.className, c.sportName, c.coachName, STATUS_VI[c.status] || c.status, c.startDate, c.reservedSeats, c.maxCapacity, c.fillPercent, c.attendanceRate ?? attendanceText(c), c.presentRecords, c.markedRecords, c.sessionsMarked, c.sessionsPast, c.totalSessions]),
  ])

  const periods = revenue?.byPeriod || []
  const best = periods.reduce((m, p) => (Number(p.amount) > Number(m?.amount ?? -1) ? p : m), null)
  const change = revenue?.changePercent == null ? null : Number(revenue.changePercent)


  // Buổi quá hạn điểm danh của một lớp (mở khi bấm "Thiếu điểm danh N buổi"); list null là đang tải
  const [unmarked, setUnmarked] = useState(null)
  const showUnmarked = async (c) => {
    if (unmarked?.classId === c.classId) { setUnmarked(null); return }
    setUnmarked({ classId: c.classId, list: null })
    try {
      setUnmarked({ classId: c.classId, list: await managerService.getUnmarkedSessions(token, c.classId) })
    } catch (err) {
      toast.error(err.message || 'Không thể tải các buổi thiếu điểm danh')
      setUnmarked(null)
    }
  }
  const reopen = async (s) => {
    try {
      await managerService.reopenAttendance(token, s.sessionId)
      toast.success('Đã mở lại điểm danh 24 giờ, coach đã được báo')
      setUnmarked({ classId: unmarked.classId, list: await managerService.getUnmarkedSessions(token, unmarked.classId) })
    } catch (err) {
      toast.error(err.message || 'Mở lại điểm danh thất bại')
    }
  }
  return (
    <div className={styles.wrap}>
      <form className={styles.bar} onSubmit={(e) => { e.preventDefault(); load() }}>
        <span>Từ</span>
        <input type="date" required aria-label="Từ ngày" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <span>đến</span>
        <input type="date" required aria-label="Đến ngày" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <select aria-label="Gom theo" value={range.groupBy} onChange={(e) => setRange({ ...range, groupBy: e.target.value })}>
          <option value="DAY">Theo ngày</option>
          <option value="MONTH">Theo tháng</option>
          <option value="QUARTER">Theo quý</option>
        </select>
        <span className={styles.spacer} />
        <button type="button" className={styles.btnOutline} disabled={!revenue} onClick={exportRevenue}>Xuất CSV</button>
        <button type="submit" className={styles.btn}>Xem báo cáo</button>
      </form>

      {revenue && (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <small>Doanh thu thực (sau khi trừ hoàn)</small><b>{formatVND(revenue.totalRevenue)}</b>
              <em>{change == null ? 'Chưa có kỳ trước để so' : <><span className={change >= 0 ? styles.up : styles.down}>{change >= 0 ? '▲' : '▼'} {Math.abs(change)}%</span> so với kỳ trước</>}</em>
            </div>
            <div className={styles.stat}><small>Số giao dịch</small><b>{revenue.paymentCount}</b><em>Trong kỳ đang xem</em></div>
            <div className={styles.stat}><small>Tổng thu trước hoàn</small><b>{formatVND(revenue.grossRevenue)}</b><em>Khách đã trả trong kỳ</em></div>
            <RefundStat title="Đã hoàn tiền" amount={revenue.refundedAmount} count={revenue.refundedCount} refund="DONE" range={revenue} />
            <RefundStat title="Đang chờ hoàn" amount={revenue.pendingRefundAmount} count={revenue.pendingRefundCount} refund="PENDING" range={revenue} />
            {revenue.needsReviewCount > 0 && (
              <div className={`${styles.stat} ${styles.warn}`}><small>Cần kiểm tra</small><b>{revenue.needsReviewCount}</b><em>Giao dịch chờ xử lý</em></div>
            )}
          </div>

          {periods.length > 0 && (
            <section className={styles.card}>
              <h2>Doanh thu theo kỳ{best && <span>Cao nhất: {periodLabel(best.label)}, {formatVND(best.amount)}</span>}</h2>
              <div className={styles.chart} role="img" aria-label="Doanh thu từng kỳ">
                {periods.map((p) => (
                  <i key={p.label} className={p === best ? styles.hi : ''} style={{ height: `${Number(best.amount) ? (Number(p.amount) / Number(best.amount)) * 100 : 0}%` }} title={`${periodLabel(p.label)}: ${formatVND(p.amount)}`} />
                ))}
              </div>
              <div className={styles.axis}><span>{periodLabel(periods[0].label)}</span><span>{periodLabel(periods[periods.length - 1].label)}</span></div>
            </section>
          )}

          <div className={styles.split}>
            <Breakdown title="Gói hội viên" lead="Tiền bán gói, gia hạn và nâng cấp, tách theo từng gói." list={revenue.byMembershipPackage} nameOf={(x) => x} filterKey="item" range={revenue} empty="Kỳ này chưa bán gói nào." />
            <Breakdown title="Học phí lớp" lead="Học phí đã thu, tách theo từng lớp. Bấm một lớp để xem ai đã trả." list={revenue.byClass} nameOf={(x) => x} filterKey="className" range={revenue} empty="Kỳ này chưa thu học phí lớp nào." />
          </div>
          <div className={styles.split}>
            <Breakdown title="Buổi 1-1" list={oneOnOne} nameOf={() => 'Buổi kèm 1-1 với huấn luyện viên'} filterKey="item" range={revenue} empty="Kỳ này chưa thu tiền buổi 1-1." />
            <Breakdown title="Theo phương thức thanh toán" list={revenue.byMethod} nameOf={(x) => PAYMENT_METHOD[x] || x} filterKey="method" range={revenue} />
          </div>
        </>
      )}

      <section className={styles.card}>
        <h2>Hiệu quả từng lớp<button type="button" className={styles.btnOutline} disabled={perf.length === 0} onClick={exportClasses}>Xuất CSV</button></h2>
        <p className={styles.lead}>Đi học: phần trăm lượt học viên có mặt trong các buổi đã điểm danh.</p>
        {perf.length === 0 ? <p className={styles.empty}>Chưa có lớp nào.</p> : (
          <>
            <div className={`${styles.row} ${styles.head}`}><span>Lớp</span><span>Coach</span><span>Chỗ đã đăng ký</span><span>Đi học</span></div>
            {perf.map((c) => (
              <div key={c.classId} className={styles.row}>
                <p>{c.className}<span>{c.sportName} · {STATUS_VI[c.status] || c.status}</span></p>
                <span>{c.coachName}</span>
                <div>
                  <span>{c.reservedSeats}/{c.maxCapacity} chỗ <b className={styles.pct}>{c.fillPercent}%</b></span>
                  <div className={`${styles.meter} ${c.fillPercent >= 100 ? styles.full : ''}`}><i style={{ width: `${Math.min(100, c.fillPercent)}%` }} /></div>
                </div>
                <AttendanceCell c={c} onUnmarked={showUnmarked} />
                {unmarked?.classId === c.classId && (
                  <div className={styles.unmarked}>
                    {unmarked.list === null ? <p>Đang tải...</p> : unmarked.list.length === 0 ? <p>Không có buổi nào quá hạn điểm danh. Các buổi còn thiếu vẫn trong 48 giờ, coach tự điểm danh được.</p> : (
                      <>
                        <p>Các buổi đã quá 48 giờ mà coach chưa chốt điểm danh. Mở lại thì coach có thêm 24 giờ và được báo ngay.</p>
                        <ul>
                          {unmarked.list.map((s) => {
                            const open = s.reopenedUntil && new Date(s.reopenedUntil) > new Date()
                            return (
                              <li key={s.sessionId}>
                                <span>Buổi {s.sessionNo} · {new Date(`${s.sessionDate}T00:00:00`).toLocaleDateString('vi-VN')} {String(s.startTime).slice(0, 5)} · {s.coachName}</span>
                                {open ? <small>Đã mở lại đến {new Date(s.reopenedUntil).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</small>
                                  : <button type="button" className={styles.btnOutline} onClick={() => reopen(s)}>Cho sửa lại</button>}
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </section>

      {members && (
        <section className={styles.card}>
          <h2>Thống kê hội viên</h2>
          <div className={styles.stats}>
            {[
              ['Tổng hội viên', members.totalMembers],
              ['Hội viên mới 30 ngày', members.newMembersLast30Days],
              ['Đang có gói hoạt động', members.membersWithActivePackage],
              ['Có gói sắp bắt đầu', members.membersWithScheduledPackage],
              [`Gói sắp hết hạn (${members.expiringWithinDays} ngày)`, members.expiringSoon],
              ['Có đơn chờ thanh toán', members.membersWithPendingOrder],
              ['Chưa có gói', members.membersWithoutPackage],
              ['Tài khoản đang hoạt động', members.activeAccounts],
              ['Tài khoản bị khóa', members.lockedAccounts],
            ].map(([label, value]) => (
              <div key={label} className={styles.stat}><small>{label}</small><b>{value}</b></div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
