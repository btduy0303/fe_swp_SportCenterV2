import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, Flag, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { classService } from '../../services/classService'
import { formatVND } from '../../utils/format'
import { categoryIcon } from '../../utils/sportIcon'
import { DAY_SHORT, hhmm } from '../../utils/schedule'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import { revealById } from '../../utils/reveal'
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

// Thanh số chỗ: cam khi còn nhiều, vàng khi còn ít, đỏ khi hết
function SeatBar({ cls }) {
  const taken = Math.round(((cls.maxCapacity - cls.seatsLeft) / cls.maxCapacity) * 100)
  const tone = cls.seatsLeft <= 0 ? styles.seatFull : cls.seatsLeft <= 3 ? styles.seatLow : ''
  const text = cls.seatsLeft <= 0 ? 'Hết chỗ' : `Còn ${cls.seatsLeft}/${cls.maxCapacity} chỗ`
  return (
    <div className={`${styles.seat} ${tone}`}>
      <div className={styles.track} role="img" aria-label={text}><i style={{ width: `${taken}%` }} /></div>
      <span>{text}</span>
    </div>
  )
}

// Chip lọc một lựa chọn; chọn lại chip đang bật thì bỏ chọn
function Chips({ label, options, isOn, onPick }) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      <span className={styles.chipLabel}>{label}</span>
      {options.map(([value, text, count, Icon]) => (
        <button key={value} type="button" aria-pressed={isOn(value)} className={isOn(value) ? styles.on : ''} onClick={() => onPick(value)}>
          {Icon ? <Icon size={15} aria-hidden="true" /> : null}{text}{count != null && <em>{count}</em>}
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
      ? ` Lớp này thuộc trình độ nâng cao${cls.prerequisiteCourseName ? ` và yêu cầu đã học "${cls.prerequisiteCourseName}"` : ''}.`
      : ''
    setConfirm({
      isOpen: true,
      title: waitlist ? 'Vào Danh Sách Chờ' : 'Đăng Ký Lớp Học',
      message: waitlist
        ? `Lớp "${cls.name}" đã đủ sĩ số. Bạn vào danh sách chờ để được mời khi có chỗ?${extra}`
        : `Đăng ký lớp "${cls.name}"? Chỗ được giữ trong thời gian chờ thanh toán, bạn thanh toán ngay ở khung "Lớp của bạn" phía trên.${extra}`,
      confirmText: waitlist ? 'Vào Danh Sách Chờ' : 'Xác Nhận Đăng Ký',
      type: 'primary',
      action: async () => {
        try {
          if (waitlist) await bookingService.joinWaitlist(token, cls.id, true)
          else await bookingService.registerClass(token, cls.id, true)
          toast.success(waitlist ? 'Đã vào danh sách chờ, bạn xem ở khung "Lớp của bạn" phía trên' : 'Đăng ký thành công. Hãy thanh toán online hoặc tiền mặt tại quầy trước hạn ghi ở khung phía trên.')
          load()
          await onChanged()
          revealById('my-classes')
        } catch (err) {
          toast.error(err.message || 'Không thực hiện được')
        }
      },
    })
  }

  const renderCard = (cls) => {
    const full = cls.seatsLeft <= 0
    const Icon = categoryIcon(cls.categoryName)
    return (
      <article key={cls.id} className={styles.card}>
        <div className={styles.cardTop}><span><Icon size={16} aria-hidden="true" />{cls.categoryName}</span><span>{LEVELS[cls.level] || cls.level}</span></div>
        <h3 className={styles.className}>{cls.name}</h3>
        <p className={styles.line}><CalendarClock size={15} aria-hidden="true" />{scheduleLine(schedules[cls.id])} · {cls.totalSessions} buổi</p>
        <p className={styles.line}><User size={15} aria-hidden="true" />HLV {cls.coachName}</p>
        <p className={styles.line}><Flag size={15} aria-hidden="true" />Khai giảng {cls.startDate.slice(8, 10)}/{cls.startDate.slice(5, 7)}</p>
        <SeatBar cls={cls} />
        <div className={styles.foot}>
          <span className={styles.price}>{formatVND(cls.tuition).replace(' đ', '')}<small>đ</small></span>
          {registeredIds.includes(cls.id)
            ? <span className={styles.joined}>Bạn đã đăng ký</span>
            : <button type="button" className={styles.btn} onClick={() => ask(cls, full)}>{full ? 'Vào danh sách chờ' : 'Đăng ký'}</button>}
        </div>
      </article>
    )
  }

  const categoryOptions = [['', 'Tất cả', classes.filter((c) => matches(c, true)).length],
    ...categories.map((name) => [name, name, classes.filter((c) => c.categoryName === name && matches(c, true)).length, categoryIcon(name)])]

  return (
    <section aria-labelledby="classes-title">
      <h2 id="classes-title" className={styles.title}>Tìm lớp để đăng ký</h2>

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
