import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
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

  const load = async () => {
    try {
      const [rev, mem] = await Promise.all([
        managerService.getRevenueReport(token, range.from, range.to, range.groupBy),
        managerService.getMemberReport(token, 7),
      ])
      setRevenue(rev)
      setMembers(mem)
    } catch (err) {
      toast.error(err.message || 'Không thể tải báo cáo')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const lines = (title, list) => (
    <div style={{ marginTop: '1rem' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
      <table className={styles.table}>
        <tbody>
          {(list || []).map((l) => (
            <tr key={l.label} className={styles.row}>
              <td className={styles.td}>{l.label}</td>
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
        </form>
        {revenue && (
          <>
            <p>
              Tổng doanh thu: <strong>{formatVND(revenue.totalRevenue)}</strong> · {revenue.paymentCount} giao dịch
              {revenue.needsReviewCount > 0 && ` · ${revenue.needsReviewCount} giao dịch cần kiểm tra`}
            </p>
            {lines('Theo phương thức', revenue.byMethod)}
            {lines('Theo gói', revenue.byPackage)}
            {lines('Theo kỳ', revenue.byPeriod)}
          </>
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
