import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { apiRequest } from '../../services/apiHelper'
import { formatVND } from '../../utils/format'
import { categoryIcon } from '../../utils/sportIcon'
import { daysText } from '../../utils/sessionDates'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import ConfirmModal from '../common/ConfirmModal'
import PageHead from './PageHead'
import styles from '../../css/member/SlotRequests.module.css'

const STATUS = {
  PENDING: 'Chờ trung tâm duyệt',
  APPROVED: 'Đã duyệt, chờ thanh toán',
  PAID: 'Đã thanh toán',
  REJECTED: 'Chưa được duyệt',
  CANCELED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
}
// Ba bước của một yêu cầu; trạng thái khác (từ chối, hủy, hết hạn) hiện thành nhãn riêng
const STEPS = [['PENDING', 'Chờ duyệt'], ['APPROVED', 'Chờ thanh toán'], ['PAID', 'Đã thanh toán']]
const WEEKDAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
// days: danh sách { weekday, timeSlotId }, chọn 1 hoặc 2 slot mỗi tuần (tự sinh 6 tuần, tối đa 12 buổi)
const EMPTY = { sportId: '', coachId: '', firstDate: '', days: [] }
const REQUEST_WEEKS = 6
const MAX_WEEKLY_SLOTS = 2
const EMPTY_MOVE = { date: '', timeSlotId: '', coachId: '' }

const fmtDate = (d) => `${WEEKDAY[d.getDay()]} ${d.toLocaleDateString('vi-VN')}`
const fmtDateTime = (v) => new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const hm = (t) => String(t).slice(0, 5)
const toDate = (iso) => new Date(`${iso}T00:00:00`)
const toMinutes = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m }
const dayMonth = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

