import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { classService } from '../../services/classService'
import { formatVND } from '../../utils/format'
import { DAY_SHORT, hhmm } from '../../utils/schedule'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import ConfirmModal from '../common/ConfirmModal'
import styles from '../../css/member/ClassBrowser.module.css'

const LEVELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' }
const BANDS = [['', 'Cả ngày'], ['S', 'Sáng'], ['C', 'Chiều'], ['T', 'Tối']]
const PER_GROUP = 4
const EMPTY_FILTERS = { keyword: '', category: '', level: '', hasSeats: false, days: [], band: '' }

const bandOf = (time) => {
  const hour = Number(hhmm(time).slice(0, 2))
  return hour < 12 ? 'S' : hour < 18 ? 'C' : 'T'
}

const bySort = {
  seats: (a, b) => (a.seatsLeft > 0 ? 0 : 1) - (b.seatsLeft > 0 ? 0 : 1) || a.startDate.localeCompare(b.startDate),
  date: (a, b) => a.startDate.localeCompare(b.startDate),
  fee: (a, b) => a.tuition - b.tuition,
}

// Lịch tuần ngắn của lớp, ví dụ "T2, T4 · 18:30"; lớp chưa xếp lịch thì báo rõ
function scheduleLine(rows) {
  if (!rows?.length) return 'Chưa xếp lịch'
  const days = [...new Set(rows.map((r) => r.dayOfWeek))].sort().map((d) => DAY_SHORT[d]).join(', ')
  return `${days} · ${hhmm(rows[0].startTime)}`
}

function SeatText({ cls }) {
  if (cls.seatsLeft <= 0) return <span className={`${styles.seats} ${styles.seatFull}`}>Hết chỗ</span>
  if (cls.seatsLeft <= 3) return <span className={`${styles.seats} ${styles.seatLow}`}>Còn {cls.seatsLeft} chỗ</span>
  return <span className={`${styles.seats} ${styles.seatOk}`}>Còn {cls.seatsLeft}/{cls.maxCapacity} chỗ</span>
}

// Chip lọc một lựa chọn; chọn lại chip đang bật thì bỏ chọn
function Chips({ label, options, isOn, onPick }) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      <span className={styles.chipLabel}>{label}</span>
      {options.map(([value, text, count]) => (
        <button key={value} type="button" aria-pressed={isOn(value)} className={isOn(value) ? styles.on : ''} onClick={() => onPick(value)}>
          {text}{count != null && <em>{count}</em>}
        </button>
      ))}
    </div>
  )
}

