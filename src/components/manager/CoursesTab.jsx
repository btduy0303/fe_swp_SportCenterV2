import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { courseService } from '../../services/courseService'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import { categoryIcon } from '../../utils/sportIcon'
import styles from '../../css/manager/ManagerCourses.module.css'

const LEVELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' }
const LEVEL_STEP = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 }
// kind: GROUP là khóa lớp nhóm (mở thành lớp có lịch chung), PRIVATE là khóa 1-1 (hội viên mua rồi tự chọn giờ và coach)
const KIND_TABS = [['GROUP', 'Khóa học nhóm'], ['PRIVATE', 'Khóa kèm 1-1']]
const EMPTY_COURSE = { kind: 'GROUP', sportCategoryId: '', name: '', description: '', level: 'BEGINNER', totalSessions: 12, defaultTuition: '', prerequisiteCourseId: '' }
// Khóa 1-1 lưu ở API gói 1-1; đổi về cùng dạng với khóa nhóm để hiện chung một danh sách
const fromPrivate = (p) => ({
  kind: 'PRIVATE', id: p.id, sportCategoryId: p.sportCategoryId, sportCategoryName: p.sportName, name: p.name,
  description: p.description, totalSessions: p.sessions, defaultTuition: p.price, pricePerSession: p.pricePerSession, active: p.active,
})
const money = (v) => formatVND(v).replace(' đ', '')

