import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { formatVND } from '../../utils/format'
import ConfirmModal from '../common/ConfirmModal'
import styles from '../../css/member/MemberDashboard.module.css'

const dayKey = (v) => new Date(v).toLocaleDateString('sv-SE')
const dayLabel = (k) => new Date(`${k}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
const fmt = (v) => new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

// Chọn suất 1-1 còn trống của các coach để đặt; đặt xong thì thanh toán ở danh sách bên dưới
export default function SlotBrowser({ onChanged }) {
  const { token } = useAuth()
  const toast = useToast()
  const [slots, setSlots] = useState([])
  const [coachId, setCoachId] = useState('')
  const [sportId, setSportId] = useState('')
  const [day, setDay] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState({ isOpen: false })

  const load = useCallback(async () => {
    setLoading(true)
    setSlots(await bookingService.getAvailableCoachSlots(token))
    setLoading(false)
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const coaches = [...new Map(slots.map((s) => [s.coachId, s.coachName])).entries()]
  const sports = [...new Map(slots.filter((s) => s.sportId).map((s) => [s.sportId, s.sportName])).entries()]
  const matching = slots.filter((s) => s.status === 'OPEN' && (!coachId || String(s.coachId) === coachId) && (!sportId || String(s.sportId) === sportId))
  // Chia theo ngày: mỗi lần chỉ xem một ngày, mặc định ngày gần nhất còn suất
  const days = [...new Set(matching.map((s) => dayKey(s.startAt)))]
  const activeDay = days.includes(day) ? day : days[0]
  const shown = matching.filter((s) => dayKey(s.startAt) === activeDay)

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

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Suất 1-1 Còn Trống</h2>
      <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <select className={styles.input} style={{ maxWidth: 240 }} value={sportId} onChange={(e) => setSportId(e.target.value)}>
          <option value="">Tất cả môn</option>
          {sports.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className={styles.input} style={{ maxWidth: 240 }} value={coachId} onChange={(e) => setCoachId(e.target.value)}>
          <option value="">Tất cả huấn luyện viên</option>
          {coaches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {days.length > 0 && (
        <div role="tablist" aria-label="Chọn ngày" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {days.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={k === activeDay}
              className={k === activeDay ? styles.btnPrimary : styles.btnSecondary} onClick={() => setDay(k)}>
              {dayLabel(k)} ({matching.filter((s) => dayKey(s.startAt) === k).length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Đang tải suất trống...</p>
      ) : shown.length === 0 ? (
        <p className="text-muted">Hiện chưa có suất 1-1 nào còn trống.</p>
      ) : (
        <div className={styles.grid}>
          {shown.map((s) => (
            <div key={s.id} className={styles.packageCard}>
              <h3 className={styles.packageTitle}>{s.coachName}</h3>
              <p className={styles.packageDesc}>Hạng {s.coachRank}</p>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Môn:</span>
                <span className={styles.metaValue}>{s.sportName || 'Chưa cập nhật'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Phòng:</span>
                <span className={styles.metaValue}>{s.roomName ? `${s.roomName}${s.floor ? ` · ${s.floor}` : ''}` : 'Chưa xếp phòng'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Giờ:</span>
                <span className={styles.metaValue}>{new Date(s.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(s.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={styles.packagePrice} style={{ marginTop: '0.5rem' }}>{formatVND(s.price)}</div>
              <button type="button" className={styles.btnPrimary} style={{ marginTop: '1rem', width: '100%' }} onClick={() => ask(s)}>
                Đặt Suất Này
              </button>
            </div>
          ))}
        </div>
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
          if (action) action()
        }}
        onCancel={() => setConfirm({ ...confirm, isOpen: false })}
      />
    </div>
  )
}