// Hội viên xin nhiều buổi 1-1 với một coach (cùng giờ mỗi tuần). Trung tâm duyệt rồi hội viên trả tiền một lần cho cả chuỗi.
// Buổi đã trả tiền dời được nếu báo trước đủ giờ, hoặc bất cứ lúc nào khi trung tâm không dạy được buổi đó
export default function SlotRequests({ coachSlots, busy, onPay, onCheck, onChanged, oneOnOneDiscountPct = 0 }) {
  const { token } = useAuth()
  const toast = useToast()
  const [guard] = useSingleFlight()
  const [options, setOptions] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [requests, setRequests] = useState(null)
  const [limits, setLimits] = useState({})
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [moving, setMoving] = useState(null)
  const [move, setMove] = useState(EMPTY_MOVE)
  const [confirm, setConfirm] = useState({ isOpen: false })
  const [availState, setAvailState] = useState({ loading: false, slots: [], error: '' })

  const load = useCallback(async () => {
    try {
      setRequests(await bookingService.getMyCoachRequests(token))
    } catch (err) {
      toast.error(err.message || 'Không thể tải yêu cầu 1-1')
    }
  }, [token])

  useEffect(() => {
    bookingService.getCoachOptions(token).then(setOptions).catch(() => {})
    apiRequest('GET', '/api/time-slots').then((t) => setTimeSlots((t || []).filter((x) => x.active !== false))).catch(() => {})
    apiRequest('GET', '/api/public/landing-settings').then(setLimits).catch(() => {})
  }, [token])

  // Tải lại khi bảng buổi 1-1 của trang đổi (sau khi trả tiền hoặc kiểm tra thanh toán)
  useEffect(() => {
    load()
  }, [load, coachSlots])

  const maxSessions = Number(limits['one_on_one.max_sessions_per_request']) || 12
  const leadHours = Number(limits['one_on_one.request_min_lead_hours']) || 48
  const rescheduleHours = Number(limits['one_on_one.reschedule_before_hours']) || 24
  const slotMinutes = Number(limits['one_on_one.slot_minutes']) || 60

  const sports = useMemo(() => [...new Map(options.flatMap((c) => c.sports.map((s) => [s.id, s.name]))).entries()], [options])
  const coaches = options.filter((c) => !form.sportId || c.sports.some((s) => String(s.id) === form.sportId))
  const minDate = new Date(Date.now() + leadHours * 3600000).toLocaleDateString('sv-SE')

  // Lấy các slot mà huấn luyện viên còn rảnh xuyên suốt cả 6 tuần; slot bận được BE lọc bỏ sẵn
  useEffect(() => {
    if (!token || !form.coachId || !form.sportId || !form.firstDate) {
      setAvailState({ loading: false, slots: [], error: '' })
      return
    }
    let active = true
    setAvailState({ loading: true, slots: [], error: '' })
    bookingService
      .getAvailableOneOnOneSlots(token, form.coachId, form.sportId, form.firstDate)
      .then((list) => {
        if (!active) return
        const slots = Array.isArray(list) ? list : []
        setAvailState({ loading: false, slots, error: '' })
        const validSet = new Set(slots.map((s) => `${s.weekday}-${s.timeSlotId}`))
        const validWeekdays = new Set(slots.map((s) => String(s.weekday)))
        const firstWeekday = slots[0] ? String(slots[0].weekday) : ''
        setForm((f) => {
          if (!slots.length) return { ...f, days: [] }
          if (!f.days.length) return { ...f, days: [{ weekday: firstWeekday, timeSlotId: '' }] }
          const nextDays = f.days.slice(0, MAX_WEEKLY_SLOTS).map((d) => {
            const w = validWeekdays.has(String(d.weekday)) ? String(d.weekday) : firstWeekday
            const tid = validSet.has(`${w}-${d.timeSlotId}`) ? String(d.timeSlotId) : ''
            return { weekday: w, timeSlotId: tid }
          })
          return { ...f, days: nextDays }
        })
      })
      .catch((err) => {
        if (active) setAvailState({ loading: false, slots: [], error: err.message || 'Không thể tải khung giờ trống' })
      })
    return () => {
      active = false
    }
  }, [token, form.coachId, form.sportId, form.firstDate])

  const availableSlots = availState.slots
  const availableWeekdays = useMemo(
    () => [...new Map(availableSlots.map((s) => [String(s.weekday), s.weekdayName])).entries()],
    [availableSlots],
  )
  const slotsForWeekday = (weekday) => availableSlots.filter((s) => String(s.weekday) === String(weekday))

  // Member chọn 1 hoặc 2 slot lặp hằng tuần, hệ thống tự sinh đủ 6 tuần (6 hoặc 12 buổi)
  const picks = form.days
  const generatedSessions = picks.length * REQUEST_WEEKS
  const pairKeys = picks.map((d) => `${d.weekday}-${d.timeSlotId}`)
  const complete = picks.length >= 1 && picks.length <= MAX_WEEKLY_SLOTS && picks.every((d) => d.weekday && d.timeSlotId)
  const duplicate = complete && new Set(pairKeys).size !== pairKeys.length
  const slotOf = (id) => timeSlots.find((x) => String(x.id) === String(id)) || availableSlots.find((x) => String(x.timeSlotId) === String(id))
  // Giá 1 buổi = giá 1 giờ * min(one_on_one.slot_minutes, độ dài khung giờ) / 60; cả chuỗi = 6 tuần
  const hourly = Number(limits['one_on_one.hourly_price']) || 0
  const weeklyTotal = picks.reduce((sum, p) => {
    const t = slotOf(p.timeSlotId)
    if (!t || !hourly) return sum
    const mins = Math.min(slotMinutes, toMinutes(t.endTime) - toMinutes(t.startTime))
    return sum + Math.round((hourly * mins) / 60)
  }, 0)
  const listTotal = weeklyTotal * REQUEST_WEEKS
  const discount = Math.round((listTotal * oneOnOneDiscountPct) / 100)
  const canSubmit = !availState.loading && availableSlots.length > 0 && complete && !duplicate && generatedSessions <= maxSessions

  const submit = (e) => {
    e.preventDefault()
    guard(async () => {
      try {
        await bookingService.submitCoachRequest(token, {
          coachId: Number(form.coachId),
          sportCategoryId: Number(form.sportId),
          firstDate: form.firstDate,
          days: picks.map((d) => ({ weekday: Number(d.weekday), timeSlotId: Number(d.timeSlotId) })),
          sessions: generatedSessions,
        })
        toast.success('Đã gửi yêu cầu 6 tuần, trung tâm sẽ duyệt trong thời gian sớm nhất')
        setForm(EMPTY)
        setShowForm(false)
        load()
      } catch (err) {
        toast.error(err.message || 'Gửi yêu cầu thất bại')
      }
    })
  }

  // Xin lại một yêu cầu bị từ chối: mở biểu mẫu với môn, huấn luyện viên và tối đa 2 slot tuần cũ
  const askAgain = (r) => {
    setForm({
      sportId: String(r.sportId),
      coachId: String(r.coachId),
      firstDate: '',
      days: (r.days || []).filter((d) => d.weekday <= 6).slice(0, MAX_WEEKLY_SLOTS).map((d) => ({ weekday: String(d.weekday), timeSlotId: String(d.timeSlotId) })),
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const askCancel = (req) => {
    setConfirm({
      isOpen: true,
      title: 'Hủy yêu cầu',
      message: req.status === 'APPROVED'
        ? 'Hủy yêu cầu này? Các buổi đang giữ chỗ sẽ được nhả, bạn chưa mất khoản nào.'
        : 'Hủy yêu cầu này?',
      confirmText: 'Hủy yêu cầu',
      type: 'danger',
      action: async () => {
        try {
          await bookingService.cancelCoachRequest(token, req.id)
          toast.success('Đã hủy yêu cầu')
          load()
          onChanged()
        } catch (err) {
          toast.error(err.message || 'Hủy yêu cầu thất bại')
        }
      },
    })
  }

  const submitMove = (e) => {
    e.preventDefault()
    guard(async () => {
      try {
        await bookingService.rescheduleCoachSlot(token, moving.slot.id, {
          date: move.date,
          timeSlotId: Number(move.timeSlotId),
          coachId: move.coachId ? Number(move.coachId) : null,
        })
        toast.success('Đã dời buổi sang giờ mới')
        setMoving(null)
        setMove(EMPTY_MOVE)
        load()
        onChanged()
      } catch (err) {
        toast.error(err.message || 'Dời lịch thất bại')
      }
    })
  }

  // Còn đủ giờ báo trước để dời, hoặc trung tâm đã nhờ dời buổi này
  const canMove = (s) => s.status === 'BOOKED'
    && (s.needsReschedule || new Date(s.startAt).getTime() - Date.now() >= rescheduleHours * 3600000)
  const isFuture = (s) => new Date(s.startAt).getTime() > Date.now()

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <PageHead title="Buổi 1-1" lead="Xin nhiều buổi với một huấn luyện viên, trung tâm duyệt rồi bạn trả tiền một lần cho cả chuỗi." />
        {!showForm ? <button type="button" className={styles.primary} onClick={() => setShowForm(true)}><Plus size={16} aria-hidden="true" />Xin buổi mới</button> : null}
      </div>

      {showForm ? (
        <section aria-labelledby="req-title" className={styles.form}>
          <h2 id="req-title" className={styles.formTitle}>Xin lịch học 1-1 (6 tuần)</h2>
          <p className={styles.hint}>
            Chọn môn, huấn luyện viên và ngày bắt đầu, rồi chọn 1 hoặc 2 slot cố định mỗi tuần (hệ thống tự sinh đủ {REQUEST_WEEKS} tuần, tương ứng {REQUEST_WEEKS} hoặc {REQUEST_WEEKS * MAX_WEEKLY_SLOTS} buổi). Các khung giờ HLV bận trong bất kỳ tuần nào sẽ được ẩn. Buổi đầu phải cách hiện tại ít nhất {leadHours} giờ; báo dời trước giờ học {rescheduleHours} giờ.
          </p>
          <form onSubmit={submit}>
            <div className={styles.fields}>
              <label>Môn
                <select required value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value, coachId: '', days: [] })}>
                  <option value="">Chọn môn</option>
                  {sports.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label>Huấn luyện viên
                <select required value={form.coachId} disabled={!form.sportId} onChange={(e) => setForm({ ...form, coachId: e.target.value, days: [] })}>
                  <option value="">Chọn huấn luyện viên</option>
                  {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </label>
              <label>Bắt đầu từ ngày
                <input required type="date" min={minDate} value={form.firstDate} onChange={(e) => setForm({ ...form, firstDate: e.target.value })} />
              </label>
            </div>

            {form.sportId && form.coachId && form.firstDate ? (
              <div className={styles.dayTimes}>
                {availState.loading ? <p className={styles.hint}>Đang tải các khung giờ trống của huấn luyện viên trong {REQUEST_WEEKS} tuần...</p> : null}
                {availState.error ? <p className={styles.need} role="alert">{availState.error}</p> : null}
                {!availState.loading && !availState.error && availableSlots.length === 0 ? (
                  <p className={styles.need} role="alert">Huấn luyện viên không còn khung giờ nào trống đủ {REQUEST_WEEKS} tuần liên tiếp từ ngày này. Vui lòng chọn ngày hoặc huấn luyện viên khác.</p>
                ) : null}

                {!availState.loading && availableSlots.length > 0 ? (
                  <>
                    <p className={styles.hint} role="status">
                      <strong>Đã chọn {picks.length}/{MAX_WEEKLY_SLOTS} slot mỗi tuần</strong> · Tự sinh <strong>{generatedSessions} buổi</strong> trong {REQUEST_WEEKS} tuần (Thứ 2 đến Thứ 7, đã ẩn các giờ HLV bận).
                    </p>
                    {picks.map((d, i) => {
                      const daySlots = slotsForWeekday(d.weekday)
                      return (
                        <div key={i} className={styles.fields}>
                          <label>Slot {i + 1}: thứ
                            <select required value={d.weekday} onChange={(e) => {
                              const nextWeekday = e.target.value
                              const validNext = slotsForWeekday(nextWeekday).some((s) => String(s.timeSlotId) === String(d.timeSlotId))
                              setForm((f) => ({
                                ...f,
                                days: f.days.map((x, j) => (j === i ? { weekday: nextWeekday, timeSlotId: validNext ? x.timeSlotId : '' } : x)),
                              }))
                            }}>
                              {availableWeekdays.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                            </select>
                          </label>
                          <label>Giờ trống
                            <select required value={d.timeSlotId} onChange={(e) => setForm((f) => ({ ...f, days: f.days.map((x, j) => (j === i ? { ...x, timeSlotId: e.target.value } : x)) }))}>
                              <option value="">Chọn giờ</option>
                              {daySlots.map((t) => <option key={t.timeSlotId} value={t.timeSlotId}>{hm(t.startTime)} – {hm(t.endTime)}</option>)}
                            </select>
                          </label>
                          {picks.length > 1 ? (
                            <button type="button" className={styles.link} onClick={() => setForm((f) => ({ ...f, days: f.days.filter((_, j) => j !== i) }))}>Bỏ slot</button>
                          ) : null}
                        </div>
                      )
                    })}
                    {picks.length < MAX_WEEKLY_SLOTS ? (
                      <button type="button" className={styles.secondary}
                        onClick={() => {
                          const fallbackDay = picks.at(-1)?.weekday || availableWeekdays[0]?.[0] || '1'
                          setForm((f) => ({ ...f, days: [...f.days, { weekday: fallbackDay, timeSlotId: '' }] }))
                        }}>
                        <Plus size={16} aria-hidden="true" />Thêm slot (tối đa {MAX_WEEKLY_SLOTS})
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : (
              <p className={styles.hint}>Chọn đủ Môn, Huấn luyện viên và Ngày bắt đầu để xem các khung giờ trống trong 6 tuần.</p>
            )}

            {duplicate ? <p className={styles.need} role="alert">Hai slot đang trùng thứ và giờ, hãy đổi giờ khác hoặc bỏ bớt.</p> : null}
            {complete && !duplicate && generatedSessions > maxSessions ? (
              <p className={styles.need} role="alert">Tổng số buổi sinh ra ({generatedSessions}) vượt quá giới hạn tối đa {maxSessions} buổi mỗi yêu cầu.</p>
            ) : null}

            {complete && picks.length > 0 ? (
              <div className={styles.plan}>
                <div className={styles.planHead}>
                  <strong>Tổng {picks.length}/{MAX_WEEKLY_SLOTS} slot tuần · {generatedSessions} buổi ({REQUEST_WEEKS} tuần)</strong>
                  {hourly ? (
                    <span>
                      Ước tính <b>{formatVND(listTotal - discount)}</b>
                      {discount > 0 ? <small> đã giảm {oneOnOneDiscountPct}% theo hạng, giá gốc {formatVND(listTotal)}</small> : null}
                    </span>
                  ) : null}
                </div>
                <p className={styles.planNote}>Mỗi buổi 1-1 kéo dài {slotMinutes} phút (đơn giá {formatVND(hourly)}/giờ). Giá chính thức và ngày học cụ thể hiển thị ngay sau khi gửi.</p>
              </div>
            ) : null}
            <div className={styles.formActions}>
              <button type="submit" className={styles.primary} disabled={busy || !canSubmit}>Gửi yêu cầu</button>
              <button type="button" className={styles.link} onClick={() => { setShowForm(false); setForm(EMPTY) }}>Đóng</button>
            </div>
          </form>
        </section>
      ) : null}

      <section aria-labelledby="req-list-title" id="my-slots" style={{ scrollMarginTop: '5rem' }}>
        <h2 id="req-list-title" className={styles.sectionTitle}>Yêu cầu của tôi</h2>
        {requests === null ? <p className={styles.empty}>Đang tải yêu cầu...</p> : requests.length === 0 ? <p className={styles.empty}>Bạn chưa gửi yêu cầu nào. Bấm "Xin buổi mới" để bắt đầu.</p> : (
          <div className={styles.list}>
            {requests.map((r) => {
              const sessions = r.slots.filter((s) => s.status !== 'CANCELED')
              const Icon = categoryIcon(r.sportName)
              const step = STEPS.findIndex(([code]) => code === r.status)
              return (
                <article key={r.id} className={styles.req}>
                  <div className={styles.head}>
                    <span className={styles.icon} aria-hidden="true"><Icon size={22} /></span>
                    <div className={styles.title}>
                      <strong>{r.sportName} với {r.coachName} · {r.sessions} buổi</strong>
                      <small>{daysText(r.days)}, từ {toDate(r.firstDate).toLocaleDateString('vi-VN')}</small>
                    </div>
                    {step >= 0 ? (
                      <div className={styles.price}>{formatVND(r.payableTotal)}{r.discountAmount > 0 ? <small>đã giảm {formatVND(r.discountAmount)} theo hạng</small> : null}</div>
                    ) : <span className={`${styles.chip} ${r.status === 'REJECTED' ? styles.chipBad : styles.chipOff}`}>{STATUS[r.status] || r.status}</span>}
                  </div>

                  {step >= 0 ? (
                    <ol className={styles.steps} aria-label="Tiến trình yêu cầu">
                      {STEPS.map(([code, label], i) => (
                        <li key={code} className={`${i <= step ? styles.stepOn : ''} ${i === step ? styles.stepNow : ''}`} aria-current={i === step ? 'step' : undefined}>{i + 1}. {label}</li>
                      ))}
                    </ol>
                  ) : null}

                  {r.plannedSessions?.length > 0 && !((r.status === 'APPROVED' || r.status === 'PAID') && sessions.length > 0) ? (
                    <ul className={styles.sessions} aria-label="Các buổi dự kiến">
                      {r.plannedSessions.map((p) => (
                        <li key={p.sessionNo}>
                          <div className={styles.day}>{dayMonth(toDate(p.sessionDate))}<small>{WEEKDAY[toDate(p.sessionDate).getDay()]}</small></div>
                          <div className={styles.what}>{hm(p.startTime)} – {hm(p.endTime)}<small>Buổi {p.sessionNo}/{r.plannedSessions.length}</small></div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {(r.status === 'APPROVED' || r.status === 'PAID') && sessions.length > 0 ? (
                    <ul className={styles.sessions}>
                      {sessions.map((s, i) => {
                        const start = new Date(s.startAt)
                        const done = !isFuture(s) && s.status === 'BOOKED'
                        return (
                          <li key={s.id}>
                            <div className={styles.day}>{dayMonth(start)}<small>{WEEKDAY[start.getDay()]}</small></div>
                            <div className={styles.what}>
                              {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{s.roomName ? ` · ${s.roomName}` : ''}
                              <small>Buổi {i + 1}/{sessions.length}</small>
                              {s.needsReschedule && isFuture(s) ? <span className={styles.need}>Trung tâm cần dời buổi này, hãy chọn giờ mới</span> : null}
                              {r.status === 'PAID' && isFuture(s) && s.status === 'BOOKED' && !canMove(s) ? <small>Không dời được (còn dưới {rescheduleHours} giờ)</small> : null}
                            </div>
                            {done ? <span className={`${styles.chip} ${styles.chipOk}`}>Đã học</span> : null}
                            {r.status === 'PAID' && isFuture(s) && canMove(s) ? (
                              <button type="button" className={styles.secondary} onClick={() => { setMoving({ slot: s, request: r }); setMove(EMPTY_MOVE) }}>
                                {s.needsReschedule ? 'Chọn giờ mới' : 'Dời lịch'}
                              </button>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}

                  {moving && moving.request.id === r.id ? (
                    <form onSubmit={submitMove} className={styles.move}>
                      <strong>Dời buổi {fmtDate(new Date(moving.slot.startAt))} sang:</strong>
                      <div className={styles.fields}>
                        <label>Ngày mới
                          <input required type="date" min={new Date().toLocaleDateString('sv-SE')} value={move.date} onChange={(e) => setMove({ ...move, date: e.target.value })} />
                        </label>
                        <label>Giờ mới
                          <select required value={move.timeSlotId} onChange={(e) => setMove({ ...move, timeSlotId: e.target.value })}>
                            <option value="">Chọn giờ</option>
                            {timeSlots.map((t) => <option key={t.id} value={t.id}>{hm(t.startTime)} – {hm(t.endTime)}</option>)}
                          </select>
                        </label>
                        {moving.slot.needsReschedule ? (
                          <label>Huấn luyện viên
                            <select value={move.coachId} onChange={(e) => setMove({ ...move, coachId: e.target.value })}>
                              <option value="">Giữ {moving.slot.coachName}</option>
                              {options
                                .filter((c) => c.id !== moving.slot.coachId && c.sports.some((s) => s.id === r.sportId))
                                .map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                            </select>
                          </label>
                        ) : null}
                      </div>
                      <div className={styles.formActions}>
                        <button type="submit" className={styles.primary} disabled={busy}>Dời sang giờ này</button>
                        <button type="button" className={styles.link} onClick={() => setMoving(null)}>Đóng</button>
                      </div>
                    </form>
                  ) : null}

                  {r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED' ? (
                    <div className={styles.foot}>
                      <span className={r.status === 'APPROVED' ? styles.due : styles.dim}>
                        {r.status === 'PENDING' ? `Chờ duyệt trước ${fmtDateTime(r.expiresAt)}` : null}
                        {r.status === 'APPROVED' ? `Thanh toán tiền mặt hoặc online trước ${fmtDateTime(r.paymentExpiresAt || r.cashPaymentDeadline || r.expiresAt)}, quá hạn các buổi sẽ được nhả` : null}
                        {r.status === 'REJECTED' ? (r.rejectReason ? `Lý do: ${r.rejectReason}` : 'Trung tâm chưa duyệt yêu cầu này.') : null}
                      </span>
                      <span className={styles.footActions}>
                        {r.status === 'APPROVED' ? (
                          <>
                            <button type="button" className={styles.link} onClick={() => askCancel(r)}>Hủy yêu cầu</button>
                            <button type="button" className={styles.secondary} disabled={busy} onClick={() => onCheck(r)}>Tôi đã thanh toán</button>
                            <button type="button" className={styles.primary} disabled={busy} onClick={() => onPay(r)}>Thanh toán online</button>
                          </>
                        ) : null}
                        {r.status === 'PENDING' ? <button type="button" className={styles.link} onClick={() => askCancel(r)}>Hủy yêu cầu</button> : null}
                        {r.status === 'REJECTED' ? <button type="button" className={styles.secondary} onClick={() => askAgain(r)}>Xin lại</button> : null}
                      </span>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

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
    </div>
  )
}