// Chọn và đăng ký lớp: gom theo môn, lọc theo môn/trình độ/ngày/giờ, hết chỗ thì vào hàng chờ.
// schedules: { classId: [dòng lịch] } từ trang cha; registeredIds: các lớp hội viên đang đăng ký hoặc chờ.
export default function ClassBrowser({ onChanged, schedules = {}, registeredIds = [] }) {
  const { token } = useAuth()
  const toast = useToast()
  const [guard] = useSingleFlight()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sort, setSort] = useState('seats')
  const [closed, setClosed] = useState({})
  const [expanded, setExpanded] = useState({})
  const [confirm, setConfirm] = useState({ isOpen: false })

  const load = useCallback(async () => {
    setLoading(true)
    setClasses(await classService.getOpenClasses())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const matches = useCallback((cls, ignoreCategory = false) => {
    const rows = schedules[cls.id] || []
    const text = `${cls.name} ${cls.categoryName} ${cls.coachName}`.toLowerCase()
    if (filters.keyword && !text.includes(filters.keyword.trim().toLowerCase())) return false
    if (!ignoreCategory && filters.category && cls.categoryName !== filters.category) return false
    if (filters.level && cls.level !== filters.level) return false
    if (filters.hasSeats && cls.seatsLeft <= 0) return false
    if (filters.days.length && !rows.some((r) => filters.days.includes(r.dayOfWeek))) return false
    if (filters.band && !rows.some((r) => bandOf(r.startTime) === filters.band)) return false
    return true
  }, [filters, schedules])

  const categories = useMemo(() => [...new Set(classes.map((c) => c.categoryName))].sort(), [classes])
  const results = useMemo(() => classes.filter((c) => matches(c)).sort(bySort[sort]), [classes, matches, sort])
  const groups = useMemo(() => {
    const map = new Map()
    results.forEach((c) => map.set(c.categoryName, [...(map.get(c.categoryName) || []), c]))
    return [...map]
  }, [results])
  const filtering = filters.keyword || filters.category || filters.level || filters.hasSeats || filters.days.length || filters.band

  const patch = (changes) => setFilters((f) => ({ ...f, ...changes }))
  const toggleDay = (day) => patch({ days: filters.days.includes(day) ? filters.days.filter((d) => d !== day) : [...filters.days, day] })
  const toggle = (setter, key) => setter((s) => ({ ...s, [key]: !s[key] }))

  const ask = (cls, waitlist) => {
    const extra = cls.advancedWarning
      ? ` Lớp này thuộc trình độ nâng cao${cls.prerequisiteCourseName ? ` và yêu cầu đã học "${cls.prerequisiteCourseName}"` : ''}, bạn xác nhận đã đủ điều kiện.`
      : ''
    setConfirm({
      isOpen: true,
      title: waitlist ? 'Vào Danh Sách Chờ' : 'Đăng Ký Lớp Học',
      message: waitlist
        ? `Lớp "${cls.name}" đã đủ sĩ số. Bạn vào danh sách chờ để được mời khi có chỗ?${extra}`
        : `Đăng ký lớp "${cls.name}"? Chỗ được giữ trong thời gian chờ thanh toán, bạn thanh toán ngay bên dưới ở mục lớp đã đăng ký.${extra}`,
      confirmText: waitlist ? 'Vào Danh Sách Chờ' : 'Xác Nhận Đăng Ký',
      type: 'primary',
      action: async () => {
        try {
          if (waitlist) await bookingService.joinWaitlist(token, cls.id, true)
          else await bookingService.registerClass(token, cls.id, true)
          toast.success(waitlist ? 'Đã vào danh sách chờ' : 'Đăng ký thành công, hãy thanh toán để giữ chỗ')
          load()
          onChanged()
        } catch (err) {
          toast.error(err.message || 'Không thực hiện được')
        }
      },
    })
  }

  const renderCard = (cls) => {
    const full = cls.seatsLeft <= 0
    return (
      <article key={cls.id} className={styles.card}>
        <div className={styles.info}>
          <b>{cls.name}</b>
          <span>{scheduleLine(schedules[cls.id])} · {cls.totalSessions} buổi</span>
          <span>HLV {cls.coachName} · {LEVELS[cls.level] || cls.level} · khai giảng {cls.startDate.slice(8, 10)}/{cls.startDate.slice(5, 7)}</span>
        </div>
        <div className={styles.side}>
          <span className={styles.price}>{formatVND(cls.tuition)}</span>
          <SeatText cls={cls} />
          {registeredIds.includes(cls.id)
            ? <span className={styles.joined}>Bạn đã đăng ký</span>
            : <button type="button" className={full ? styles.btnSecondary : styles.btnPrimary} onClick={() => ask(cls, full)}>{full ? 'Vào danh sách chờ' : 'Đăng ký'}</button>}
        </div>
      </article>
    )
  }

  const categoryOptions = [['', 'Tất cả', classes.filter((c) => matches(c, true)).length],
    ...categories.map((name) => [name, name, classes.filter((c) => c.categoryName === name && matches(c, true)).length])]

  return (
    <section aria-labelledby="classes-title">
      <h2 id="classes-title" className={styles.title}>Lớp đang mở đăng ký</h2>

      <div className={styles.toolbar}>
        <input type="text" aria-label="Tìm lớp" placeholder="Tìm theo tên lớp, môn hoặc huấn luyện viên" value={filters.keyword} onChange={(e) => patch({ keyword: e.target.value })} />
        <select aria-label="Trình độ" value={filters.level} onChange={(e) => patch({ level: e.target.value })}>
          <option value="">Mọi trình độ</option>
          {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="Sắp xếp" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="seats">Còn chỗ trước</option>
          <option value="date">Khai giảng sớm nhất</option>
          <option value="fee">Học phí thấp nhất</option>
        </select>
        <label><input type="checkbox" checked={filters.hasSeats} onChange={(e) => patch({ hasSeats: e.target.checked })} /> Chỉ lớp còn chỗ</label>
      </div>

      <Chips label="Môn" options={categoryOptions} isOn={(v) => filters.category === v} onPick={(v) => patch({ category: v })} />
      <Chips label="Ngày học" options={Object.entries(DAY_SHORT).map(([d, t]) => [Number(d), t])} isOn={(v) => filters.days.includes(v)} onPick={toggleDay} />
      <Chips label="Giờ học" options={BANDS} isOn={(v) => filters.band === v} onPick={(v) => patch({ band: v })} />

      <div className={styles.summary}>
        <span>Đang hiện <strong>{results.length}</strong> / {classes.length} lớp</span>
        {filtering && <button type="button" className={styles.reset} onClick={() => setFilters(EMPTY_FILTERS)}>Bỏ hết bộ lọc</button>}
      </div>

      {loading ? (
        <p className={styles.muted}>Đang tải danh sách lớp...</p>
      ) : results.length === 0 ? (
        <p className={styles.empty}>Không có lớp nào khớp. Thử bỏ bớt bộ lọc hoặc đổi ngày học.</p>
      ) : groups.map(([name, list]) => {
        const open = !closed[name]
        const shown = expanded[name] ? list : list.slice(0, PER_GROUP)
        return (
          <div key={name}>
            <button type="button" className={`${styles.groupHead} ${open ? '' : styles.closed}`} aria-expanded={open} onClick={() => toggle(setClosed, name)}>
              {name} <small>{list.length} lớp · {list.filter((c) => c.seatsLeft > 0).length} còn chỗ</small>
              <span className={styles.caret} aria-hidden="true">▾</span>
            </button>
            {open && (
              <>
                <div className={styles.grid}>{shown.map(renderCard)}</div>
                {list.length > PER_GROUP && (
                  <button type="button" className={styles.more} onClick={() => toggle(setExpanded, name)}>
                    {expanded[name] ? 'Thu gọn' : `Xem thêm ${list.length - PER_GROUP} lớp ${name}`}
                  </button>
                )}
              </>
            )}
          </div>
        )
      })}

      <ConfirmModal
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        type={confirm.type}
        onConfirm={() => {
          const action = confirm.action
          setConfirm({ ...confirm, isOpen: false })
          if (action) guard(action)
        }}
        onCancel={() => setConfirm({ ...confirm, isOpen: false })}
      />
    </section>
  )
}
