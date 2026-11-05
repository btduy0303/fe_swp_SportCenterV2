import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { apiRequest } from '../../services/apiHelper'
import { formatVND } from '../../utils/format'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import ConfirmModal from '../common/ConfirmModal'
import styles from '../../css/member/MyBookings.module.css'

const STATUS = {
  PENDING: 'Chờ trung tâm duyệt',
  APPROVED: 'Đã duyệt, chờ thanh toán',
  PAID: 'Đã thanh toán',
  REJECTED: 'Chưa được duyệt',
  CANCELED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
}
const WEEKDAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const EMPTY = { sportId: '', coachId: '', firstDate: '', timeSlotId: '', sessions: 1 }
const EMPTY_MOVE = { date: '', timeSlotId: '', coachId: '' }

const labelStyle = { display: 'grid', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }
const fmtDate = (d) => `${WEEKDAY[d.getDay()]} ${d.toLocaleDateString('vi-VN')}`
const fmtDateTime = (v) => new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const hm = (t) => String(t).slice(0, 5)
const toDate = (iso) => new Date(`${iso}T00:00:00`)

// Ngày của từng buổi: buổi đầu rồi cách nhau đúng một tuần
function sessionDates(firstDate, sessions) {
  if (!firstDate) return []
  const first = toDate(firstDate)
  return Array.from({ length: Number(sessions) || 0 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i * 7))
}

