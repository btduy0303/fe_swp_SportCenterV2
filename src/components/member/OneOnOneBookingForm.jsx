import React, { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { formatVND } from '../../utils/format'
import { sessionPlan, slotsByWeekday, weekdayLabel } from '../../utils/sessionDates'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import styles from '../../css/member/OneOnOneBooking.module.css'

const DAY_OPTIONS = [[1, 'Thứ 2'], [2, 'Thứ 3'], [3, 'Thứ 4'], [4, 'Thứ 5'], [5, 'Thứ 6'], [6, 'Thứ 7'], [7, 'Chủ nhật']]
const EMPTY_ROW = { weekday: '', timeSlotId: '' }
// coachId '' là chưa chọn, 'CENTER' là nhờ trung tâm xếp coach
const CENTER = 'CENTER'
const hm = (t) => String(t).slice(0, 5)
const iso = (d) => d.toLocaleDateString('sv-SE')
const dmy = (d) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

// Mua khóa 1-1 theo thứ tự khách hay nghĩ: chọn khóa, rồi giờ mình rảnh mỗi tuần, rồi xem coach nào rảnh đúng các giờ đó.
// Coach được xếp theo mức phù hợp; khách cũng có thể nhờ trung tâm xếp coach. Trung tâm duyệt rồi khách trả tiền một lần
export default function OneOnOneBookingForm({ packages, options, timeSlots, limits, discountPct, initial, onDone, onClose }) {
  const { token } = useAuth()
  const toast = useToast()
  const [guard, sending] = useSingleFlight()
  const [form, setForm] = useState(() => ({ sportId: '', packageId: '', coachId: '', firstDate: '', rows: [EMPTY_ROW], ...initial }))
  const [busyByCoach, setBusyByCoach] = useState({})

  const leadHours = Number(limits['one_on_one.request_min_lead_hours']) || 48
  const payHours = Number(limits['one_on_one.request_pay_hours']) || 24
  const minDate = iso(new Date(Date.now() + leadHours * 3600000))

  const sports = useMemo(() => [...new Map(packages
    .filter((p) => options.some((c) => c.sports.some((s) => s.id === p.sportCategoryId)))
    .map((p) => [String(p.sportCategoryId), p.sportName])).entries()], [packages, options])
  const sportPackages = packages.filter((p) => String(p.sportCategoryId) === form.sportId)
  const pack = packages.find((p) => String(p.id) === form.packageId)
  const coaches = useMemo(() => options.filter((c) => c.sports.some((s) => String(s.id) === form.sportId)), [options, form.sportId])
  const slotOf = (id) => timeSlots.find((t) => String(t.id) === String(id))

  const rows = form.rows.filter((r) => r.weekday && r.timeSlotId)
  const sameRow = rows.some((a, i) => rows.some((b, j) => j > i && a.weekday === b.weekday && a.timeSlotId === b.timeSlotId))
  const chosen = rows.map((r) => ({ weekday: Number(r.weekday), timeSlotId: Number(r.timeSlotId), startTime: slotOf(r.timeSlotId)?.startTime }))
  // Mỗi khung giờ là một buổi mỗi tuần: không chọn nhiều khung hơn số buổi của khóa
  const tooMany = Boolean(pack) && form.rows.length > pack.sessions
  const plan = pack && form.firstDate && chosen.length && !sameRow && !tooMany ? sessionPlan(form.firstDate, slotsByWeekday(chosen), pack.sessions) : []
  const lastDate = plan.length ? iso(plan.at(-1).date) : ''

  // Lịch bận của các coach dạy môn này, trong đúng khoảng ngày sẽ học
  useEffect(() => {
    if (!form.firstDate || !lastDate || coaches.length === 0) { setBusyByCoach({}); return }
    let alive = true
    Promise.all(coaches.map((c) => bookingService.getCoachBusy(token, c.id, form.firstDate, lastDate).then((b) => [c.id, b]).catch(() => [c.id, null])))
      .then((list) => { if (alive) setBusyByCoach(Object.fromEntries(list)) })
    return () => { alive = false }
  }, [token, coaches, form.firstDate, lastDate])

  // Mỗi coach: các buổi trong kế hoạch bị trùng lịch bận của coach đó, gom theo (thứ, giờ) để nói gọn
  const fit = useMemo(() => coaches.map((c) => {
    const busy = busyByCoach[c.id]
    if (!busy || plan.length === 0) return { coach: c, known: Boolean(busy), clashes: [] }
    const clashes = new Map()
    plan.forEach((p) => {
      const slot = slotOf(p.timeSlotId)
      const day = iso(p.date)
      if (slot && busy.some((b) => b.date === day && hm(b.startTime) < hm(slot.endTime) && hm(slot.startTime) < hm(b.endTime))) {
        const key = `${weekdayLabel(p.weekday)} ${hm(slot.startTime)}`
        clashes.set(key, [...(clashes.get(key) || []), p.date])
      }
    })
    return { coach: c, known: true, clashes: [...clashes] }
  }).sort((a, b) => a.clashes.length - b.clashes.length), [coaches, busyByCoach, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  // Đổi khóa, ngày hay giờ thì coach đã chọn có thể không còn rảnh: bỏ chọn để khách xem lại
  const picked = fit.find((f) => String(f.coach.id) === form.coachId)
  useEffect(() => {
    if (picked && picked.clashes.length > 0) setForm((f) => ({ ...f, coachId: '' }))
  }, [picked])

  const setRow = (i, patch) => setForm((f) => ({ ...f, rows: f.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }))
  const listTotal = pack ? Number(pack.price) : 0
  const discount = Math.round((listTotal * discountPct) / 100)
  const ready = Boolean(pack && plan.length && form.coachId)

  const submit = (e) => {
    e.preventDefault()
    guard(async () => {
      try {
        await bookingService.submitCoachRequest(token, {
          packageId: pack.id,
          coachId: form.coachId === CENTER ? null : Number(form.coachId),
          firstDate: form.firstDate,
          days: chosen.map((c) => ({ weekday: c.weekday, timeSlotId: c.timeSlotId })),
        })
        toast.success('Đã gửi yêu cầu, trung tâm sẽ duyệt trong thời gian sớm nhất')
        onDone()
      } catch (err) {
        toast.error(err.message || 'Gửi yêu cầu thất bại')
      }
    })
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-labelledby="oob-title">
      <div className={styles.top}>
        <h2 id="oob-title">Mua khóa 1-1</h2>
        <button type="button" className={styles.close} onClick={onClose}>Đóng</button>
      </div>

      <fieldset className={styles.part}>
        <legend>Bạn muốn học gì?</legend>
        <label className={styles.field}>Môn
          <select required value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value, packageId: '', coachId: '' })}>
            <option value="">Chọn môn</option>
            {sports.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        {sportPackages.length > 0 ? (
          <ul className={styles.packs}>
            {sportPackages.map((p) => (
              <li key={p.id}>
                <label className={form.packageId === String(p.id) ? styles.packOn : ''}>
                  <input type="radio" name="oob-pack" checked={form.packageId === String(p.id)} onChange={() => setForm({ ...form, packageId: String(p.id) })} />
                  <span className={styles.packName}>{p.name}{p.description ? <small>{p.description}</small> : null}</span>
                  <span className={styles.packFacts}>{p.sessions} buổi<small>{formatVND(p.pricePerSession)}/buổi</small></span>
                  <span className={styles.packPrice}>{formatVND(p.price)}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      <fieldset className={styles.part} disabled={!pack}>
        <legend>Bạn rảnh lúc nào mỗi tuần?</legend>
        <p className={styles.hint}>Mỗi dòng là một buổi trong tuần. Muốn học 2 buổi một ngày thì thêm 2 dòng cùng thứ.</p>
        <label className={styles.field}>Bắt đầu từ ngày
          <input required type="date" min={minDate} value={form.firstDate} onChange={(e) => setForm({ ...form, firstDate: e.target.value })} />
        </label>
        <div className={styles.rows}>
          {form.rows.map((r, i) => (
            <div key={i} className={styles.row}>
              <select aria-label="Thứ" value={r.weekday} onChange={(e) => setRow(i, { weekday: e.target.value })}>
                <option value="">Thứ</option>
                {DAY_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
              <select aria-label="Khung giờ" value={r.timeSlotId} onChange={(e) => setRow(i, { timeSlotId: e.target.value })}>
                <option value="">Khung giờ</option>
                {timeSlots.map((t) => <option key={t.id} value={t.id}>{hm(t.startTime)} – {hm(t.endTime)}</option>)}
              </select>
              <button type="button" className={styles.icon} aria-label="Xóa dòng này" disabled={form.rows.length === 1}
                onClick={() => setForm((f) => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }))}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {sameRow ? <p className={styles.warn}>Có hai dòng trùng nhau, hãy đổi một dòng.</p> : null}
        {tooMany ? <p className={styles.warn}>Khóa này có {pack.sessions} buổi, bạn chỉ chọn được tối đa {pack.sessions} buổi mỗi tuần. Hãy xóa bớt dòng.</p> : null}
        <button type="button" className={styles.add} disabled={Boolean(pack) && form.rows.length >= pack.sessions}
          title={pack && form.rows.length >= pack.sessions ? `Khóa này chỉ có ${pack.sessions} buổi` : undefined} onClick={() => setForm((f) => ({ ...f, rows: [...f.rows, { ...EMPTY_ROW, weekday: f.rows.at(-1)?.weekday || '' }] }))}>+ Thêm buổi trong tuần</button>
        {plan.length ? <p className={styles.span}>{pack.sessions} buổi, từ {dmy(plan[0].date)} đến {dmy(plan.at(-1).date)}</p> : null}
      </fieldset>

      <fieldset className={styles.part} disabled={plan.length === 0}>
        <legend>Học với ai?</legend>
        {plan.length === 0 ? <p className={styles.hint}>Chọn khóa và giờ rảnh trước, hệ thống sẽ cho biết huấn luyện viên nào rảnh đúng các giờ đó.</p> : (
          <ul className={styles.coaches}>
            {fit.map(({ coach, known, clashes }) => {
              const free = known && clashes.length === 0
              return (
                <li key={coach.id}>
                  <label className={`${form.coachId === String(coach.id) ? styles.coachOn : ''} ${free ? '' : styles.coachOff}`}>
                    <input type="radio" name="oob-coach" disabled={!free} checked={form.coachId === String(coach.id)} onChange={() => setForm({ ...form, coachId: String(coach.id) })} />
                    <span className={styles.coachName}>{coach.fullName}</span>
                    <span className={free ? styles.ok : styles.no}>
                      {!known ? 'Đang xem lịch...' : free ? 'Rảnh đủ mọi buổi' : `Kín ${clashes.map(([k, ds]) => `${k} (${ds.length} buổi, từ ${dm(ds[0])})`).join('; ')}`}
                    </span>
                  </label>
                </li>
              )
            })}
            <li>
              <label className={form.coachId === CENTER ? styles.coachOn : ''}>
                <input type="radio" name="oob-coach" checked={form.coachId === CENTER} onChange={() => setForm({ ...form, coachId: CENTER })} />
                <span className={styles.coachName}>Trung tâm xếp giúp</span>
                <span className={styles.dim}>Trung tâm chọn huấn luyện viên rảnh khi duyệt</span>
              </label>
            </li>
          </ul>
        )}
      </fieldset>

      <div className={styles.bar}>
        <p>
          {pack ? <b>{formatVND(listTotal - discount)}</b> : <b>—</b>}
          {discount > 0 ? <small>đã giảm {discountPct}% theo hạng hội viên</small> : null}
          <small>Trung tâm duyệt xong, bạn có {payHours} giờ để trả online hoặc tại quầy.</small>
        </p>
        <button type="submit" className={styles.submit} disabled={sending || !ready}>Gửi yêu cầu</button>
      </div>
    </form>
  )
}
