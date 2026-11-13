import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import { dayMonth } from '../../utils/labels'
import ReasonDialog from '../common/ReasonDialog'
import { revealById } from '../../utils/reveal'
import SlotRequestsPanel from './SlotRequestsPanel'
import styles from '../../css/manager/ManagerDashboard.module.css'
import ui from '../../css/manager/ManagerUi.module.css'

const WEEKDAY = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7']
const STATUS = { HELD: 'Đang giữ chỗ', BOOKED: 'Đã đặt', CANCELED: 'Đã hủy' }
const DAY_MS = 86400000

const when = (v) => new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const hm = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const dayKey = (v) => new Date(v).toLocaleDateString('sv-SE')
const isFuture = (s) => new Date(s.startAt).getTime() > Date.now()

// Thứ Hai của tuần chứa ngày d (giờ máy)
function mondayOf(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

// Lịch buổi 1-1 do yêu cầu của hội viên tạo ra. Buổi chỉ có khi manager duyệt yêu cầu; phần xử lý sự cố chỉ hiện đúng lúc cần:
// buổi đã đặt thì đổi phòng, đổi coach, hoặc chuyển sang chờ xếp lại; hoàn tiền chỉ hiện khi buổi chờ xếp lại đã quá giờ học
export default function CoachSlotsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [coaches, setCoaches] = useState([])
  const [slots, setSlots] = useState([])
  const [filter, setFilter] = useState({ coachId: '', status: '' })
  const [weekOffset, setWeekOffset] = useState(0)
  const [day, setDay] = useState('')
  const [rooms, setRooms] = useState([])
  const [picker, setPicker] = useState(null)
  const [choice, setChoice] = useState('')
  const [reasonFor, setReasonFor] = useState(null)

  useEffect(() => {
    Promise.all([managerService.getAccounts(token), managerService.getRooms(token)])
      .then(([accounts, r]) => {
        setCoaches(accounts.filter((u) => u.role === 'COACH' && u.active !== false))
        setRooms(r)
      })
      .catch((err) => toast.error(err.message || 'Không thể tải danh sách coach và phòng'))
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

  // Chạy một thao tác xử lý sự cố rồi tải lại; lỗi (vd. không còn phòng trống) hiện nguyên văn để manager chọn cách khác
  const run = async (action, okMsg) => {
    try {
      await action()
      toast.success(okMsg)
      load()
    } catch (err) {
      toast.error(err.message || 'Thao tác thất bại')
    }
  }

  // Hộp chọn phòng hoặc coach cho buổi đang xử lý; để mặc định thì hệ thống tự chọn
  const openPicker = (type, slot) => {
    setPicker({ type, slot })
    setChoice('')
    revealById('slot-picker')
  }
  const sportOf = (item, slot) => (item.sports || []).some((x) => x.id === slot.sportId)
  const pickerOptions = !picker ? [] : picker.type === 'room'
    ? rooms.filter((r) => r.id !== picker.slot.roomId && sportOf(r, picker.slot))
        .map((r) => [r.id, `${r.roomName}${r.floor ? ` · ${r.floor}` : ''}`])
    : coaches.filter((c) => c.id !== picker.slot.coachId && sportOf(c, picker.slot)).map((c) => [c.id, c.fullName])

  const confirmPicker = () => {
    const { type, slot } = picker
    const id = choice ? Number(choice) : null
    setPicker(null)
    if (type === 'room') run(() => managerService.changeCoachSlotRoom(token, slot.id, id), 'Đã đổi phòng, hội viên và coach được báo')
    else run(() => managerService.changeCoachSlotCoach(token, slot.id, id), 'Đã đổi coach, hội viên được báo')
  }

  // Xem theo tuần: dải 7 ngày kèm số buổi, bấm một ngày để xem các buổi của ngày đó
  const thisMonday = mondayOf(new Date())
  const monday = new Date(thisMonday.getTime() + weekOffset * 7 * DAY_MS)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return { date: d, key: d.toLocaleDateString('sv-SE') }
  })
  // Dòng đã hủy chỉ là lịch sử (vd. dòng cũ sau khi đổi phòng, đổi coach hay dời lịch), chỉ hiện khi lọc đúng "Đã hủy"
  const visible = useMemo(() => (filter.status === 'CANCELED' ? slots : slots.filter((s) => s.status !== 'CANCELED')), [slots, filter.status])
  const countByDay = useMemo(() => {
    const map = {}
    visible.forEach((s) => { map[dayKey(s.startAt)] = (map[dayKey(s.startAt)] || 0) + 1 })
    return map
  }, [visible])
  const weekOf = (key) => Math.round((mondayOf(new Date(`${key}T00:00:00`)) - thisMonday) / (7 * DAY_MS))
  const weeks = visible.map((s) => weekOf(dayKey(s.startAt)))
  const lastWeek = weeks.length ? Math.max(0, ...weeks) : 0
  const firstWeek = weeks.length ? Math.min(0, ...weeks) : 0
  const activeKey = week.some((d) => d.key === day) ? day : (week.find((d) => countByDay[d.key]) || week[0]).key
  const activeDate = week.find((d) => d.key === activeKey).date
  const shown = visible.filter((s) => dayKey(s.startAt) === activeKey).sort((a, b) => a.startAt.localeCompare(b.startAt))
  const sunday = week[6].date
  const range = `${dayMonth(monday)} – ${dayMonth(sunday)}/${sunday.getFullYear()}`

  // Hướng xử lý của một buổi, chỉ hiện những gì hợp với tình trạng lúc này
  const actions = (s) => {
    if (s.status !== 'BOOKED') return null
    if (!s.requestId) {
      // Buổi lẻ cũ còn sót lại: giữ cách hủy và hoàn như trước
      return isFuture(s) ? <button type="button" className={ui.btnDanger} onClick={() => setReasonFor(s)}>Hủy và hoàn tiền</button> : null
    }
    if (s.needsReschedule) {
      return isFuture(s)
        ? <span className={ui.meta}>Đang chờ hội viên chọn giờ mới</span>
        : <button type="button" className={ui.btnDanger} onClick={() => setReasonFor(s)}>Hoàn tiền buổi này</button>
    }
    if (!isFuture(s)) return null
    return (
      <details>
        <summary className={ui.btnOutline} style={{ cursor: 'pointer' }}>Xử lý sự cố</summary>
        <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.4rem' }}>
          <button type="button" className={ui.btnOutline} onClick={() => openPicker('room', s)}>Đổi phòng</button>
          <button type="button" className={ui.btnOutline} onClick={() => openPicker('coach', s)}>Đổi coach</button>
          <button type="button" className={ui.btnOutline} onClick={() => setReasonFor({ ...s, wait: true })}>Chờ xếp lại</button>
        </div>
      </details>
    )
  }

  const submitReason = (reason) => {
    const s = reasonFor
    setReasonFor(null)
    if (s.wait) {
      run(() => managerService.markCoachSlotNeedsReschedule(token, s.id, reason), 'Đã chuyển sang chờ xếp lại, hội viên được báo')
    } else {
      run(() => managerService.cancelCoachSlot(token, s.id, reason), 'Đã hủy buổi và hoàn tiền phần của buổi này')
    }
  }

  return (
    <>
      <SlotRequestsPanel onChanged={load} />

      <div className={styles.card}>
        <div className={ui.head}>
          <p className={ui.lead} style={{ margin: 0 }}>Các buổi 1-1 đã tạo từ yêu cầu của hội viên.</p>
        </div>

        {picker && (
          <div id="slot-picker" role="dialog" aria-label={picker.type === 'room' ? 'Đổi phòng' : 'Đổi coach'}
            style={{ display: 'grid', gap: '0.75rem', margin: '0 0 1rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
            <strong>
              {picker.type === 'room' ? 'Đổi phòng' : 'Đổi coach'} cho buổi {when(picker.slot.startAt)} ({picker.slot.coachName}
              {picker.slot.roomName ? `, ${picker.slot.roomName}` : ''})
            </strong>
            <select className={styles.select} aria-label={picker.type === 'room' ? 'Phòng mới' : 'Coach mới'} value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="">{picker.type === 'room' ? 'Tự chọn phòng trống' : 'Tự chọn coach rảnh'}</option>
              {pickerOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <p className="text-hint">
              {picker.type === 'room'
                ? 'Phòng đang bận hoặc không dạy được môn này thì hệ thống báo lỗi để bạn chọn lại.'
                : 'Coach đang bận lúc đó hoặc không dạy môn này thì hệ thống báo lỗi để bạn chọn lại. Giá không đổi.'}
            </p>
            <div>
              <button type="button" className={ui.btn} onClick={confirmPicker}>Xác nhận</button>{' '}
              <button type="button" className={ui.btnOutline} onClick={() => setPicker(null)}>Đóng</button>
            </div>
          </div>
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
                <em>{count ? `${count} buổi` : 'Không có'}</em>
              </button>
            )
          })}
        </div>

        <p className={ui.dayTitle}>{WEEKDAY[activeDate.getDay()]}, {dayMonth(activeDate)} · {shown.length} buổi</p>
        {shown.length === 0 ? <p className={ui.empty}>Ngày này chưa có buổi 1-1 nào.</p> : (
          <div className={ui.list}>
            {shown.map((s) => (
              <article key={s.id} className={`${ui.row} ${s.status === 'CANCELED' ? ui.dim : ''}`}>
                <span className={ui.time}>{hm(s.startAt)} – {hm(s.endAt)}</span>
                <div className={ui.main}>
                  <p className={ui.name}>{s.coachName}{s.sportName ? ` · ${s.sportName}` : ''}</p>
                  <p className={ui.meta}>{s.roomName ? `${s.roomName}${s.floor ? ` · ${s.floor}` : ''}` : 'Chưa xếp phòng'}{s.price != null ? ` · ${formatVND(s.price)}` : ''}{s.seriesNo ? ` · buổi ${s.seriesNo}/${s.seriesTotal}, đã học ${s.seriesDone}/${s.seriesTotal}` : ''}</p>
                </div>
                <div className={ui.side}>
                  <span className={`${ui.badge} ${s.status === 'BOOKED' && !s.needsReschedule ? ui.good : s.status === 'CANCELED' ? ui.off : ''}`}>
                    {s.needsReschedule && s.status === 'BOOKED' ? 'Chờ xếp lại' : (STATUS[s.status] || s.status)}{s.memberName ? ` · ${s.memberName}` : ''}
                  </span>
                  {actions(s)}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ReasonDialog
        isOpen={!!reasonFor}
        title={reasonFor?.wait ? 'Chuyển sang chờ xếp lại' : 'Hủy buổi và hoàn tiền'}
        message={reasonFor
          ? (reasonFor.wait
            ? `Buổi ${when(reasonFor.startAt)} của ${reasonFor.coachName} không thể diễn ra? Hội viên được giữ buổi và chọn giờ mới trước giờ học.`
            : `Hủy buổi ${when(reasonFor.startAt)} của ${reasonFor.coachName}${reasonFor.memberName ? ` (hội viên ${reasonFor.memberName})` : ''}? Hội viên được hoàn phần tiền của buổi này.`)
          : ''}
        label={reasonFor?.wait ? 'Lý do (hội viên sẽ thấy)' : 'Lý do hủy'}
        confirmText={reasonFor?.wait ? 'Chuyển sang chờ xếp lại' : 'Hủy và hoàn tiền'}
        onConfirm={submitReason}
        onCancel={() => setReasonFor(null)}
      />
    </>
  )
}
