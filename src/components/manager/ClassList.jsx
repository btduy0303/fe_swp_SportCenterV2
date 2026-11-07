import React, { useMemo, useState } from 'react'
import { formatVND, formatDate } from '../../utils/format'
import { scheduleText } from '../../utils/schedule'
import { categoryIcon } from '../../utils/sportIcon'
import ClassStatusBadge from './ClassStatusBadge'
import styles from '../../css/manager/ManagerClasses.module.css'

const FILTERS = [['all', 'Tất cả'], ['OPEN', 'Đang mở đăng ký'], ['DRAFT', 'Nháp'], ['IN_PROGRESS', 'Đang học'], ['COMPLETED', 'Đã kết thúc'], ['CANCELED', 'Đã hủy']]

// Danh sách lớp của manager: lọc theo trạng thái và từ khóa, mỗi lớp một hàng có thanh lấp đầy, nút Vận hành nổi bật.
// performance: { classId: { reservedSeats, fillPercent } } từ báo cáo hiệu quả lớp (có thể chưa tải xong).
export default function ClassList({ classes, schedules, performance, selectedId, onOperate, onEdit, onCancel, onAdd }) {
  const [filter, setFilter] = useState('all')
  const [keyword, setKeyword] = useState('')
  const counts = useMemo(() => {
    const map = { all: classes.length }
    classes.forEach((c) => { map[c.status] = (map[c.status] || 0) + 1 })
    return map
  }, [classes])
  const key = keyword.trim().toLowerCase()
  const shown = classes.filter((c) => (filter === 'all' || c.status === filter)
    && (!key || `${c.name} ${c.categoryName} ${c.coachName}`.toLowerCase().includes(key)))

  return (
    <section aria-label="Danh sách lớp">
      <div className={styles.toolbar}>
        <input type="text" aria-label="Tìm lớp" placeholder="Tìm theo tên lớp, môn hoặc coach" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <button type="button" className={styles.btn} onClick={onAdd}>Thêm lớp</button>
      </div>
      <div className={styles.chips} role="group" aria-label="Lọc theo trạng thái">
        {FILTERS.filter(([value]) => value === 'all' || counts[value]).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? styles.on : ''} onClick={() => setFilter(value)}>
            {label}<em>{counts[value] || 0}</em>
          </button>
        ))}
      </div>
      <p className={styles.summary}>Đang hiện <b>{shown.length}</b> / {classes.length} lớp</p>

      {shown.length === 0 ? <p className={styles.empty}>Không có lớp nào khớp.</p> : shown.map((cls) => {
        const perf = performance[cls.id]
        const finished = cls.status === 'COMPLETED' || cls.status === 'CANCELED'
        const Icon = categoryIcon(cls.categoryName)
        const pct = perf ? Math.min(100, perf.fillPercent) : 0
        return (
          <article key={cls.id} className={`${styles.row} ${cls.id === selectedId ? styles.sel : ''} ${finished ? styles.dim : ''}`}>
            <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
            <div>
              <p className={styles.name}>{cls.name}</p>
              <p className={styles.meta}>{cls.categoryName} · Coach {cls.coachName}{schedules[cls.id] ? ` · ${scheduleText(schedules[cls.id])}` : ''}</p>
              <p className={styles.meta}>Khai giảng {formatDate(cls.startDate)} · {formatVND(cls.tuition)}</p>
            </div>
            {perf && !finished ? (
              <div className={styles.fill}>
                <div className={`${styles.bar} ${pct >= 100 ? styles.full : ''}`}><i style={{ width: `${pct}%` }} /></div>
                <b>{perf.reservedSeats}/{perf.maxCapacity}</b>chỗ
              </div>
            ) : <span />}
            <div className={styles.side}>
              <ClassStatusBadge status={cls.status} />
              {!finished && <button type="button" className={styles.btn} onClick={() => onOperate(cls.id)}>Vận hành</button>}
              {!finished && <button type="button" className={styles.link} onClick={() => onEdit(cls)}>Sửa</button>}
              {!finished && <button type="button" className={`${styles.link} ${styles.linkDanger}`} onClick={() => onCancel(cls.id, cls.name)}>Hủy lớp</button>}
            </div>
          </article>
        )
      })}
    </section>
  )
}
