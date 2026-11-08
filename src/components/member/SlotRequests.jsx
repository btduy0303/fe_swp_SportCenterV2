import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { apiRequest } from '../../services/apiHelper'
import { formatVND } from '../../utils/format'
import { categoryIcon } from '../../utils/sportIcon'
import { daysText, sessionPlan, weekdayLabel } from '../../utils/sessionDates'
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
// days: { thứ: timeSlotId }, mỗi ngày học một khung giờ riêng
const EMPTY = { sportId: '', coachId: '', firstDate: '', days: {}, sessions: '', touched: false }
const DAY_BUTTONS = [[1, 'T2'], [2, 'T3'], [3, 'T4'], [4, 'T5'], [5, 'T6'], [6, 'T7'], [7, 'CN']]
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
  const [freeInfo, setFreeInfo] = useState({ key: '', ids: [] })
  const [confirm, setConfirm] = useState({ isOpen: false })

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
  const payHours = Number(limits['one_on_one.request_pay_hours']) || 3
  const rescheduleHours = Number(limits['one_on_one.reschedule_before_hours']) || 24

  const sports = useMemo(() => [...new Map(options.flatMap((c) => c.sports.map((s) => [s.id, s.name]))).entries()], [options])
  const coaches = options.filter((c) => !form.sportId || c.sports.some((s) => String(s.id) === form.sportId))
  const minDate = new Date(Date.now() + leadHours * 3600000).toLocaleDateString('sv-SE')
  const chosen = Object.keys(form.days).map(Number).sort()
  const complete = chosen.length > 0 && chosen.every((d) => form.days[d])
  // Số buổi do hội viên nhập; chưa nhập thì gợi ý bằng số ngày đã chọn (một tuần đầu)
  const sessions = form.touched ? Number(form.sessions) || 0 : Math.max(1, chosen.length)
  const plan = complete ? sessionPlan(form.firstDate, form.days, sessions) : []
  // Giờ coach còn rảnh trong ngày đã chọn; chưa biết (chưa chọn ngày, hoặc tải lỗi) thì cho chọn mọi khung giờ và để BE kiểm tra
  const freeKey = moving && move.date ? `${move.coachId || moving.slot.coachId}|${moving.request.sportId}|${move.date}` : ''
  useEffect(() => {
    if (!freeKey) return undefined
    const [coachId, sportId, date] = freeKey.split('|')
    let alive = true
    bookingService.getCoachFreeTimes(token, coachId, sportId, date)
      .then((rows) => { if (alive) setFreeInfo({ key: freeKey, ids: rows.map((x) => String(x.timeSlotId)) }) })
      .catch(() => {})
    return () => { alive = false }
  }, [token, freeKey])
  const freeIds = freeKey && freeInfo.key === freeKey ? freeInfo.ids : null
  const moveChoices = freeIds ? timeSlots.filter((t) => freeIds.includes(String(t.id))) : timeSlots

  const slotOf = (id) => timeSlots.find((x) => String(x.id) === String(id))
  const slotRange = (id) => { const t = slotOf(id); return t ? `${hm(t.startTime)} – ${hm(t.endTime)}` : '' }
  // Giá ước tính: giá một giờ chung nhân số phút của từng buổi, rồi trừ ưu đãi theo hạng; giá chính thức chốt khi trung tâm duyệt
  const hourly = Number(limits['one_on_one.hourly_price']) || 0
  const listTotal = plan.reduce((sum, p) => { const t = slotOf(p.timeSlotId); return sum + (t && hourly ? Math.round((hourly * (toMinutes(t.endTime) - toMinutes(t.startTime))) / 60) : 0) }, 0)
  const discount = Math.round((listTotal * oneOnOneDiscountPct) / 100)
  const sessionsOk = sessions >= 1 && sessions <= maxSessions

  const submit = (e) => {
    e.preventDefault()
    guard(async () => {
      try {
        await bookingService.submitCoachRequest(token, {
          coachId: Number(form.coachId),
          sportCategoryId: Number(form.sportId),
          firstDate: form.firstDate,
          days: chosen.map((weekday) => ({ weekday, timeSlotId: Number(form.days[weekday]) })),
          sessions,
        })
        toast.success('Đã gửi yêu cầu, trung tâm sẽ duyệt trong thời gian sớm nhất')
        setForm(EMPTY)
        setShowForm(false)
        load()
      } catch (err) {
        toast.error(err.message || 'Gửi yêu cầu thất bại')
      }
    })
  }

  // Xin lại một yêu cầu bị từ chối: mở biểu mẫu với môn, huấn luyện viên, giờ và số buổi cũ, hội viên chọn ngày mới
  const askAgain = (r) => {
    setForm({ sportId: String(r.sportId), coachId: String(r.coachId), firstDate: '', days: Object.fromEntries((r.days || []).map((d) => [d.weekday, String(d.timeSlotId)])), sessions: String(r.sessions), touched: true })
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
          <h2 id="req-title" className={styles.formTitle}>Xin nhiều buổi 1-1</h2>
          <p className={styles.hint}>
            Chọn huấn luyện viên, các ngày học trong tuần và giờ của từng ngày. Buổi đầu phải cách hiện tại ít nhất {leadHours} giờ. Sau khi được duyệt, bạn có {payHours} giờ để thanh toán một lần.
            Cần đổi giờ, báo dời trước giờ học {rescheduleHours} giờ thì buổi vẫn được giữ.
          </p>
          <form onSubmit={submit}>
            <div className={styles.fields}>
              <label>Môn
                <select required value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value, coachId: '' })}>
                  <option value="">Chọn môn</option>
                  {sports.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label>Huấn luyện viên
                <select required value={form.coachId} disabled={!form.sportId} onChange={(e) => setForm({ ...form, coachId: e.target.value })}>
                  <option value="">Chọn huấn luyện viên</option>
                  {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </label>
              <label>Bắt đầu từ ngày
                <input required type="date" min={minDate} value={form.firstDate} onChange={(e) => setForm({ ...form, firstDate: e.target.value })} />
              </label>
              <label>Số buổi (tối đa {maxSessions})
                <input required type="number" min="1" max={maxSessions} value={form.touched ? form.sessions : String(sessions)} onChange={(e) => setForm({ ...form, sessions: e.target.value, touched: true })} />
              </label>
            </div>
            <div className={styles.days} role="group" aria-label="Các ngày học trong tuần">
              <span>Học vào các ngày</span>
              {DAY_BUTTONS.map(([value, text]) => {
                const on = value in form.days
                return (
                  <button key={value} type="button" aria-pressed={on} className={on ? styles.dayOn : ''}
                    onClick={() => setForm((f) => {
                      const days = { ...f.days }
                      if (value in days) delete days[value]
                      else days[value] = Object.values(days).at(-1) || ''
                      return { ...f, days }
                    })}>
                    {text}
                  </button>
                )
              })}
            </div>
            {chosen.length === 0 ? <p className={styles.hint}>Chọn ít nhất một ngày trong tuần.</p> : (
              <div className={styles.dayTimes}>
                {chosen.map((d) => (
                  <label key={d}>{weekdayLabel(d)}
                    <select required value={form.days[d]} onChange={(e) => setForm((f) => ({ ...f, days: { ...f.days, [d]: e.target.value } }))}>
                      <option value="">Chọn giờ</option>
                      {timeSlots.map((t) => <option key={t.id} value={t.id}>{hm(t.startTime)} – {hm(t.endTime)}</option>)}
                    </select>
                  </label>
                ))}
                {chosen.length > 1 && form.days[chosen[0]] ? (
                  <button type="button" className={styles.link} onClick={() => setForm((f) => ({ ...f, days: Object.fromEntries(chosen.map((d) => [d, f.days[chosen[0]]])) }))}>
                    Dùng giờ của {weekdayLabel(chosen[0])} cho tất cả
                  </button>
                ) : null}
              </div>
            )}
            {plan.length > 0 ? (
              <div className={styles.plan}>
                <div className={styles.planHead}>
                  <strong>Tổng {plan.length} buổi</strong>
                  {hourly ? (
                    <span>Ước tính <b>{formatVND(listTotal - discount)}</b>{discount > 0 ? <small> đã giảm {oneOnOneDiscountPct}% theo hạng, giá gốc {formatVND(listTotal)}</small> : null}</span>
                  ) : null}
                </div>
                <ol className={styles.planGrid}>
                  {plan.map((p) => (
                    <li key={p.date.getTime()}><b>{weekdayLabel(p.weekday)} · {dayMonth(p.date)}</b><span>{slotRange(p.timeSlotId)}</span></li>
                  ))}
                </ol>
                <p className={styles.planNote}>Giá chính thức được chốt khi trung tâm duyệt yêu cầu.</p>
              </div>
            ) : null}
            <div className={styles.formActions}>
              <button type="submit" className={styles.primary} disabled={busy || !complete || !sessionsOk}>Gửi yêu cầu</button>
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
                          <input required type="date" min={new Date().toLocaleDateString('sv-SE')} value={move.date} onChange={(e) => setMove({ ...move, date: e.target.value, timeSlotId: '' })} />
                        </label>
                        <label>Giờ mới
                          <select required value={move.timeSlotId} onChange={(e) => setMove({ ...move, timeSlotId: e.target.value })}>
                            <option value="">{freeIds && !freeIds.length ? 'Hôm đó không còn giờ trống' : 'Chọn giờ'}</option>
                            {moveChoices.map((t) => <option key={t.id} value={t.id}>{hm(t.startTime)} – {hm(t.endTime)}</option>)}
                          </select>
                        </label>
                        {moving.slot.needsReschedule ? (
                          <label>Huấn luyện viên
                            <select value={move.coachId} onChange={(e) => setMove({ ...move, coachId: e.target.value, timeSlotId: '' })}>
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
                        {r.status === 'APPROVED' ? `Thanh toán trước ${fmtDateTime(r.expiresAt)}, quá hạn các buổi sẽ được nhả` : null}
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
