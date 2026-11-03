import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { apiRequest } from '../../services/apiHelper'
import { formatVND } from '../../utils/format'
import { dayMonth } from '../../utils/labels'
import ConfirmModal from '../common/ConfirmModal'
import ReasonDialog from '../common/ReasonDialog'
import styles from '../../css/manager/ManagerDashboard.module.css'
import ui from '../../css/manager/ManagerUi.module.css'

const labelStyle = { display: 'grid', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }
const DAYS = [[1, 'T2'], [2, 'T3'], [3, 'T4'], [4, 'T5'], [5, 'T6'], [6, 'T7'], [7, 'CN']]
const WEEKDAY = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7']
const STATUS = { OPEN: 'Còn trống', HELD: 'Đang giữ chỗ', BOOKED: 'Đã đặt', CANCELED: 'Đã hủy' }
const EMPTY = { coachId: '', sportCategoryId: '', roomId: '', fromDate: '', toDate: '', days: [], timeSlotIds: [] }
const DAY_MS = 86400000

const when = (v) => new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const hm = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const dayKey = (v) => new Date(v).toLocaleDateString('sv-SE')

// Thứ Hai của tuần chứa ngày d (giờ máy)
function mondayOf(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

// Suất 1-1 chỉ lấy phần đầu của khung giờ (theo cấu hình), nên ghi giờ thật của suất chứ không ghi cả khung
function slotRange(t, minutes) {
  const [h, m] = String(t.startTime).slice(0, 5).split(':').map(Number)
  const [eh, em] = String(t.endTime).slice(0, 5).split(':').map(Number)
  const length = Math.min(minutes, (eh * 60 + em) - (h * 60 + m))
  const end = h * 60 + m + length
  const fmt = (x) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
  return `${fmt(h * 60 + m)}–${fmt(end)}`
}

// Trung tâm quyết định lịch 1-1: manager mở suất cho coach (hàng loạt), xóa suất trống, hủy suất đã có người đặt.
// Danh sách xem theo tuần và theo ngày như trang đặt suất của hội viên.
export default function CoachSlotsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [coaches, setCoaches] = useState([])
  const [rooms, setRooms] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [slotMinutes, setSlotMinutes] = useState(60)
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [result, setResult] = useState(null)
  const [slots, setSlots] = useState([])
  const [filter, setFilter] = useState({ coachId: '', status: '' })
  const [weekOffset, setWeekOffset] = useState(0)
  const [day, setDay] = useState('')
  const [target, setTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    Promise.all([managerService.getAccounts(token), managerService.getRooms(token), managerService.getTimeSlots(token)])
      .then(([accounts, r, t]) => {
        setCoaches(accounts.filter((u) => u.role === 'COACH' && u.active !== false))
        setRooms(r)
        setTimeSlots(t.filter((x) => x.active))
      })
      .catch((err) => toast.error(err.message || 'Không thể tải dữ liệu'))
    apiRequest('GET', '/api/public/landing-settings').then((st) => setSlotMinutes(Number(st?.['one_on_one.slot_minutes']) || 60)).catch(() => {})
  }, [token])

  const load = useCallback(async () => {
    try {
      setSlots(await managerService.getCoachSlots(token, filter))
    } catch (err) {
      toast.error(err.message || 'Không thể tải lịch 1-1')
    }
  }, [token, filter])

  useEffect(() => {
    load()
  }, [load])

  const coach = coaches.find((c) => String(c.id) === form.coachId)
  const coachSports = coach?.sports || []
  const roomsForSport = rooms.filter((r) => (r.sports || []).some((s) => String(s.id) === form.sportCategoryId))
  const toggle = (key, value) => setForm((f) => ({
    ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
  }))

  const create = async (e) => {
    e.preventDefault()
    if (!form.days.length || !form.timeSlotIds.length) {
      toast.error('Hãy chọn ít nhất một thứ trong tuần và một giờ bắt đầu')
      return
    }
    try {
      const res = await managerService.createCoachSlots(token, {
        coachId: Number(form.coachId),
        sportCategoryId: Number(form.sportCategoryId),
        roomId: form.roomId ? Number(form.roomId) : null,
        fromDate: form.fromDate,
        toDate: form.toDate,
        daysOfWeek: form.days,
        timeSlotIds: form.timeSlotIds,
      })
      setResult(res)
      if (res.created > 0) toast.success(`Đã mở ${res.created} suất 1-1`)
      else toast.error('Không mở được suất nào, xem lý do bên dưới')
      load()
    } catch (err) {
      toast.error(err.message || 'Mở suất 1-1 thất bại')
    }
  }

  // Xóa suất trống (hộp thoại xác nhận)
  const act = async () => {
    setConfirm(false)
    try {
      await managerService.deleteCoachSlot(token, target.id)
      toast.success('Đã xóa suất')
      setTarget(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Thao tác thất bại')
    }
  }

  // Hủy suất đã có người đặt: cần lý do, hội viên được hoàn đủ tiền
  const cancelBooked = async (reason) => {
    const slot = cancelTarget
    setCancelTarget(null)
    try {
      await managerService.cancelCoachSlot(token, slot.id, reason)
      toast.success('Đã hủy buổi, hội viên được hoàn tiền và báo qua ứng dụng và email')
      load()
    } catch (err) {
      toast.error(err.message || 'Hủy buổi thất bại')
    }
  }

  const skippedLabel = (s) => {
    const t = timeSlots.find((x) => x.id === s.timeSlotId)
    return `${new Date(s.date).toLocaleDateString('vi-VN')}${t ? ` khung ${t.slotNo}` : ''}: ${s.reason}`
  }

  // Xem theo tuần: dải 7 ngày kèm số suất, bấm một ngày để xem các suất của ngày đó
  const thisMonday = mondayOf(new Date())
  const monday = new Date(thisMonday.getTime() + weekOffset * 7 * DAY_MS)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return { date: d, key: d.toLocaleDateString('sv-SE') }
  })
  const countByDay = useMemo(() => {
    const map = {}
    slots.forEach((s) => { map[dayKey(s.startAt)] = (map[dayKey(s.startAt)] || 0) + 1 })
    return map
  }, [slots])
  const weekOf = (key) => Math.round((mondayOf(new Date(`${key}T00:00:00`)) - thisMonday) / (7 * DAY_MS))
  const weeks = slots.map((s) => weekOf(dayKey(s.startAt)))
  const lastWeek = weeks.length ? Math.max(0, ...weeks) : 0
  const firstWeek = weeks.length ? Math.min(0, ...weeks) : 0
  const activeKey = week.some((d) => d.key === day) ? day : (week.find((d) => countByDay[d.key]) || week[0]).key
  const activeDate = week.find((d) => d.key === activeKey).date
  const shown = slots.filter((s) => dayKey(s.startAt) === activeKey).sort((a, b) => a.startAt.localeCompare(b.startAt))
  const sunday = week[6].date
  const range = `${dayMonth(monday)} – ${dayMonth(sunday)}/${sunday.getFullYear()}`

  return (
    <>
      <div className={styles.card}>
        <div className={ui.head}>
          <p className={ui.lead} style={{ margin: 0 }}>Mỗi suất dài {slotMinutes} phút.</p>
          <button type="button" className={ui.btn} aria-expanded={showForm} onClick={() => setShowForm(!showForm)}>{showForm ? 'Đóng' : '+ Mở suất mới'}</button>
        </div>

        {showForm && (
          <form onSubmit={create} style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
            <div className="row-wrap-end">
              <label style={labelStyle}>Coach
                <select required className={styles.select} value={form.coachId}
                  onChange={(e) => setForm({ ...form, coachId: e.target.value, sportCategoryId: '', roomId: '' })}>
                  <option value="">Chọn coach</option>
                  {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </label>
              <label style={labelStyle}>Môn
                <select required className={styles.select} value={form.sportCategoryId} disabled={!coach}
                  onChange={(e) => setForm({ ...form, sportCategoryId: e.target.value, roomId: '' })}>
                  <option value="">{coach && coachSports.length === 0 ? 'Coach chưa được gán môn' : 'Chọn môn'}</option>
                  {coachSports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label style={labelStyle}>Phòng
                <select className={styles.select} value={form.roomId} disabled={!form.sportCategoryId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                  <option value="">Tự chọn phòng trống</option>
                  {roomsForSport.map((r) => <option key={r.id} value={r.id}>{r.roomName}{r.floor ? ` · ${r.floor}` : ''}</option>)}
                </select>
              </label>
              <label style={labelStyle}>Từ ngày
                <input required type="date" className={styles.input} value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
              </label>
              <label style={labelStyle}>Đến ngày
                <input required type="date" className={styles.input} value={form.toDate} min={form.fromDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
              </label>
            </div>
            <div>
              <p style={labelStyle}>Các thứ trong tuần</p>
              <div className={ui.chips} role="group" aria-label="Các thứ trong tuần">
                {DAYS.map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={form.days.includes(v)} className={form.days.includes(v) ? ui.on : ''} onClick={() => toggle('days', v)}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={labelStyle}>Giờ bắt đầu (mỗi suất {slotMinutes} phút)</p>
              <div className={ui.chips} role="group" aria-label="Khung giờ">
                {timeSlots.map((t) => (
                  <button key={t.id} type="button" aria-pressed={form.timeSlotIds.includes(t.id)} className={form.timeSlotIds.includes(t.id) ? ui.on : ''} onClick={() => toggle('timeSlotIds', t.id)}>
                    {slotRange(t, slotMinutes)}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-hint">Giá một suất theo hạng coach: hạng càng cao giá càng cao (xem ở Danh mục, tab Coach).</p>
            <div>
              <button type="submit" className={ui.btn}>Mở suất</button>
            </div>
            {result && result.skipped.length > 0 && (
              <div>
                <strong>Đã mở {result.created} suất, bỏ qua {result.skipped.length} ô:</strong>
                <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {result.skipped.map((s, i) => <li key={i}>{skippedLabel(s)}</li>)}
                </ul>
              </div>
            )}
          </form>
        )}

        <div className="toolbar">
          <select className={styles.select} aria-label="Coach" value={filter.coachId} onChange={(e) => setFilter({ ...filter, coachId: e.target.value })}>
            <option value="">Mọi coach</option>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <select className={styles.select} aria-label="Trạng thái" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">Mọi trạng thái</option>
            {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className={ui.weekBar}>
          <button type="button" aria-label="Tuần trước" disabled={weekOffset <= firstWeek} onClick={() => setWeekOffset(weekOffset - 1)}>‹</button>
          <p className={ui.range}>{range}</p>
          <button type="button" className={weekOffset === 0 ? ui.on : ''} onClick={() => setWeekOffset(0)}>Tuần này</button>
          <button type="button" aria-label="Tuần sau" disabled={weekOffset >= lastWeek} onClick={() => setWeekOffset(weekOffset + 1)}>›</button>
        </div>
        <div className={ui.days} role="tablist" aria-label="Chọn ngày">
          {week.map((d) => {
            const count = countByDay[d.key] || 0
            return (
              <button key={d.key} type="button" role="tab" aria-selected={d.key === activeKey} className={`${ui.day} ${d.key === activeKey ? ui.on : ''} ${count ? '' : ui.empty}`} onClick={() => setDay(d.key)}>
                <small>{WEEKDAY[d.date.getDay()]}</small>
                <b>{dayMonth(d.date)}</b>
                <em>{count ? `${count} suất` : 'Không có'}</em>
              </button>
            )
          })}
        </div>

        <p className={ui.dayTitle}>{WEEKDAY[activeDate.getDay()]}, {dayMonth(activeDate)} · {shown.length} suất</p>
        {shown.length === 0 ? <p className={ui.empty}>Ngày này chưa có suất 1-1 nào.</p> : (
          <div className={ui.list}>
            {shown.map((s) => (
              <article key={s.id} className={`${ui.row} ${s.status === 'CANCELED' ? ui.dim : ''}`}>
                <span className={ui.time}>{hm(s.startAt)} – {hm(s.endAt)}</span>
                <div className={ui.main}>
                  <p className={ui.name}>{s.coachName}{s.sportName ? ` · ${s.sportName}` : ''}</p>
                  <p className={ui.meta}>{s.roomName ? `${s.roomName}${s.floor ? ` · ${s.floor}` : ''}` : 'Chưa xếp phòng'}{s.price != null ? ` · ${formatVND(s.price)}` : ''}</p>
                </div>
                <div className={ui.side}>
                  <span className={`${ui.badge} ${s.status === 'BOOKED' ? ui.good : s.status === 'CANCELED' ? ui.off : ''}`}>
                    {STATUS[s.status] || s.status}{s.memberName ? ` · ${s.memberName}` : ''}
                  </span>
                  {s.status === 'OPEN' && <button type="button" className={ui.btnOutline} onClick={() => { setTarget(s); setConfirm(true) }}>Xóa suất</button>}
                  {(s.status === 'HELD' || s.status === 'BOOKED') && <button type="button" className={ui.btnDanger} onClick={() => setCancelTarget(s)}>Hủy buổi</button>}
                </div>
              </article>
            ))}
          </div>
        )}

      </div>

      <ReasonDialog
        isOpen={!!cancelTarget}
        title="Hủy buổi 1-1"
        message={cancelTarget ? `Hủy buổi ${when(cancelTarget.startAt)} của ${cancelTarget.coachName}${cancelTarget.memberName ? ` (hội viên ${cancelTarget.memberName})` : ''}? Hội viên được hoàn đủ tiền, nhận voucher đền bù và được báo qua ứng dụng và email.` : ''}
        label="Lý do hủy"
        confirmText="Hủy buổi"
        onConfirm={cancelBooked}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmModal
        isOpen={confirm}
        title="Xóa suất trống"
        message={`Xóa suất ${target ? when(target.startAt) : ''} của ${target?.coachName}?`}
        confirmText="Xác nhận"
        type="danger"
        onConfirm={act}
        onCancel={() => setConfirm(false)}
      />
    </>
  )
}
