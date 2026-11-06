import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { courseService } from '../../services/courseService'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import { categoryIcon } from '../../utils/sportIcon'
import { dateKey } from '../../utils/overview'
import styles from '../../css/manager/ManagerCourses.module.css'

const LEVELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' }
const LEVEL_STEP = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 }
const EMPTY_COURSE = { sportCategoryId: '', name: '', description: '', level: 'BEGINNER', totalSessions: 12, defaultTuition: '', prerequisiteCourseId: '' }
const EMPTY_CLASS = { name: '', description: '', coachId: '', maxCapacity: 20, tuition: '', startDate: '', registrationOpensOn: '' }
const money = (v) => formatVND(v).replace(' đ', '')
// Lùi hoặc tiến n ngày từ một ngày dạng yyyy-mm-dd
const shiftDay = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + n))
}

// Khóa học (bản mẫu) và mở lớp mới từ khóa học. Form sửa và form mở lớp mở ngay dưới khóa đang chọn
export default function CoursesTab({ onClassCreated }) {
  const { token } = useAuth()
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [coaches, setCoaches] = useState([])
  const [filters, setFilters] = useState({ keyword: '', level: '', category: '', active: true })
  const [closed, setClosed] = useState({})
  // panel: null | { mode: 'create' } | { mode: 'edit' | 'open', course }
  const [panel, setPanel] = useState(null)
  const [form, setForm] = useState(EMPTY_COURSE)
  const [classForm, setClassForm] = useState(EMPTY_CLASS)
  const [today] = useState(() => dateKey(new Date()))

  const load = useCallback(async () => {
    try {
      const [on, off] = await Promise.all([courseService.list(token, { active: 'true' }), courseService.list(token, { active: 'false' })])
      setCourses([...on, ...off])
    } catch (err) {
      toast.error(err.message || 'Không thể tải khóa học')
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    Promise.all([managerService.getCategories(token), managerService.getAccounts(token)])
      .then(([c, a]) => {
        setCategories(c)
        setCoaches(a.filter((u) => u.role === 'COACH'))
      })
      .catch(() => {})
  }, [token])

  // Form mở ra ở dưới khóa đang chọn: cuộn tới đó và đặt con trỏ vào ô đầu tiên
  useEffect(() => {
    if (!panel) return
    const el = document.getElementById('course-panel')
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    el?.querySelector('input, select')?.focus({ preventScroll: true })
  }, [panel])

  const byId = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])
  const shown = useMemo(() => {
    const key = filters.keyword.trim().toLowerCase()
    return courses.filter((c) => c.active === filters.active
      && (!filters.level || c.level === filters.level)
      && (!filters.category || c.sportCategoryName === filters.category)
      && (!key || `${c.name} ${c.sportCategoryName}`.toLowerCase().includes(key)))
  }, [courses, filters])
  const groups = useMemo(() => {
    const map = new Map()
    shown.forEach((c) => map.set(c.sportCategoryName, [...(map.get(c.sportCategoryName) || []), c]))
    return [...map]
  }, [shown])
  const sportNames = useMemo(() => [...new Set(courses.map((c) => c.sportCategoryName))].sort(), [courses])
  const countIn = (pred) => courses.filter((c) => c.active === filters.active && pred(c)).length

  const patch = (changes) => setFilters((f) => ({ ...f, ...changes }))
  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const cf = (key) => (e) => setClassForm({ ...classForm, [key]: e.target.value })

  const startCreate = () => {
    setForm(EMPTY_COURSE)
    setPanel({ mode: 'create' })
  }
  const startEdit = (c) => {
    setForm({
      sportCategoryId: c.sportCategoryId, name: c.name, description: c.description || '', level: c.level,
      totalSessions: c.totalSessions, defaultTuition: c.defaultTuition, prerequisiteCourseId: c.prerequisiteCourseId || '',
    })
    setPanel({ mode: 'edit', course: c })
  }
  const startOpen = (c) => {
    setClassForm({ ...EMPTY_CLASS, name: `${c.name} - đợt mới`, description: c.description || '', tuition: c.defaultTuition })
    setPanel({ mode: 'open', course: c })
  }

  const save = async (e) => {
    e.preventDefault()
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
      await courseService.setActive(token, c.id, !c.active)
      toast.success(c.active ? 'Đã ngừng khóa học' : 'Đã bật lại khóa học')
      load()
    } catch (err) {
      toast.error(err.message || 'Đổi trạng thái thất bại')
    }
  }

  const createClass = async (e) => {
    e.preventDefault()
    try {
      const created = await managerService.createClass(token, {
        courseId: panel.course.id,
        coachId: Number(classForm.coachId),
        name: classForm.name.trim(),
        description: classForm.description.trim(),
        maxCapacity: Number(classForm.maxCapacity),
        tuition: Number(classForm.tuition),
        startDate: classForm.startDate,
        registrationOpensOn: classForm.registrationOpensOn || null,
      })
      toast.success('Đã tạo lớp (nháp). Hãy xếp lịch tuần rồi bấm "Công bố lớp".')
      setPanel(null)
      onClassCreated?.(created?.id)
    } catch (err) {
      toast.error(err.message || 'Tạo lớp thất bại')
    }
  }

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
          <input required placeholder="Ví dụ: Bơi cơ bản" value={form.name} onChange={f('name')} />
        </label>
        <label>Trình độ của khóa này
          <select value={form.level} onChange={f('level')}>
            {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Số buổi
          <input required type="number" min="1" value={form.totalSessions} onChange={f('totalSessions')} />
        </label>
        <label>Học phí mặc định (đ)
          <input required type="number" min="0" value={form.defaultTuition} onChange={f('defaultTuition')} />
        </label>
        <label>Khóa cần học trước
          <select value={form.prerequisiteCourseId} onChange={f('prerequisiteCourseId')}>
            <option value="">Không cần, ai cũng đăng ký được</option>
            {courses.filter((c) => c.id !== panel?.course?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {form.level === 'ADVANCED' && <span className={styles.hint}>Khóa nâng cao: hội viên tự xác nhận đã đủ điều kiện khi đăng ký, hệ thống không kiểm tra họ đã học khóa nào. Nên chọn khóa tiên quyết để lời nhắc ghi rõ họ cần học khóa nào trước.</span>}
        </label>
        <label className={styles.wide}>Mô tả
          <input value={form.description} onChange={f('description')} />
        </label>
      </div>
      <div className={styles.foot}>
        <span style={{ flex: 1 }} />
        <button type="button" className={styles.btnOutline} onClick={() => setPanel(null)}>Đóng</button>
        <button type="submit" className={styles.btn}>{panel?.mode === 'edit' ? 'Lưu' : 'Tạo khóa học'}</button>
      </div>
    </form>
  )

  // Chỉ cho chọn coach đang hoạt động và được gán dạy môn của khóa; ngày chỉ cho chọn trong khoảng hợp lệ (BE kiểm tra lại)
  const teaching = panel?.mode === 'open'
    ? coaches.filter((c) => (c.active ?? c.isActive) !== false && (c.sports || []).some((s) => s.id === panel.course.sportCategoryId))
    : []
  const minStart = classForm.registrationOpensOn && classForm.registrationOpensOn >= today ? shiftDay(classForm.registrationOpensOn, 1) : today
  const maxOpens = classForm.startDate ? shiftDay(classForm.startDate, -1) : undefined
  const onStartDate = (e) => {
    const startDate = e.target.value
    setClassForm({ ...classForm, startDate, registrationOpensOn: startDate && classForm.registrationOpensOn >= startDate ? '' : classForm.registrationOpensOn })
  }

  const openForm = panel?.mode === 'open' && (
    <form onSubmit={createClass}>
      <div className={styles.fields}>
        <label>Tên lớp
          <input required value={classForm.name} onChange={cf('name')} />
        </label>
        <label>Coach phụ trách
          <select required value={classForm.coachId} onChange={cf('coachId')} disabled={teaching.length === 0}>
            <option value="">{teaching.length ? 'Chọn coach' : 'Chưa có coach dạy môn này'}</option>
            {teaching.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          {teaching.length === 0 && <span className={styles.hint}>Vào Danh mục, mục Coach để gán môn {panel.course.sportCategoryName} cho một coach.</span>}
        </label>
        <label>Sĩ số tối đa
          <input required type="number" min="1" value={classForm.maxCapacity} onChange={cf('maxCapacity')} />
        </label>
        <label>Học phí (đ)
          <input required type="number" min="0" value={classForm.tuition} onChange={cf('tuition')} />
        </label>
        <label>Ngày khai giảng
          <input required type="date" min={minStart} value={classForm.startDate} onChange={onStartDate} />
        </label>
        <label>Tự mở đăng ký vào ngày
          <input type="date" min={today} max={maxOpens} value={classForm.registrationOpensOn} onChange={cf('registrationOpensOn')} />
          <span className={styles.hint}>Bỏ trống thì lớp ở trạng thái nháp tới khi bạn mở tay</span>
        </label>
        <label className={styles.wide}>Mô tả lớp
          <input value={classForm.description} onChange={cf('description')} />
        </label>
      </div>
      <div className={styles.foot}>
        <p>Đủ {Number(classForm.maxCapacity) || 0} chỗ thu <b>{formatVND((Number(classForm.maxCapacity) || 0) * (Number(classForm.tuition) || 0))}</b>. Lớp tạo ra ở dạng nháp, xếp lịch tuần xong mới công bố.</p>
        <button type="button" className={styles.btnOutline} onClick={() => setPanel(null)}>Đóng</button>
        <button type="submit" className={styles.btn}>Tạo lớp nháp</button>
      </div>
    </form>
  )

  const renderRow = (c) => {
    const Icon = categoryIcon(c.sportCategoryName)
    const selected = panel?.course?.id === c.id
    const need = c.prerequisiteCourseId ? byId.get(c.prerequisiteCourseId) : null
    return (
      <React.Fragment key={c.id}>
        <div className={`${styles.row} ${selected ? styles.sel : ''} ${c.active ? '' : styles.off}`}>
          <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
          <div>
            <p className={styles.name}>{c.name}</p>
            <div className={styles.meta}>
              <span className={styles.ladder} aria-hidden="true">{[1, 2, 3].map((n) => <u key={n} className={n <= LEVEL_STEP[c.level] ? styles.on : ''} />)}</span>
              <span>{LEVELS[c.level] || c.level}</span>
              <span>{need ? `Cần học trước: ${need.name}` : 'Ai cũng đăng ký được'}</span>
            </div>
          </div>
          <div className={styles.sessions}><span className={styles.num}>{c.totalSessions}</span><small>buổi</small></div>
          <div className={styles.price}><span className={styles.num}>{money(c.defaultTuition)}</span><small>đ</small></div>
          <div className={styles.actions}>
            {c.active && <button type="button" className={styles.btn} onClick={() => (selected && panel.mode === 'open' ? setPanel(null) : startOpen(c))}>{selected && panel.mode === 'open' ? 'Đóng' : 'Mở lớp'}</button>}
            <button type="button" className={styles.btnOutline} onClick={() => startEdit(c)}>Sửa</button>
            <button type="button" className={styles.link} onClick={() => toggle(c)}>{c.active ? 'Ngừng' : 'Bật lại'}</button>
          </div>
        </div>
        {selected && (panel.mode === 'open' || panel.mode === 'edit') && (
          <div className={styles.panel} id="course-panel">
            <h3>{panel.mode === 'open' ? 'Mở lớp từ khóa này' : 'Sửa khóa học'}</h3>
            {panel.mode === 'open' ? openForm : courseForm}
          </div>
        )}
      </React.Fragment>
    )
  }

  return (
    <section>
      <div className={styles.toolbar}>
        <input type="text" aria-label="Tìm khóa học" placeholder="Tìm khóa học hoặc môn" value={filters.keyword} onChange={(e) => patch({ keyword: e.target.value })} />
        <select aria-label="Trình độ" value={filters.level} onChange={(e) => patch({ level: e.target.value })}>
          <option value="">Mọi trình độ</option>
          {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="button" className={styles.create} onClick={startCreate}>+ Tạo khóa học</button>
      </div>

      {panel?.mode === 'create' && (
        <div className={`${styles.panel} ${styles.panelTop}`} id="course-panel">
          <h3>Tạo khóa học mới</h3>
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
            {label} <em>{courses.filter((c) => c.active === value).length}</em>
          </button>
        ))}
      </div>
      <p className={styles.summary}>Đang hiện <b>{shown.length}</b> / {courses.length} khóa</p>

      {groups.length === 0 ? <p className={styles.empty}>Không có khóa học nào khớp. Thử bỏ bớt bộ lọc.</p> : groups.map(([name, list]) => {
        const Icon = categoryIcon(name)
        const open = !closed[name]
        return (
          <div key={name}>
            <button type="button" className={`${styles.head} ${open ? '' : styles.closed}`} aria-expanded={open} onClick={() => setClosed((s) => ({ ...s, [name]: open }))}>
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
