import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { classService } from '../../services/classService'
import { formatVND } from '../../utils/format'
import styles from '../../css/manager/ManagerDashboard.module.css'

const iso = (d) => d.toISOString().slice(0, 10)
const DAY = 86400000

const kpiStyle = { background: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '1.25rem', cursor: 'pointer', textAlign: 'left', color: 'inherit' }

// Màn tổng quan của manager: 4 con số đầu, việc cần làm, lớp đáng chú ý
export default function OverviewTab({ onNavigate }) {
  const { token } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)

  useEffect(() => {
    const now = new Date()
    const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1))
    Promise.all([
      managerService.getRevenueReport(token, monthStart, iso(now), 'DAY'),
      managerService.getMemberReport(token, 7),
      managerService.getRefunds(token, 'PENDING'),
      classService.getOpenClasses(),
      managerService.getClasses(token),
    ])
      .then(([revenue, members, refunds, classes, allClasses]) => setData({ revenue, members, refunds, classes, drafts: allClasses.filter((c) => c.status === 'DRAFT').length }))
      .catch((err) => toast.error(err.message || 'Không thể tải tổng quan'))
  }, [token, toast])

  if (!data) return <p style={{ color: 'var(--text-muted)' }}>Đang tải tổng quan...</p>
  const { revenue, members, refunds, classes, drafts } = data

  const capacity = classes.reduce((s, c) => s + c.maxCapacity, 0)
  const filled = classes.reduce((s, c) => s + (c.maxCapacity - c.seatsLeft), 0)
  const fillPct = capacity ? Math.round((filled / capacity) * 100) : 0
  const overdue = refunds.filter((r) => r.overdue).length

  // Lớp đáng chú ý: sắp khai giảng mà vắng (dưới 50%) hoặc đã cháy chỗ
  const soon = Date.now() + 7 * DAY
  const notable = classes
    .map((c) => {
      const pct = Math.round(((c.maxCapacity - c.seatsLeft) / c.maxCapacity) * 100)
      if (c.seatsLeft <= 0) return { c, why: 'Cháy chỗ, nên mở thêm lớp hoặc hàng chờ', pct }
      if (new Date(c.startDate).getTime() <= soon && pct < 50) return { c, why: 'Sắp khai giảng mà mới lấp đầy dưới 50%', pct }
      return null
    })
    .filter(Boolean)

  const todo = [
    refunds.length > 0 && { label: `${refunds.length} khoản chờ hoàn tiền${overdue ? `, ${overdue} khoản quá hạn` : ''}`, tab: 'refunds', red: overdue > 0 },
    drafts > 0 && { label: `${drafts} lớp nháp chưa mở đăng ký`, tab: 'classops', red: false },
    members.expiringSoon > 0 && { label: `${members.expiringSoon} gói sắp hết hạn trong ${members.expiringWithinDays} ngày`, tab: 'reports', red: false },
  ].filter(Boolean)

  const kpis = [
    ['Doanh thu tháng này', formatVND(revenue.totalRevenue), `${revenue.paymentCount} giao dịch`, 'reports'],
    ['Hội viên mới (30 ngày)', members.newMembersLast30Days, `Tổng ${members.totalMembers} hội viên`, 'reports'],
    ['Tỉ lệ lấp đầy lớp đang mở', `${fillPct}%`, `${filled}/${capacity} chỗ`, 'classops'],
    ['Chờ hoàn tiền', refunds.length, overdue ? `${overdue} quá hạn` : 'Không quá hạn', 'refunds'],
  ]

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Tổng Quan</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          {kpis.map(([label, value, sub, tab]) => (
            <button key={label} type="button" style={kpiStyle} onClick={() => onNavigate(tab)}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, lineHeight: 1.3, whiteSpace: 'nowrap' }}>{value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Việc Cần Làm</h2>
        {todo.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Hiện không có việc nào tồn đọng.</p> : (
          <ul style={{ listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
            {todo.map((t) => (
              <li key={t.label}>
                <button type="button" className={styles.btnAction} style={t.red ? { color: '#f87171', borderColor: '#f87171' } : undefined} onClick={() => onNavigate(t.tab)}>{t.label}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Lớp Đáng Chú Ý</h2>
        {notable.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Không có lớp nào cần chú ý.</p> : (
          <ul style={{ paddingLeft: '1.2rem', display: 'grid', gap: '0.4rem' }}>
            {notable.map(({ c, why, pct }) => <li key={c.id}><strong>{c.name}</strong> ({pct}% chỗ): {why}</li>)}
          </ul>
        )}
      </div>
    </>
  )
}