// Khóa học (bản mẫu), gồm khóa lớp nhóm và khóa 1-1. Form sửa mở ngay dưới khóa đang chọn; nút Tạo lớp (chỉ khóa nhóm)
// mở trang tạo lớp với khóa đó
export default function CoursesTab({ onCreateClass }) {
  const { token } = useAuth()
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ keyword: '', level: '', category: '', active: true })
  // Tab đang xem: khóa học nhóm hoặc khóa kèm 1-1; các môn thu gọn mặc định, `opened` là các môn đang mở
  const [kind, setKind] = useState('GROUP')
  const [opened, setOpened] = useState({})
  // panel: null | { mode: 'create' } | { mode: 'edit', course }
  const [panel, setPanel] = useState(null)
  const [form, setForm] = useState(EMPTY_COURSE)

  const load = useCallback(async () => {
    try {
      const [on, off, priv] = await Promise.all([
        courseService.list(token, { active: 'true' }), courseService.list(token, { active: 'false' }), managerService.getOneOnOnePackages(token),
      ])
      setCourses([...on, ...off].map((c) => ({ ...c, kind: 'GROUP' })).concat(priv.map(fromPrivate)))
    } catch (err) {
      toast.error(err.message || 'Không thể tải khóa học')
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    managerService.getCategories(token).then(setCategories).catch(() => {})
  }, [token])

  // Form mở ra ở dưới khóa đang chọn: cuộn tới đó và đặt con trỏ vào ô đầu tiên
  useEffect(() => {
    if (!panel) return
    const el = document.getElementById('course-panel')
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    el?.querySelector('input, select')?.focus({ preventScroll: true })
  }, [panel])

  const byId = useMemo(() => new Map(courses.filter((c) => c.kind === 'GROUP').map((c) => [c.id, c])), [courses])
  const keyOf = (c) => `${c.kind}-${c.id}`
  const shown = useMemo(() => {
    const key = filters.keyword.trim().toLowerCase()
    return courses.filter((c) => c.active === filters.active
      && (!filters.level || c.kind !== 'GROUP' || c.level === filters.level)
      && (!filters.category || c.sportCategoryName === filters.category)
      && (!key || `${c.name} ${c.sportCategoryName}`.toLowerCase().includes(key)))
  }, [courses, filters])
  // Hai phần (lớp nhóm, 1-1), trong mỗi phần gom theo môn
  const groups = useMemo(() => {
    const map = new Map()
    shown.filter((c) => c.kind === kind).forEach((c) => map.set(c.sportCategoryName, [...(map.get(c.sportCategoryName) || []), c]))
    return [...map]
  }, [shown, kind])
  // Đang lọc theo môn hoặc từ khóa thì mở sẵn, còn lại thu gọn để trang ngắn
  const autoOpen = Boolean(filters.category || filters.keyword.trim())
  const sportNames = useMemo(() => [...new Set(courses.map((c) => c.sportCategoryName))].sort(), [courses])
  const countIn = (pred) => courses.filter((c) => c.active === filters.active && c.kind === kind && pred(c)).length

  const patch = (changes) => setFilters((f) => ({ ...f, ...changes }))
  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const startCreate = (kind) => {
    setForm({ ...EMPTY_COURSE, kind, totalSessions: kind === 'PRIVATE' ? 8 : 12 })
    setPanel({ mode: 'create' })
  }
  const startEdit = (c) => {
    setForm({
      kind: c.kind, sportCategoryId: c.sportCategoryId, name: c.name, description: c.description || '', level: c.level || 'BEGINNER',
      totalSessions: c.totalSessions, defaultTuition: c.defaultTuition, prerequisiteCourseId: c.prerequisiteCourseId || '',
    })
    setPanel({ mode: 'edit', course: c })
  }

  const save = async (e) => {
    e.preventDefault()
    if (form.kind === 'PRIVATE') {
      const body = {
        sportCategoryId: Number(form.sportCategoryId), name: form.name.trim(), description: form.description.trim(),
        sessions: Number(form.totalSessions), price: Number(form.defaultTuition),
      }
      try {
        if (panel.mode === 'edit') await managerService.updateOneOnOnePackage(token, panel.course.id, body)
        else await managerService.createOneOnOnePackage(token, body)
        toast.success(panel.mode === 'edit' ? 'Đã cập nhật khóa 1-1' : 'Đã tạo khóa 1-1')
        setPanel(null)
        load()
      } catch (err) {
        toast.error(err.message || 'Lưu khóa 1-1 thất bại')
      }
      return
    }
    const body = {
      sportCategoryId: Number(form.sportCategoryId),
      name: form.name.trim(),
      description: form.description.trim(),
      level: form.level,
      totalSessions: Number(form.totalSessions),
      defaultTuition: Number(form.defaultTuition),
      prerequisiteCourseId: form.prerequisiteCourseId ? Number(form.prerequisiteCourseId) : null,
    }
    try {
      if (panel.mode === 'edit') await courseService.update(token, panel.course.id, body)
      else await courseService.create(token, body)
      toast.success(panel.mode === 'edit' ? 'Đã cập nhật khóa học' : 'Đã tạo khóa học')
      setPanel(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Lưu khóa học thất bại')
    }
  }

  const toggle = async (c) => {
    try {
      if (c.kind === 'PRIVATE') await managerService.setOneOnOnePackageActive(token, c.id, !c.active)
      else await courseService.setActive(token, c.id, !c.active)
      toast.success(c.active ? 'Đã ngừng khóa học' : 'Đã bật lại khóa học')
      load()
    } catch (err) {
      toast.error(err.message || 'Đổi trạng thái thất bại')
    }
  }

  const isPrivate = form.kind === 'PRIVATE'
  const perSession = isPrivate && Number(form.defaultTuition) > 0 && Number(form.totalSessions) > 0
    ? Math.round(Number(form.defaultTuition) / Number(form.totalSessions)) : null
  const courseForm = (
    <form onSubmit={save}>
      <div className={styles.fields}>
        <label>Môn thể thao
          <select required value={form.sportCategoryId} onChange={f('sportCategoryId')}>
            <option value="">Chọn môn</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Tên khóa học
          <input required placeholder={isPrivate ? 'Ví dụ: Bơi 1-1 cơ bản' : 'Ví dụ: Bơi cơ bản'} value={form.name} onChange={f('name')} />
        </label>
        {!isPrivate && <label>Trình độ của khóa này
          <select value={form.level} onChange={f('level')}>
            {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>}
        <label>Số buổi
          <input required type="number" min="1" max={isPrivate ? 60 : undefined} value={form.totalSessions} onChange={f('totalSessions')} />
        </label>
        <label>{isPrivate ? 'Giá trọn khóa (đ)' : 'Học phí mặc định (đ)'}
          <input required type="number" min={isPrivate ? 1 : 0} value={form.defaultTuition} onChange={f('defaultTuition')} />
          {perSession ? <span className={styles.hint}>Khoảng {formatVND(perSession)} mỗi buổi</span> : null}
        </label>
        {!isPrivate && <label>Khóa cần học trước
          <select value={form.prerequisiteCourseId} onChange={f('prerequisiteCourseId')}>
            <option value="">Không cần, ai cũng đăng ký được</option>
            {courses.filter((c) => c.kind === 'GROUP' && c.id !== panel?.course?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {form.level === 'ADVANCED' && <span className={styles.hint}>Khóa nâng cao: hội viên tự xác nhận đã đủ điều kiện khi đăng ký, hệ thống không kiểm tra họ đã học khóa nào. Nên chọn khóa tiên quyết để lời nhắc ghi rõ họ cần học khóa nào trước.</span>}
        </label>}
        <label className={styles.wide}>{isPrivate ? 'Mục tiêu của khóa' : 'Mô tả'}
          <input value={form.description} onChange={f('description')} />
        </label>
      </div>
      <div className={styles.foot}>
        <span style={{ flex: 1 }} />
        <button type="button" className={styles.btnOutline} onClick={() => setPanel(null)}>Đóng</button>
        <button type="submit" className={styles.btn}>{panel?.mode === 'edit' ? 'Lưu' : isPrivate ? 'Tạo khóa 1-1' : 'Tạo khóa học'}</button>
      </div>
    </form>
  )

  const renderRow = (c) => {
    const Icon = categoryIcon(c.sportCategoryName)
    const selected = panel?.course && keyOf(panel.course) === keyOf(c)
    const need = c.prerequisiteCourseId ? byId.get(c.prerequisiteCourseId) : null
    return (
      <React.Fragment key={keyOf(c)}>
        <div className={`${styles.row} ${selected ? styles.sel : ''} ${c.active ? '' : styles.off}`}>
          <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
          <div>
            <p className={styles.name}>{c.name}</p>
            {c.kind === 'PRIVATE' ? (
              <div className={styles.meta}>
                <span>{formatVND(c.pricePerSession)} mỗi buổi</span>
                {c.description ? <span>{c.description}</span> : null}
              </div>
            ) : (
              <div className={styles.meta}>
                <span className={styles.ladder} aria-hidden="true">{[1, 2, 3].map((n) => <u key={n} className={n <= LEVEL_STEP[c.level] ? styles.on : ''} />)}</span>
                <span>{LEVELS[c.level] || c.level}</span>
                <span>{need ? `Cần học trước: ${need.name}` : 'Ai cũng đăng ký được'}</span>
              </div>
            )}
          </div>
          <div className={styles.sessions}><span className={styles.num}>{c.totalSessions}</span><small>buổi</small></div>
          <div className={styles.price}><span className={styles.num}>{money(c.defaultTuition)}</span><small>đ</small></div>
          <div className={styles.actions}>
            {c.active && c.kind === 'GROUP' && <button type="button" className={styles.btn} onClick={() => onCreateClass(c.id)}>Tạo lớp</button>}
            <button type="button" className={styles.btnOutline} onClick={() => startEdit(c)}>Sửa</button>
            <button type="button" className={styles.link} onClick={() => toggle(c)}>{c.active ? 'Ngừng' : 'Bật lại'}</button>
          </div>
        </div>
        {selected && panel.mode === 'edit' && (
          <div className={styles.panel} id="course-panel">
            <h3>{c.kind === 'PRIVATE' ? 'Sửa khóa 1-1' : 'Sửa khóa học'}</h3>
            {courseForm}
          </div>
        )}
      </React.Fragment>
    )
  }

  return (
    <section>
      <div className={styles.toolbar}>
        <input type="text" aria-label="Tìm khóa học" placeholder="Tìm khóa học hoặc môn" value={filters.keyword} onChange={(e) => patch({ keyword: e.target.value })} />
        {kind === 'GROUP' && (
          <select aria-label="Trình độ" value={filters.level} onChange={(e) => patch({ level: e.target.value })}>
            <option value="">Mọi trình độ</option>
            {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        <button type="button" className={styles.create} onClick={() => startCreate(kind)}>+ {kind === 'PRIVATE' ? 'Khóa kèm 1-1' : 'Khóa học nhóm'}</button>
      </div>

      <div className={styles.kindTabs} role="tablist" aria-label="Loại khóa">
        {KIND_TABS.map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={kind === value} onClick={() => { setKind(value); setPanel(null) }}>
            {label} <em>{courses.filter((c) => c.kind === value && c.active === filters.active).length}</em>
          </button>
        ))}
      </div>

      {panel?.mode === 'create' && (
        <div className={`${styles.panel} ${styles.panelTop}`} id="course-panel">
          <h3>{form.kind === 'PRIVATE' ? 'Tạo khóa kèm 1-1' : 'Tạo khóa học nhóm'}</h3>
          {courseForm}
        </div>
      )}

      <div className={styles.chips} role="group" aria-label="Môn">
        <span className={styles.chipLabel}>Môn</span>
        <button type="button" aria-pressed={!filters.category} className={!filters.category ? styles.on : ''} onClick={() => patch({ category: '' })}>Tất cả <em>{countIn(() => true)}</em></button>
        {sportNames.map((name) => {
          const Icon = categoryIcon(name)
          return (
            <button key={name} type="button" aria-pressed={filters.category === name} className={filters.category === name ? styles.on : ''} onClick={() => patch({ category: name })}>
              <Icon size={15} aria-hidden="true" />{name}<em>{countIn((c) => c.sportCategoryName === name)}</em>
            </button>
          )
        })}
      </div>
      <div className={styles.chips} role="group" aria-label="Trạng thái">
        <span className={styles.chipLabel}>Loại</span>
        {[[true, 'Đang dùng'], [false, 'Đã ngừng']].map(([value, label]) => (
          <button key={label} type="button" aria-pressed={filters.active === value} className={filters.active === value ? styles.on : ''} onClick={() => patch({ active: value })}>
            {label} <em>{courses.filter((c) => c.kind === kind && c.active === value).length}</em>
          </button>
        ))}
      </div>
      {groups.length === 0 ? <p className={styles.empty}>Không có khóa nào khớp. Thử bỏ bớt bộ lọc.</p> : groups.map(([name, list]) => {
        const Icon = categoryIcon(name)
        const open = autoOpen || Boolean(opened[name])
        return (
          <div key={name}>
            <button type="button" className={`${styles.head} ${open ? '' : styles.closed}`} aria-expanded={open} onClick={() => setOpened((st) => ({ ...st, [name]: !open }))}>
              <Icon size={17} aria-hidden="true" />{name} <small>{list.length} khóa</small>
              <ChevronDown size={16} className={styles.caret} aria-hidden="true" />
            </button>
            {open && list.map(renderRow)}
          </div>
        )
      })}
    </section>
  )
}
