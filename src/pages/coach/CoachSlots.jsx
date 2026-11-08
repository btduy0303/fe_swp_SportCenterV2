import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { coachService } from '../../services/coachService'
import PaginatedList from '../training/PaginatedList'
import styles from '../../css/coach/CoachDashboard.module.css'

const when = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
const statuses = { OPEN: 'Còn trống', HELD: 'Đang giữ chỗ', BOOKED: 'Đã đặt', DONE: 'Hoàn thành', CANCELED: 'Đã hủy' }

// Lịch 1-1 do trung tâm xếp cho coach. Coach bận một buổi đã trả tiền thì bấm "Không dạy được" để hội viên chọn giờ khác
export default function CoachSlots() {
  const { token } = useAuth()
  const toast = useToast()
  const [declining, setDeclining] = useState(null)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ loading: true, slots: [], error: '' })
  const loading = state.loading || state.revision !== revision || state.token !== token
  useEffect(() => {
    const controller = new AbortController()
    coachService.getMy1On1Slots(token, controller.signal).then(slots => {
      if (!controller.signal.aborted) setState({ token, revision, slots, loading: false, error: '' })
    }).catch(error => { if (!controller.signal.aborted) setState({ token, revision, slots: [], loading: false, error: error.message }) })
    return () => controller.abort()
  }, [token, revision])
  const canDecline = slot => slot.status === 'BOOKED' && slot.requestId && !slot.needsReschedule && new Date(slot.startAt).getTime() > Date.now()
  async function decline(event) {
    event.preventDefault(); setSending(true)
    try {
      await coachService.cannotTeachSlot(token, declining, reason.trim())
      toast.success('Đã báo không dạy được, hội viên và quản lý sẽ được thông báo')
      setDeclining(null); setReason(''); setRevision(n => n + 1)
    } catch (error) { toast.error(error.message || 'Báo không dạy được thất bại') } finally { setSending(false) }
  }
  return <section className={styles.panel}><h2>Các suất kèm cá nhân</h2><p className={styles.muted}>Lịch 1-1 do trung tâm xếp cho bạn. Bận một buổi đã được đặt, hãy bấm “Không dạy được” để hội viên chọn giờ khác. Mọi thời gian hiển thị theo múi giờ trung tâm.</p>
    {loading ? <p role="status">Đang tải lịch 1-1…</p> : state.error ? <div role="alert" className={styles.error}>{state.error}<button className={styles.button} onClick={() => setRevision(n => n + 1)}>Thử lại</button></div>
      : state.slots.length ? <PaginatedList items={state.slots} label="suất kèm cá nhân">{visible => <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Môn</th><th>Phòng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Học viên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visible.map(slot => <tr key={slot.id}><td>{slot.sportName || '—'}</td><td>{slot.roomName ? `${slot.roomName}${slot.floor ? ` · ${slot.floor}` : ''}` : 'Chưa xếp phòng'}</td><td>{when(slot.startAt)}</td><td>{when(slot.endAt)}</td><td>{slot.memberName || 'Chưa có người đặt'}</td><td>{statuses[slot.status] || slot.status}{slot.needsReschedule ? <small> · chờ hội viên chọn giờ mới</small> : null}</td><td>{canDecline(slot) ? (declining === slot.id
        ? <form onSubmit={decline}><input required maxLength={255} placeholder="Lý do bận" aria-label="Lý do bận" value={reason} onChange={event => setReason(event.target.value)} /> <button className={styles.button} type="submit" disabled={sending}>Gửi</button> <button className={styles.button} type="button" onClick={() => { setDeclining(null); setReason('') }}>Đóng</button></form>
        : <button className={styles.button} type="button" onClick={() => { setDeclining(slot.id); setReason('') }}>Không dạy được</button>) : '—'}</td></tr>)}</tbody></table></div>}</PaginatedList>
      : <p className={styles.empty}>Trung tâm chưa xếp suất kèm cá nhân nào cho bạn.</p>}
  </section>
}
