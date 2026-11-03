import React, { useMemo, useState } from 'react'
import { formatVND, formatDate } from '../../utils/format'
import { STATUS_VI, scheduleText } from '../../utils/schedule'
import styles from '../../css/manager/ManagerUi.module.css'

const FILTERS = [['all', 'Tất cả'], ['OPEN', 'Đang mở đăng ký'], ['DRAFT', 'Nháp'], ['IN_PROGRESS', 'Đang học'], ['COMPLETED', 'Đã kết thúc'], ['CANCELED', 'Đã hủy']]
const TONE = { OPEN: '', DRAFT: '', IN_PROGRESS: 'good', COMPLETED: 'off', CANCELED: 'off' }

// Danh sách lớp của manager: lọc theo trạng thái, mỗi lớp một dòng có thanh lấp đầy, nút Vận hành nổi bật.
// performance: { classId: { reservedSeats, fillPercent } } từ báo cáo hiệu quả lớp (có thể chưa tải xong).
export default function ClassList({ classes, schedules, performance, selectedId, onOperate, onEdit, onCancel }) {
  const [filter, setFilter] = useState('all')
  const counts = useMemo(() => {
    const map = { all: classes.length }
    classes.forEach((c) => { map[c.status] = (map[c.status] || 0) + 1 })
    return map
  }, [classes])
  const shown = filter === 'all' ? classes : classes.filter((c) => c.status === filter)

  return (
    <section aria-label="Danh sách lớp">
      <div className={styles.chips} role="group" aria-label="Lọc theo trạng thái">
        {FILTERS.filter(([value]) => value === 'all' || counts[value]).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? styles.on : ''} onClick={() => setFilter(value)}>
            {label}<em>{counts[value] || 0}</em>
          </button>
        ))}
      </div>

      {shown.length === 0 ? <p className={styles.empty}>Chưa có lớp nào ở trạng thái này.</p> : (
        <div className={styles.list}>
          {shown.map((cls) => {
            const perf = performance[cls.id]
            const finished = cls.status === 'COMPLETED' || cls.status === 'CANCELED'
            return (
              <article key={cls.id} className={`${styles.row} ${cls.id === selectedId ? styles.sel : ''} ${finished ? styles.dim : ''}`}>
                <div className={styles.main}>
                  <p className={styles.name}>{cls.name}</p>
                  <p className={styles.meta}>{cls.categoryName} · Coach {cls.coachName}{schedules[cls.id] ? ` · ${scheduleText(schedules[cls.id])}` : ''}</p>
                  <p className={styles.meta}>Khai giảng {formatDate(cls.startDate)} · {formatVND(cls.tuition)}</p>
                </div>
                {perf && !finished && (
                  <div className={styles.fill}>
                    <div className={styles.bar}><i style={{ width: `${Math.min(100, perf.fillPercent)}%` }} /></div>
                    {perf.reservedSeats}/{perf.maxCapacity} chỗ
                  </div>
                )}
                <div className={styles.side}>
                  <span className={`${styles.badge} ${styles[TONE[cls.status]] || ''}`}>{STATUS_VI[cls.status] || cls.status}</span>
                  {!finished && <button type="button" className={styles.btn} onClick={() => onOperate(cls.id)}>Vận hành</button>}
                  {cls.status !== 'CANCELED' && cls.status !== 'COMPLETED' && <button type="button" className={styles.link} onClick={() => onEdit(cls)}>Sửa</button>}
                  {cls.status !== 'CANCELED' && cls.status !== 'COMPLETED' && <button type="button" className={styles.btnDanger} onClick={() => onCancel(cls.id, cls.name)}>Hủy lớp</button>}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