// Hội viên xin nhiều buổi 1-1 với một coach (cùng giờ mỗi tuần). Trung tâm duyệt rồi hội viên trả tiền một lần cho cả chuỗi.
// Buổi đã trả tiền dời được nếu báo trước đủ giờ, hoặc bất cứ lúc nào khi trung tâm không dạy được buổi đó
export default function SlotRequests({ coachSlots, busy, onPay, onCheck, onChanged }) {
  const { token } = useAuth()
  const toast = useToast()
  const [guard] = useSingleFlight()
  const [options, setOptions] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [requests, setRequests] = useState([])
  const [limits, setLimits] = useState({})
  const [form, setForm] = useState(EMPTY)
  const [moving, setMoving] = useState(null)
  const [move, setMove] = useState(EMPTY_MOVE)
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
  const dates = sessionDates(form.firstDate, form.sessions)
  const slot = timeSlots.find((t) => String(t.id) === form.timeSlotId)

  const submit = (e) => {
    e.preventDefault()
    guard(async () => {
      try {
        await bookingService.submitCoachRequest(token, {
          coachId: Number(form.coachId),
          sportCategoryId: Number(form.sportId),
          timeSlotId: Number(form.timeSlotId),
          firstDate: form.firstDate,
          sessions: Number(form.sessions),
        })
        toast.success('Đã gửi yêu cầu, trung tâm sẽ duyệt trong thời gian sớm nhất')
        setForm(EMPTY)
        load()
      } catch (err) {
        toast.error(err.message || 'Gửi yêu cầu thất bại')
      }
    })
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
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section aria-labelledby="req-title" style={{ padding: '1rem', border: '1px solid var(--border-color)' }}>
        <h2 id="req-title" style={{ marginTop: 0 }}>Xin nhiều buổi 1-1</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Chọn huấn luyện viên và giờ học cố định mỗi tuần. Trung tâm duyệt cả chuỗi, sau đó bạn có {payHours} giờ để thanh toán một lần.
          Buổi đầu phải cách hiện tại ít nhất {leadHours} giờ. Cần đổi giờ, báo dời trước giờ học {rescheduleHours} giờ thì buổi vẫn được giữ.
        </p>
        <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
          <div className="row-wrap-end">
            <label style={labelStyle}>Môn
              <select required value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value, coachId: '' })}>
                <option value="">Chọn môn</option>
                {sports.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Huấn luyện viên
              <select required value={form.coachId} disabled={!form.sportId} onChange={(e) => setForm({ ...form, coachId: e.target.value })}>
                <option value="">Chọn huấn luyện viên</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Ngày của buổi đầu
              <input required type="date" min={minDate} value={form.firstDate} onChange={(e) => setForm({ ...form, firstDate: e.target.value })} />
            </label>
            <label style={labelStyle}>Giờ học
              <select required value={form.timeSlotId} onChange={(e) => setForm({ ...form, timeSlotId: e.target.value })}>
                <option value="">Chọn giờ</option>
                {timeSlots.map((t) => <option key={t.id} value={t.id}>{hm(t.startTime)} – {hm(t.endTime)}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Số buổi (tối đa {maxSessions})
              <input required type="number" min="1" max={maxSessions} value={form.sessions} onChange={(e) => setForm({ ...form, sessions: e.target.value })} />
            </label>
          </div>
          {dates.length > 0 && slot && (
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Các buổi ({hm(slot.startTime)}): {dates.map(fmtDate).join(', ')}
            </p>
          )}
          <div><button type="submit" className={styles.primary} disabled={busy}>Gửi yêu cầu</button></div>
        </form>
      </section>

      <section aria-labelledby="req-list-title" id="my-slots" style={{ scrollMarginTop: '5rem' }}>
        <h2 id="req-list-title">Yêu cầu của tôi</h2>
        {requests.length === 0 ? <p className={styles.empty}>Bạn chưa gửi yêu cầu nào.</p> : (
          <div className={styles.list}>
            {requests.map((r) => {
              const sessions = r.slots.filter((s) => s.status !== 'CANCELED')
              return (
                <article key={r.id} className={`${styles.row} ${r.status === 'PAID' ? styles.booked : ''}`}>
                  <div className={styles.main}>
                    <h3 className={styles.name}>{r.sportName} với {r.coachName} · {r.sessions} buổi</h3>
                    <p className={styles.meta}>
                      {WEEKDAY[toDate(r.firstDate).getDay()]} {hm(r.startTime)} – {hm(r.endTime)}, từ {toDate(r.firstDate).toLocaleDateString('vi-VN')}
                    </p>
                    <p className={styles.meta}>
                      {formatVND(r.payableTotal)}
                      {r.discountAmount > 0 ? ` (đã giảm ${formatVND(r.discountAmount)} theo hạng thành viên)` : ''}
                    </p>
                    {r.status === 'PENDING' && <p className={styles.meta}>Chờ duyệt trước {fmtDateTime(r.expiresAt)}</p>}
                    {r.status === 'APPROVED' && <p className={styles.meta}>Thanh toán trước {fmtDateTime(r.expiresAt)}, quá hạn các buổi sẽ được nhả</p>}
                    {r.status === 'REJECTED' && r.rejectReason && <p className={styles.meta}>Lý do: {r.rejectReason}</p>}

                    {(r.status === 'APPROVED' || r.status === 'PAID') && sessions.length > 0 && (
                      <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', display: 'grid', gap: '0.35rem' }}>
                        {sessions.map((s) => (
                          <li key={s.id} className={styles.meta}>
                            {fmtDate(new Date(s.startAt))} · {new Date(s.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {s.roomName ? ` · ${s.roomName}` : ''}
                            {s.needsReschedule && isFuture(s) && (
                              <strong> · Trung tâm cần dời buổi này, hãy chọn giờ mới</strong>
                            )}
                            {r.status === 'PAID' && isFuture(s) && canMove(s) && (
                              <>
                                {' '}
                                <button type="button" className={styles.secondary}
                                  onClick={() => { setMoving({ slot: s, request: r }); setMove(EMPTY_MOVE) }}>
                                  {s.needsReschedule ? 'Chọn giờ mới' : 'Dời lịch'}
                                </button>
                              </>
                            )}
                            {r.status === 'PAID' && isFuture(s) && s.status === 'BOOKED' && !canMove(s) && (
                              <span> · không dời được (còn dưới {rescheduleHours} giờ)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {moving && moving.request.id === r.id && (
                      <form onSubmit={submitMove} style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <strong>Dời buổi {fmtDate(new Date(moving.slot.startAt))} sang:</strong>
                        <div className="row-wrap-end">
                          <label style={labelStyle}>Ngày mới
                            <input required type="date" min={new Date().toLocaleDateString('sv-SE')} value={move.date} onChange={(e) => setMove({ ...move, date: e.target.value })} />
                          </label>
                          <label style={labelStyle}>Giờ mới
                            <select required value={move.timeSlotId} onChange={(e) => setMove({ ...move, timeSlotId: e.target.value })}>
                              <option value="">Chọn giờ</option>
                              {timeSlots.map((t) => <option key={t.id} value={t.id}>{hm(t.startTime)} – {hm(t.endTime)}</option>)}
                            </select>
                          </label>
                          {moving.slot.needsReschedule && (
                            <label style={labelStyle}>Huấn luyện viên
                              <select value={move.coachId} onChange={(e) => setMove({ ...move, coachId: e.target.value })}>
                                <option value="">Giữ {moving.slot.coachName}</option>
                                {options
                                  .filter((c) => c.id !== moving.slot.coachId && c.sports.some((s) => s.id === r.sportId))
                                  .map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                              </select>
                            </label>
                          )}
                        </div>
                        <div>
                          <button type="submit" className={styles.primary} disabled={busy}>Dời sang giờ này</button>{' '}
                          <button type="button" className={styles.secondary} onClick={() => setMoving(null)}>Đóng</button>
                        </div>
                      </form>
                    )}
                  </div>
                  <div className={styles.side}>
                    <span className={`${styles.badge} ${r.status === 'PAID' ? styles.good : ''}`}>{STATUS[r.status] || r.status}</span>
                    {r.status === 'APPROVED' && (
                      <>
                        <button type="button" className={styles.primary} disabled={busy} onClick={() => onPay(r)}>Thanh Toán Online</button>
                        <button type="button" className={styles.secondary} disabled={busy} onClick={() => onCheck(r)}>Tôi Đã Thanh Toán</button>
                      </>
                    )}
                    {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                      <button type="button" className={styles.danger} onClick={() => askCancel(r)}>Hủy yêu cầu</button>
                    )}
                  </div>
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
