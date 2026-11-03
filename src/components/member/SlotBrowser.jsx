import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { apiRequest } from '../../services/apiHelper'
import { formatVND } from '../../utils/format'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import ConfirmModal from '../common/ConfirmModal'
import styles from '../../css/member/SlotBrowser.module.css'

const WEEKDAY = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7']
const DAY_MS = 86400000

const dayKey = (v) => new Date(v).toLocaleDateString('sv-SE')
const hm = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmt = (v) => new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const ddmm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

// Thứ Hai của tuần chứa ngày d (giờ máy)
function mondayOf(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

// Chọn suất 1-1 còn trống của các coach để đặt: chọn tuần, chọn ngày, rồi chọn giờ. Đặt xong thì thanh toán ở danh sách bên dưới
export default function SlotBrowser({ onChanged }) {
  const { token } = useAuth()
  const toast = useToast()
  const [guard] = useSingleFlight()
  const [slots, setSlots] = useState([])
  const [coachId, setCoachId] = useState('')
  const [sportId, setSportId] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [day, setDay] = useState('')
  const [refundHours, setRefundHours] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState({ isOpen: false })

  const load = useCallback(async () => {
    setLoading(true)
    setSlots(await bookingService.getAvailableCoachSlots(token))
    setLoading(false)
  }, [token])

  useEffect(() => {
    load()
    apiRequest('GET', '/api/public/landing-settings').then((s) => setRefundHours(s?.['one_on_one.refund_before_hours'] ?? null)).catch(() => {})
  }, [load])

  const coaches = [...new Map(slots.map((s) => [s.coachId, s.coachName])).entries()]
  const sports = [...new Map(slots.filter((s) => s.sportId).map((s) => [s.sportId, s.sportName])).entries()]

  const matching = useMemo(
    () => slots.filter((s) => s.status === 'OPEN' && (!coachId || String(s.coachId) === coachId) && (!sportId || String(s.sportId) === sportId)),
    [slots, coachId, sportId],
  )
  const countByDay = useMemo(() => {
    const map = {}
    matching.forEach((s) => { map[dayKey(s.startAt)] = (map[dayKey(s.startAt)] || 0) + 1 })
    return map
  }, [matching])

  const thisMonday = mondayOf(new Date())
  const monday = new Date(thisMonday.getTime() + weekOffset * 7 * DAY_MS)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return { date: d, key: d.toLocaleDateString('sv-SE') }
  })
  const weekIndexOf = (key) => Math.round((mondayOf(new Date(`${key}T00:00:00`)) - thisMonday) / (7 * DAY_MS))
  const slotWeeks = matching.map((s) => weekIndexOf(dayKey(s.startAt)))
  const lastWeek = slotWeeks.length ? Math.max(...slotWeeks) : 0
  const weekHasSlots = week.some((d) => countByDay[d.key])
  const firstWeekWithSlots = slotWeeks.length ? Math.min(...slotWeeks.filter((w) => w >= 0)) : null

  const activeKey = week.some((d) => d.key === day) ? day : (week.find((d) => countByDay[d.key]) || week[0]).key
  const shown = matching.filter((s) => dayKey(s.startAt) === activeKey).sort((a, b) => a.startAt.localeCompare(b.startAt))
  const activeDate = week.find((d) => d.key === activeKey).date

  const ask = (slot) => {
    setConfirm({
      isOpen: true,
      title: 'Đặt Buổi 1-1',
      message: `Đặt buổi ${slot.sportName ? `${slot.sportName} ` : ''}với ${slot.coachName} lúc ${fmt(slot.startAt)}${slot.roomName ? ` tại ${slot.roomName}` : ''}? Giá ${formatVND(slot.price)}. Chỗ được giữ trong thời gian chờ thanh toán.`,
      confirmText: 'Xác Nhận Đặt',
      type: 'primary',
      action: async () => {
        try {
          await bookingService.bookCoachSlot(token, slot.id)
          toast.success('Đã giữ chỗ, hãy thanh toán để hoàn tất')
          load()
          onChanged()
        } catch (err) {
          toast.error(err.message || 'Đặt buổi thất bại')
        }
      },
    })
  }

  const sunday = week[6].date
  const range = `${ddmm(monday)} – ${ddmm(sunday)}/${sunday.getFullYear()}`

  return (
    <section aria-labelledby="slots-title">
      <h2 id="slots-title" className={styles.title}>Suất 1-1 còn trống</h2>
      {refundHours != null && <p className={styles.lead}>Hủy trước giờ tập ít nhất {refundHours} giờ để được hoàn tiền.</p>}

      <div className={styles.filters}>
        <select aria-label="Môn" value={sportId} onChange={(e) => setSportId(e.target.value)}>
          <option value="">Mọi môn</option>
          {sports.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select aria-label="Huấn luyện viên" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
          <option value="">Mọi huấn luyện viên</option>
          {coaches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      <div className={styles.weekBar}>
        <button type="button" aria-label="Tuần trước" disabled={weekOffset <= 0} onClick={() => setWeekOffset(weekOffset - 1)}>‹</button>
        <p className={styles.range}>{range}</p>
        <button type="button" className={`${styles.now} ${weekOffset === 0 ? styles.on : ''}`} onClick={() => setWeekOffset(0)}>Tuần này</button>
        <button type="button" aria-label="Tuần sau" disabled={weekOffset >= lastWeek} onClick={() => setWeekOffset(weekOffset + 1)}>›</button>
      </div>

      <div className={styles.week} role="tablist" aria-label="Chọn ngày">
        {week.map((d) => {
          const count = countByDay[d.key] || 0
          return (
            <button key={d.key} type="button" role="tab" aria-selected={d.key === activeKey}
              className={`${styles.day} ${d.key === activeKey ? styles.on : ''} ${count ? '' : styles.empty}`} onClick={() => setDay(d.key)}>
              <small>{WEEKDAY[d.date.getDay()]}</small>
              <b>{ddmm(d.date)}</b>
              <em>{count ? `${count} suất` : 'Hết suất'}</em>
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className={styles.muted}>Đang tải suất trống...</p>
      ) : (
        <>
          <p className={styles.dayTitle}>{WEEKDAY[activeDate.getDay()]}, {ddmm(activeDate)} · {shown.length} suất trống</p>
          {shown.length === 0 ? (
            <div className={styles.emptyBox}>
              {weekHasSlots ? 'Ngày này chưa có suất trống. Chọn ngày khác trong tuần.' : 'Tuần này chưa có suất trống.'}
              {!weekHasSlots && firstWeekWithSlots != null && firstWeekWithSlots !== weekOffset && (
                <div><button type="button" className={styles.jump} onClick={() => setWeekOffset(firstWeekWithSlots)}>Xem tuần gần nhất còn suất</button></div>
              )}
            </div>
          ) : (
            <div className={styles.list}>
              {shown.map((s) => (
                <article key={s.id} className={styles.slot}>
                  <span className={styles.time}>{hm(s.startAt)} – {hm(s.endAt)}</span>
                  <div className={styles.info}>
                    <b>{s.coachName} · Hạng {s.coachRank}</b>
                    <span>{s.sportName || 'Chưa cập nhật môn'} · {s.roomName ? `${s.roomName}${s.floor ? ` · ${s.floor}` : ''}` : 'Chưa xếp phòng'}</span>
                  </div>
                  <span className={styles.price}>{formatVND(s.price)}</span>
                  <button type="button" className={styles.book} onClick={() => ask(s)}>Đặt</button>
                </article>
              ))}
            </div>
          )}
        </>
      )}

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
    </section>
  )
}
