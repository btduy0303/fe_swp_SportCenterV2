import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { classService } from '../../services/classService'
import { formatVND } from '../../utils/format'
import styles from '../../css/manager/ManagerDashboard.module.css'
import ui from '../../css/manager/ManagerUi.module.css'

const iso = (d) => d.toISOString().slice(0, 10)
const DAY = 86400000


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

  if (!data) return <p className="text-muted">Đang tải tổng quan...</p>
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
    drafts > 0 && { label: `${drafts} lớp nháp chưa mở đăng ký`, tab: 'classes', red: false },
  ].filter(Boolean)

  const kpis = [
    ['Doanh thu tháng này', formatVND(revenue.totalRevenue), `${revenue.paymentCount} giao dịch`, 'reports'],
    ['Hội viên mới (30 ngày)', members.newMembersLast30Days, `Tổng ${members.totalMembers} hội viên`, 'reports'],
    ['Tỉ lệ lấp đầy lớp đang mở', `${fillPct}%`, `${filled}/${capacity} chỗ`, 'classes'],
    ['Chờ hoàn tiền', refunds.length, overdue ? `${overdue} quá hạn` : 'Không quá hạn', 'refunds'],
  ]

  return (
    <>
      <div className={styles.card}>
        <h2 className={ui.title}>Số liệu chính</h2>
        <div className={ui.kpis} style={{ marginTop: '1rem' }}>
          {kpis.map(([label, value, sub, tab]) => (
            <button key={label} type="button" className={ui.kpi} onClick={() => onNavigate(tab)}>
              <span>{label}</span>
              <b>{value}</b>
              <small>{sub}</small>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={ui.title}>Việc cần làm</h2>
        {todo.length === 0 ? <p className={ui.empty} style={{ marginTop: '1rem' }}>Hiện không có việc nào tồn đọng.</p> : (
          <div className={ui.list} style={{ marginTop: '1rem' }}>
            {todo.map((t) => (
              <article key={t.label} className={`${ui.row} ${t.red ? ui.alert : ''}`}>
                <div className={ui.main}><p className={ui.name}>{t.label}</p></div>
                <button type="button" className={ui.btn} onClick={() => onNavigate(t.tab)}>Xử lý</button>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={ui.title}>Lớp đáng chú ý</h2>
        {notable.length === 0 ? <p className={ui.empty} style={{ marginTop: '1rem' }}>Không có lớp nào cần chú ý.</p> : (
          <div className={ui.list} style={{ marginTop: '1rem' }}>
            {notable.map(({ c, why, pct }) => (
              <article key={c.id} className={ui.row}>
                <div className={ui.main}>
                  <p className={ui.name}>{c.name}</p>
                  <p className={ui.meta}>{why} ({pct}% chỗ)</p>
                </div>
                <button type="button" className={ui.btnOutline} onClick={() => onNavigate('classes')}>Xem lớp</button>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
