import React, { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { apiRequest } from '../../services/apiHelper'
import { formatVND } from '../../utils/format'
import { categoryIcon } from '../../utils/sportIcon'
import { daysText } from '../../utils/sessionDates'
import OneOnOneBookingForm from './OneOnOneBookingForm'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import ConfirmModal from '../common/ConfirmModal'
import PageHead from './PageHead'
import PayOptions from './PayOptions'
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
const EMPTY_MOVE = { date: '', timeSlotId: '', coachId: '' }

const fmtDate = (d) => `${WEEKDAY[d.getDay()]} ${d.toLocaleDateString('vi-VN')}`
const fmtDateTime = (v) => new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const hm = (t) => String(t).slice(0, 5)
const toDate = (iso) => new Date(`${iso}T00:00:00`)
const dayMonth = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

// Hội viên mua một gói 1-1 (số buổi và giá trọn gói do trung tâm đặt), chọn coach và các khung giờ mỗi tuần.
// Trung tâm duyệt rồi hội viên trả tiền một lần cho cả gói.
// Buổi đã trả tiền dời được nếu báo trước đủ giờ, hoặc bất cứ lúc nào khi trung tâm không dạy được buổi đó
export default function SlotRequests({ coachSlots, busy, onPay, onCheck, onChanged, oneOnOneDiscountPct = 0 }) {
  const { token } = useAuth()
  const toast = useToast()
  const [guard] = useSingleFlight()
  const [options, setOptions] = useState([])
  const [packages, setPackages] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [requests, setRequests] = useState(null)
  const [limits, setLimits] = useState({})
  // null: đóng form; {}: mua mới; { sportId, packageId, coachId, cells }: xin lại yêu cầu bị từ chối
  const [formInit, setFormInit] = useState(null)
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
    bookingService.getOneOnOnePackages().then(setPackages).catch(() => {})
    apiRequest('GET', '/api/time-slots').then((t) => setTimeSlots((t || []).filter((x) => x.active !== false))).catch(() => {})
    apiRequest('GET', '/api/public/landing-settings').then(setLimits).catch(() => {})
  }, [token])

  // Tải lại khi bảng buổi 1-1 của trang đổi (sau khi trả tiền hoặc kiểm tra thanh toán)
  useEffect(() => {
    load()
  }, [load, coachSlots])

  const rescheduleHours = Number(limits['one_on_one.reschedule_before_hours']) || 24

  // Xin lại một yêu cầu bị từ chối: mở biểu mẫu với khóa, huấn luyện viên và giờ cũ, hội viên chọn ngày mới
  const askAgain = (r) => {
    setFormInit({
      sportId: String(r.sportId), packageId: r.packageId ? String(r.packageId) : '', coachId: r.coachId ? String(r.coachId) : '',
      rows: (r.days || []).map((d) => ({ weekday: String(d.weekday), timeSlotId: String(d.timeSlotId) })),
    })
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
        <PageHead title="Buổi 1-1" lead="Mua một khóa học riêng với huấn luyện viên, chọn giờ học mỗi tuần. Trung tâm duyệt rồi bạn trả tiền một lần cho cả gói." />
        {!formInit ? <button type="button" className={styles.primary} onClick={() => setFormInit({})}><Plus size={16} aria-hidden="true" />Mua khóa 1-1</button> : null}
      </div>

      {formInit ? (
        <OneOnOneBookingForm
          key={JSON.stringify(formInit)}
          packages={packages}
          options={options}
          timeSlots={timeSlots}
          limits={limits}
          discountPct={oneOnOneDiscountPct}
          initial={formInit}
          onDone={() => { setFormInit(null); load() }}
          onClose={() => setFormInit(null)}
        />
      ) : null}

      <section aria-labelledby="req-list-title" id="my-slots" style={{ scrollMarginTop: '5rem' }}>
        <h2 id="req-list-title" className={styles.sectionTitle}>Yêu cầu của tôi</h2>
        {requests === null ? <p className={styles.empty}>Đang tải yêu cầu...</p> : requests.length === 0 ? <p className={styles.empty}>Bạn chưa mua khóa 1-1 nào. Bấm "Mua khóa 1-1" để bắt đầu.</p> : (
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
                      <strong>{r.packageName || r.sportName} · {r.coachName || 'chờ trung tâm xếp coach'} · {r.sessions} buổi</strong>
                      <small>{daysText(r.days)}, từ {toDate(r.firstDate).toLocaleDateString('vi-VN')}{r.status === 'PAID' ? ` · đã học ${sessions.filter((s) => s.status === 'BOOKED' && !isFuture(s)).length}/${sessions.length} buổi` : ''}</small>
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

                  {r.status === 'APPROVED' ? (
                    <PayOptions deadline={r.expiresAt} whatHappens={`Các buổi được giữ cho bạn đến lúc đó, quá hạn chưa trả thì ${r.sessions} buổi được nhả.`} busy={busy} onPay={() => onPay(r)} onCheck={() => onCheck(r)} />
                  ) : null}

                  {r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED' ? (
                    <div className={styles.foot}>
                      <span className={r.status === 'APPROVED' ? styles.due : styles.dim}>
                        {r.status === 'PENDING' ? `Chờ duyệt trước ${fmtDateTime(r.expiresAt)}` : null}
                        {r.status === 'REJECTED' ? (r.rejectReason ? `Lý do: ${r.rejectReason}` : 'Trung tâm chưa duyệt yêu cầu này.') : null}
                      </span>
                      <span className={styles.footActions}>
                        {r.status === 'APPROVED' ? (
                          <>
                            <button type="button" className={styles.link} onClick={() => askCancel(r)}>Hủy yêu cầu</button>
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
