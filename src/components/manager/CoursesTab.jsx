import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { courseService } from '../../services/courseService'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import styles from '../../css/manager/ManagerDashboard.module.css'

const LEVELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' }
const labelStyle = { display: 'grid', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }
const EMPTY_COURSE = { sportCategoryId: '', name: '', description: '', level: 'BEGINNER', totalSessions: 12, defaultTuition: '', prerequisiteCourseId: '' }

// Khóa học (bản mẫu) và mở lớp mới từ khóa học
export default function CoursesTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [coaches, setCoaches] = useState([])
  const [active, setActive] = useState('true')
  const [form, setForm] = useState(EMPTY_COURSE)
  const [editId, setEditId] = useState(null)
  const [openFor, setOpenFor] = useState(null)
  const [classForm, setClassForm] = useState({ name: '', description: '', coachId: '', maxCapacity: 20, tuition: '', startDate: '', registrationOpensOn: '' })

  const load = useCallback(async () => {
    try {
      setCourses(await courseService.list(token, { active }))
    } catch (err) {
      toast.error(err.message || 'Không thể tải khóa học')
    }
  }, [token, active, toast])

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

  const payload = () => ({
    sportCategoryId: Number(form.sportCategoryId),
    name: form.name.trim(),
    description: form.description.trim(),
    level: form.level,
    totalSessions: Number(form.totalSessions),
    defaultTuition: Number(form.defaultTuition),
    prerequisiteCourseId: form.prerequisiteCourseId ? Number(form.prerequisiteCourseId) : null,
  })

  const save = async (e) => {
    e.preventDefault()
    try {
      if (editId) await courseService.update(token, editId, payload())
      else await courseService.create(token, payload())
      toast.success(editId ? 'Đã cập nhật khóa học' : 'Đã tạo khóa học')
      setForm(EMPTY_COURSE)
      setEditId(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Lưu khóa học thất bại')
    }
  }

  const edit = (c) => {
    setEditId(c.id)
    setForm({
      sportCategoryId: c.sportCategoryId, name: c.name, description: c.description || '', level: c.level,
      totalSessions: c.totalSessions, defaultTuition: c.defaultTuition, prerequisiteCourseId: c.prerequisiteCourseId || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  const startOpen = (c) => {
    setOpenFor(c)
    setClassForm({ name: `${c.name} - đợt mới`, description: c.description || '', coachId: '', maxCapacity: 20, tuition: c.defaultTuition, startDate: '', registrationOpensOn: new Date().toISOString().slice(0, 10) })
  }

  const createClass = async (e) => {
    e.preventDefault()
    try {
      await managerService.createClass(token, {
        courseId: openFor.id,
        coachId: Number(classForm.coachId),
        name: classForm.name.trim(),
        description: classForm.description.trim(),
        maxCapacity: Number(classForm.maxCapacity),
        tuition: Number(classForm.tuition),
        startDate: classForm.startDate,
        registrationOpensOn: classForm.registrationOpensOn,
      })
      toast.success('Đã tạo lớp (nháp). Vào tab "Vận Hành Lớp" để xếp lịch, sinh buổi học và mở đăng ký.')
      setOpenFor(null)
    } catch (err) {
      toast.error(err.message || 'Tạo lớp thất bại')
    }
  }

  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const cf = (key) => (e) => setClassForm({ ...classForm, [key]: e.target.value })

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{editId ? 'Sửa Khóa Học' : 'Tạo Khóa Học Mới'}</h2>
        <form onSubmit={save} className="row-wrap-end">
          <label style={labelStyle}>Môn thể thao
            <select required className={styles.select} value={form.sportCategoryId} onChange={f('sportCategoryId')}>
              <option value="">Chọn môn</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Tên khóa học
            <input required className={styles.input} placeholder="Ví dụ: Bơi cơ bản" value={form.name} onChange={f('name')} />
          </label>
          <label style={labelStyle}>Trình độ của khóa này
            <select className={styles.select} value={form.level} onChange={f('level')}>
              {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Số buổi
            <input required type="number" min="1" className={styles.input} style={{ width: 120 }} value={form.totalSessions} onChange={f('totalSessions')} />
          </label>
          <label style={labelStyle}>Học phí mặc định (đ)
            <input required type="number" min="0" className={styles.input} style={{ width: 170 }} value={form.defaultTuition} onChange={f('defaultTuition')} />
          </label>
          <label style={labelStyle}>Phải học xong khóa nào trước? (không bắt buộc)
            <select className={styles.select} value={form.prerequisiteCourseId} onChange={f('prerequisiteCourseId')}>
              <option value="">Không cần, ai cũng đăng ký được</option>
              {courses.filter((c) => c.id !== editId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={{ ...labelStyle, flex: 1, minWidth: 240 }}>Mô tả
            <input className={styles.input} value={form.description} onChange={f('description')} />
          </label>
          <button type="submit" className={styles.btnAction}>{editId ? 'Lưu' : 'Tạo Khóa Học'}</button>
          {editId && <button type="button" className={styles.btnAction} onClick={() => { setEditId(null); setForm(EMPTY_COURSE) }}>Hủy sửa</button>}
        </form>
      </div>

      {openFor && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Mở Lớp Từ "{openFor.name}"</h2>
          <form onSubmit={createClass} className="row-wrap-end">
            <label style={labelStyle}>Tên lớp
              <input required className={styles.input} value={classForm.name} onChange={cf('name')} />
            </label>
            <label style={labelStyle}>Coach phụ trách
              <select required className={styles.select} value={classForm.coachId} onChange={cf('coachId')}>
                <option value="">Chọn coach</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Sĩ số tối đa
              <input required type="number" min="1" className={styles.input} style={{ width: 120 }} value={classForm.maxCapacity} onChange={cf('maxCapacity')} />
            </label>
            <label style={labelStyle}>Học phí (đ)
              <input required type="number" min="0" className={styles.input} style={{ width: 150 }} value={classForm.tuition} onChange={cf('tuition')} />
            </label>
            <label style={labelStyle}>Ngày khai giảng
              <input required type="date" className={styles.input} value={classForm.startDate} onChange={cf('startDate')} />
            </label>
            <label style={labelStyle}>Mở đăng ký từ ngày
              <input required type="date" className={styles.input} value={classForm.registrationOpensOn} onChange={cf('registrationOpensOn')} />
            </label>
            <label style={{ ...labelStyle, flex: 1, minWidth: 240 }}>Mô tả lớp
              <input className={styles.input} value={classForm.description} onChange={cf('description')} />
            </label>
            <button type="submit" className={styles.btnAction}>Tạo Lớp</button>
            <button type="button" className={styles.btnAction} onClick={() => setOpenFor(null)}>Đóng</button>
          </form>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Danh Sách Khóa Học</h2>
          <select className={styles.select} value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="true">Đang dùng</option>
            <option value="false">Đã ngừng</option>
          </select>
        </div>
        {courses.length === 0 ? <p className="text-muted">Chưa có khóa học nào.</p> : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Khóa học</th>
                  <th className={styles.th}>Môn</th>
                  <th className={styles.th}>Trình độ</th>
                  <th className={styles.th}>Số buổi</th>
                  <th className={styles.th}>Học phí</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className={styles.row}>
                    <td className={styles.td}><strong>{c.name}</strong></td>
                    <td className={styles.td}>{c.sportCategoryName}</td>
                    <td className={styles.td}>{LEVELS[c.level] || c.level}</td>
                    <td className={styles.td}>{c.totalSessions}</td>
                    <td className={styles.td}>{formatVND(c.defaultTuition)}</td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        {c.active && <button type="button" className={styles.btnAction} onClick={() => startOpen(c)}>Mở lớp</button>}
                        <button type="button" className={styles.btnAction} onClick={() => edit(c)}>Sửa</button>
                        <button type="button" className={c.active ? styles.btnDanger : styles.btnAction} onClick={() => toggle(c)}>{c.active ? 'Ngừng' : 'Bật lại'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
