import React, { useEffect, useState } from 'react'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { courseService } from '../../services/courseService'
import { managerService } from '../../services/managerService'
import { formatVND, formatDate } from '../../utils/format'
import { dateKey } from '../../utils/overview'
import styles from '../../css/manager/CreateClass.module.css'

const DAYS = [[1, 'Thứ 2'], [2, 'Thứ 3'], [3, 'Thứ 4'], [4, 'Thứ 5'], [5, 'Thứ 6'], [6, 'Thứ 7'], [7, 'Chủ nhật']]
const LEVELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' }
const OPEN_MODES = [
  ['now', 'Mở đăng ký ngay', 'Hội viên thấy và đăng ký được lớp ngay sau khi tạo.'],
  ['date', 'Tự mở vào một ngày', 'Lớp ẩn tới ngày bạn chọn, rồi hệ thống tự mở đăng ký.'],
  ['draft', 'Để nháp, tôi mở sau', 'Lớp chưa hiện cho hội viên. Mở tay trong phần Quản lý lớp.'],
]
const hm = (t) => String(t).slice(0, 5)
const shiftDay = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + n))
}
// Thứ trong tuần kiểu 1 = thứ 2 ... 7 = chủ nhật
const weekdayOf = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return ((new Date(y, m - 1, d).getDay() + 6) % 7) + 1
}

// Ước lượng buổi đầu, buổi cuối từ ngày khai giảng, lịch tuần và số buổi của khóa (cùng cách đếm với hệ thống: mỗi dòng lịch là một buổi)
function estimate(startDate, rows, total) {
  if (!startDate || !rows.length || !total) return null
  const perDay = rows.reduce((m, r) => ({ ...m, [r.dayOfWeek]: (m[r.dayOfWeek] || 0) + 1 }), {})
  let day = startDate
  let count = 0
  let first = null
  for (let guard = 0; guard < 800 && count < total; guard += 1) {
    const n = perDay[weekdayOf(day)] || 0
    if (n) {
      first = first || day
      count += n
    }
    if (count >= total) return { first, last: day }
    day = shiftDay(day, 1)
  }
  return null
}

