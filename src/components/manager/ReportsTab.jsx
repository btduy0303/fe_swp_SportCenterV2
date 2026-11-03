import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import { PAYMENT_METHOD, REVENUE_ITEM, periodLabel } from '../../utils/labels'
import { STATUS_VI } from '../../utils/schedule'
import { downloadCsv } from '../../utils/csv'
import ui from '../../css/manager/ManagerUi.module.css'
import styles from '../../css/manager/ManagerDashboard.module.css'

const iso = (d) => d.toISOString().slice(0, 10)

// Báo cáo doanh thu theo khoảng ngày và thống kê hội viên
export default function ReportsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const today = new Date()
  const [range, setRange] = useState({
    from: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: iso(today),
    groupBy: 'DAY',
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
  const exportRevenue = () => {
    const part = (title, list, nameOf) => (list || []).map((l) => [title, nameOf(l.label), l.amount, l.paymentCount])
    downloadCsv(`doanh-thu-${range.from}-den-${range.to}.csv`, [
      ['Nhóm', 'Mục', 'Số tiền (đ)', 'Số giao dịch'],
      ['Tổng', `${range.from} đến ${range.to}`, revenue.totalRevenue, revenue.paymentCount],
      ...part('Theo phương thức', revenue.byMethod, (x) => PAYMENT_METHOD[x] || x),
      ...part('Theo khoản thu', revenue.byPackage, (x) => REVENUE_ITEM[x] || x),
      ...part('Theo kỳ', revenue.byPeriod, periodLabel),
    ])
  }

  const exportClasses = () => downloadCsv('hieu-qua-lop.csv', [
    ['Lớp', 'Môn', 'Coach', 'Trạng thái', 'Khai giảng', 'Đã giữ chỗ', 'Sức chứa', 'Lấp đầy (%)', 'Chuyên cần (%)'],
    ...perf.map((c) => [c.className, c.sportName, c.coachName, STATUS_VI[c.status] || c.status, c.startDate, c.reservedSeats, c.maxCapacity, c.fillPercent, c.attendanceRate ?? '']),
  ])

  const lines = (title, list, nameOf = (x) => x) => (
    <div style={{ marginTop: '1rem' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
      <table className={styles.table}>
        <tbody>
          {(list || []).map((l) => (
            <tr key={l.label} className={styles.row}>
              <td className={styles.td}>{nameOf(l.label)}</td>
              <td className={styles.td}>{formatVND(l.amount)}</td>
              <td className={styles.td}>{l.paymentCount} giao dịch</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Báo Cáo Doanh Thu</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); load() }}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}
        >
          <input type="date" required className={styles.input} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <input type="date" required className={styles.input} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          <select className={styles.select} value={range.groupBy} onChange={(e) => setRange({ ...range, groupBy: e.target.value })}>
            <option value="DAY">Theo ngày</option>
            <option value="MONTH">Theo tháng</option>
            <option value="QUARTER">Theo quý</option>
          </select>
          <button type="submit" className={styles.btnAction}>Xem Báo Cáo</button>
          <button type="button" className={styles.btnAction} disabled={!revenue} onClick={exportRevenue}>Xuất file CSV</button>
        </form>
        {revenue && (
          <>
            <p>
              Tổng doanh thu: <strong>{formatVND(revenue.totalRevenue)}</strong> · {revenue.paymentCount} giao dịch
              {revenue.needsReviewCount > 0 && ` · ${revenue.needsReviewCount} giao dịch cần kiểm tra`}
            </p>
            {lines('Theo phương thức', revenue.byMethod, (x) => PAYMENT_METHOD[x] || x)}
            {lines('Theo khoản thu', revenue.byPackage, (x) => REVENUE_ITEM[x] || x)}
            {lines('Theo kỳ', revenue.byPeriod, periodLabel)}
          </>
        )}
      </div>

      <div className={styles.card}>
        <div className={ui.head}>
          <div>
            <h2 className={styles.cardTitle}>Hiệu quả từng lớp</h2>
            <p className={ui.lead}>Lấp đầy là số chỗ đã giữ trên sức chứa. Chuyên cần là tỉ lệ có mặt hoặc đến muộn trên các buổi đã điểm danh.</p>
          </div>
          <button type="button" className={ui.btnOutline} disabled={perf.length === 0} onClick={exportClasses}>Xuất file CSV</button>
        </div>
        {perf.length === 0 ? <p className={ui.empty}>Chưa có lớp nào.</p> : (
          <div className={ui.scroll}>
            <table className={ui.table}>
              <thead><tr><th>Lớp</th><th>Coach</th><th>Trạng thái</th><th>Lấp đầy</th><th>Chuyên cần</th></tr></thead>
              <tbody>
                {perf.map((c) => (
                  <tr key={c.classId}>
                    <td><strong>{c.className}</strong><br /><span className="text-muted">{c.sportName}</span></td>
                    <td>{c.coachName}</td>
                    <td>{STATUS_VI[c.status] || c.status}</td>
                    <td>{c.reservedSeats}/{c.maxCapacity} chỗ ({c.fillPercent}%)</td>
                    <td>{c.attendanceRate == null ? 'Chưa điểm danh' : `${c.attendanceRate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Thống Kê Hội Viên</h2>
        {members && (
          <table className={styles.table}>
            <tbody>
              {[
                ['Tổng hội viên', members.totalMembers],
                ['Tài khoản đang hoạt động', members.activeAccounts],
                ['Tài khoản bị khóa', members.lockedAccounts],
                ['Hội viên mới 30 ngày', members.newMembersLast30Days],
                ['Đang có gói hoạt động', members.membersWithActivePackage],
                ['Có gói sắp bắt đầu', members.membersWithScheduledPackage],
                ['Có đơn chờ thanh toán', members.membersWithPendingOrder],
                ['Chưa có gói', members.membersWithoutPackage],
                [`Gói sắp hết hạn (${members.expiringWithinDays} ngày)`, members.expiringSoon],
              ].map(([label, value]) => (
                <tr key={label} className={styles.row}>
                  <td className={styles.td}>{label}</td>
                  <td className={styles.td}><strong>{value}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