// Trang tạo lớp: một form 3 phần (thông tin lớp, lịch tuần, mở đăng ký) và bảng tóm tắt luôn hiện bên phải.
// Bấm "Tạo lớp" là tạo lớp, lưu lịch tuần, sinh đủ buổi học và mở đăng ký theo lựa chọn, không phải đi qua nhiều tab.
export default function CreateClassPage({ initialCourseId, onCancel, onDone }) {
  const { token } = useAuth()
  const toast = useToast()
  const [today] = useState(() => dateKey(new Date()))
  const [courses, setCourses] = useState([])
  const [coaches, setCoaches] = useState([])
  const [rooms, setRooms] = useState([])
  const [slots, setSlots] = useState([])
  const [form, setForm] = useState({ courseId: initialCourseId ? String(initialCourseId) : '', name: '', coachId: '', maxCapacity: 20, tuition: '', startDate: '', description: '' })
  const [rows, setRows] = useState([{ dayOfWeek: 2, timeSlotId: '', roomId: '' }])
  const [openMode, setOpenMode] = useState('now')
  const [opensOn, setOpensOn] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([courseService.list(token, { active: 'true' }), managerService.getAccounts(token), managerService.getRooms(token), managerService.getTimeSlots(token)])
      .then(([c, a, r, t]) => {
        setCourses(c)
        setCoaches(a.filter((u) => u.role === 'COACH' && (u.active ?? u.isActive) !== false))
        setRooms(r)
        setSlots(t.filter((s) => s.active).sort((x, y) => x.slotNo - y.slotNo))
      })
      .catch((err) => toast.error(err.message || 'Không thể tải dữ liệu để tạo lớp'))
  }, [token, toast])

  const course = courses.find((c) => String(c.id) === form.courseId)
  // Khi chọn khóa: điền sẵn học phí, tên gợi ý; bỏ coach không dạy môn đó
  useEffect(() => {
    if (!course) return
    setForm((f) => ({ ...f, tuition: f.tuition === '' ? course.defaultTuition : f.tuition, name: f.name || `${course.name} - đợt mới`, description: f.description || course.description || '' }))
  }, [course?.id])

  const teaching = course ? coaches.filter((c) => (c.sports || []).some((s) => s.id === course.sportCategoryId)) : []
  const usableRooms = course ? rooms.filter((r) => !/MAINT/i.test(r.maintenanceStatus || '') && (!(r.sports || []).length || r.sports.some((s) => s.id === course.sportCategoryId))) : rooms
  const validRows = rows.filter((r) => r.timeSlotId && r.roomId)
  const plan = estimate(form.startDate, validRows, course?.totalSessions)
  const coach = teaching.find((c) => String(c.id) === form.coachId)
  const slotOf = (id) => slots.find((s) => String(s.id) === String(id))

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const setRow = (i, patch) => setRows((list) => list.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  // Điều còn thiếu, hiện ngay ở bảng tóm tắt để manager biết vì sao chưa bấm được
  const missing = [
    !course && 'Chọn khóa học',
    course && !form.coachId && 'Chọn coach',
    !form.startDate && 'Chọn ngày khai giảng',
    validRows.length === 0 && 'Thêm ít nhất một buổi trong tuần',
    validRows.length !== rows.length && 'Điền đủ khung giờ và phòng cho mọi dòng lịch',
    openMode === 'date' && !opensOn && 'Chọn ngày tự mở đăng ký',
  ].filter(Boolean)

  const submit = async (e) => {
    e.preventDefault()
    if (missing.length) { toast.error(missing[0]); return }
    setBusy(true)
    let created = null
    try {
      created = await managerService.createClass(token, {
        courseId: course.id,
        coachId: Number(form.coachId),
        name: form.name.trim(),
        description: form.description.trim(),
        maxCapacity: Number(form.maxCapacity),
        tuition: Number(form.tuition),
        startDate: form.startDate,
        registrationOpensOn: openMode === 'date' ? opensOn : null,
      })
      await managerService.replaceClassSchedules(token, created.id, validRows.map((r) => ({ dayOfWeek: Number(r.dayOfWeek), timeSlotId: Number(r.timeSlotId), roomId: Number(r.roomId) })))
      await managerService.generateClassSessions(token, created.id)
      if (openMode === 'now') await managerService.openClass(token, created.id)
      toast.success(openMode === 'now' ? 'Đã tạo lớp và mở đăng ký' : openMode === 'date' ? `Đã tạo lớp, tự mở đăng ký ngày ${formatDate(opensOn)}` : 'Đã tạo lớp ở dạng nháp')
      onDone(created.id)
    } catch (err) {
      // Lớp đã tạo nhưng một bước sau lỗi (trùng phòng, coach bận...): mở lớp đó để sửa tiếp, không tạo lớp trùng
      toast.error(created ? `Đã tạo lớp nhưng chưa xong: ${err.message}. Hãy sửa ở phần thiết lập lớp.` : (err.message || 'Tạo lớp thất bại'))
      if (created) onDone(created.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onCancel}><ArrowLeft size={16} aria-hidden="true" />Danh sách lớp</button>
      <form onSubmit={submit} className={styles.layout}>
        <div className={styles.sections}>
          <section className={styles.section} aria-labelledby="cc-1">
            <header><span className={styles.step}>1</span><h2 id="cc-1">Khóa học và thông tin lớp</h2></header>
            <div className={styles.fields}>
              <label className={styles.wide}>Khóa học
                <select required value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, coachId: '', tuition: '', name: '', description: '' })}>
                  <option value="">Chọn khóa học</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.sportCategoryName} · {c.name} · {LEVELS[c.level] || c.level} · {c.totalSessions} buổi</option>)}
                </select>
              </label>
              <label className={styles.wide}>Tên lớp
                <input required maxLength={200} value={form.name} onChange={set('name')} placeholder="Ví dụ: Bơi cơ bản - Tối T3/T5" />
              </label>
              <label>Coach phụ trách
                <select required value={form.coachId} onChange={set('coachId')} disabled={!course}>
                  <option value="">{!course ? 'Chọn khóa học trước' : teaching.length ? 'Chọn coach' : 'Chưa có coach dạy môn này'}</option>
                  {teaching.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
                {course && teaching.length === 0 && <span className={styles.hint}>Vào Danh mục, mục Coach để gán môn {course.sportCategoryName} cho một coach.</span>}
              </label>
              <label>Ngày khai giảng
                <input required type="date" min={shiftDay(today, 1)} value={form.startDate} onChange={set('startDate')} />
              </label>
              <label>Sĩ số tối đa
                <input required type="number" min="1" value={form.maxCapacity} onChange={set('maxCapacity')} />
              </label>
              <label>Học phí (đ)
                <input required type="number" min="0" value={form.tuition} onChange={set('tuition')} />
                {course && Number(form.tuition) !== Number(course.defaultTuition) && <span className={styles.hint}>Học phí mặc định của khóa: {formatVND(course.defaultTuition)}</span>}
              </label>
              <label className={styles.wide}>Mô tả cho hội viên
                <input value={form.description} onChange={set('description')} />
              </label>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="cc-2">
            <header><span className={styles.step}>2</span><h2 id="cc-2">Lịch tuần</h2></header>
            <p className={styles.lead}>Mỗi dòng là một buổi lặp lại hằng tuần. Hệ thống tạo đủ {course ? course.totalSessions : 'số'} buổi của khóa, bắt đầu từ ngày khai giảng.</p>
            <div className={styles.rows}>
              {rows.map((r, i) => (
                <div key={i} className={styles.row}>
                  <label>Thứ
                    <select value={r.dayOfWeek} onChange={(e) => setRow(i, { dayOfWeek: Number(e.target.value) })}>
                      {DAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label>Khung giờ
                    <select value={r.timeSlotId} onChange={(e) => setRow(i, { timeSlotId: e.target.value })}>
                      <option value="">Chọn</option>
                      {slots.map((s) => <option key={s.id} value={s.id}>{hm(s.startTime)} – {hm(s.endTime)}</option>)}
                    </select>
                  </label>
                  <label>Phòng
                    <select value={r.roomId} onChange={(e) => setRow(i, { roomId: e.target.value })}>
                      <option value="">Chọn</option>
                      {usableRooms.map((room) => <option key={room.id} value={room.id}>{room.roomName}{room.floor ? ` · ${room.floor}` : ''}</option>)}
                    </select>
                  </label>
                  <button type="button" className={styles.icon} aria-label="Xóa dòng lịch này" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button type="button" className={styles.add} onClick={() => setRows([...rows, { dayOfWeek: rows.length ? Math.min(7, Number(rows[rows.length - 1].dayOfWeek) + 2) : 2, timeSlotId: rows[rows.length - 1]?.timeSlotId || '', roomId: rows[rows.length - 1]?.roomId || '' }])}>
              <Plus size={16} aria-hidden="true" />Thêm buổi trong tuần
            </button>
          </section>

          <section className={styles.section} aria-labelledby="cc-3">
            <header><span className={styles.step}>3</span><h2 id="cc-3">Mở đăng ký</h2></header>
            <div className={styles.choices} role="radiogroup" aria-labelledby="cc-3">
              {OPEN_MODES.map(([value, label, note]) => (
                <label key={value} className={`${styles.choice} ${openMode === value ? styles.on : ''}`}>
                  <input type="radio" name="openMode" value={value} checked={openMode === value} onChange={() => setOpenMode(value)} />
                  <span><b>{label}</b><small>{note}</small></span>
                </label>
              ))}
            </div>
            {openMode === 'date' && (
              <label className={styles.inline}>Ngày tự mở đăng ký
                <input type="date" min={today} max={form.startDate ? shiftDay(form.startDate, -1) : undefined} value={opensOn} onChange={(e) => setOpensOn(e.target.value)} />
              </label>
            )}
          </section>
        </div>

        <aside className={styles.summary} aria-label="Tóm tắt lớp">
          <h2>Tóm tắt lớp</h2>
          <dl>
            <div><dt>Khóa học</dt><dd>{course ? `${course.sportCategoryName} · ${course.name}` : '—'}</dd></div>
            <div><dt>Coach</dt><dd>{coach?.fullName || '—'}</dd></div>
            <div><dt>Lịch tuần</dt><dd>{validRows.length ? validRows.map((r) => `${DAYS.find(([v]) => v === Number(r.dayOfWeek))[1]} ${hm(slotOf(r.timeSlotId)?.startTime || '')}`).join(' · ') : '—'}</dd></div>
            <div><dt>Số buổi</dt><dd className={styles.big}>{course ? course.totalSessions : '—'}</dd></div>
            <div><dt>Buổi đầu → buổi cuối</dt><dd>{plan ? `${formatDate(plan.first)} → ${formatDate(plan.last)}` : '—'}</dd></div>
            <div><dt>Học phí · sĩ số</dt><dd>{form.tuition !== '' ? `${formatVND(form.tuition)} · ${form.maxCapacity} chỗ` : '—'}</dd></div>
            <div><dt>Thu tối đa khi đủ chỗ</dt><dd>{form.tuition !== '' ? formatVND(Number(form.tuition) * Number(form.maxCapacity || 0)) : '—'}</dd></div>
          </dl>
          {missing.length > 0 && <ul className={styles.missing}>{missing.map((m) => <li key={m}>{m}</li>)}</ul>}
          <button type="submit" className={styles.submit} disabled={busy || missing.length > 0}>
            {busy ? 'Đang tạo lớp…' : openMode === 'now' ? 'Tạo lớp và mở đăng ký' : 'Tạo lớp'}
          </button>
          <p className={styles.note}>Hệ thống kiểm tra coach và phòng có trống không trước khi tạo buổi học.</p>
        </aside>
      </form>
    </div>
  )
}
