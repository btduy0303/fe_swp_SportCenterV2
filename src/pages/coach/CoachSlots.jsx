import { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { coachService } from '../../services/coachService'
import PaginatedList from '../training/PaginatedList'
import styles from '../../css/coach/CoachDashboard.module.css'

const when = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
const statuses = { OPEN: 'Còn trống', HELD: 'Đang giữ chỗ', BOOKED: 'Đã đặt', DONE: 'Hoàn thành', CANCELED: 'Đã hủy' }
const teaching = { TAUGHT: 'Đã dạy', NOT_TAUGHT: 'Chưa dạy', CANCELED: 'Đã hủy', WAITING_PAYMENT: 'Chờ thanh toán', OPEN: 'Còn trống' }

// Lịch 1-1 do trung tâm xếp cho coach: chỉ xem, cần đổi thì báo quản lý
export default function CoachSlots() {
  const { token } = useAuth()
  const toast = useToast()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
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
  async function saveNote() {
    setSaving(true)
    try {
      const updated = await coachService.updateSlotNote(token, editing.id, editing.note)
      setState(old => ({ ...old, slots: old.slots.map(s => s.id === updated.id ? { ...s, ...updated } : s) }))
      setEditing(null)
      toast.success('Đã lưu ghi chú buổi 1-1')
    } catch (error) { toast.error(error.message || 'Lưu ghi chú thất bại') } finally { setSaving(false) }
  }
  const slots = state.slots.filter(s => filter === 'all' || s.teachingStatus === filter)
  return <section className={styles.panel}><h2>Các suất kèm cá nhân</h2><p className={styles.muted}>Lịch 1-1 do trung tâm xếp cho bạn. Cần đổi hoặc hủy buổi nào, hãy báo quản lý. Mọi thời gian hiển thị theo múi giờ trung tâm.</p>
    <label>Hiển thị <select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tất cả</option><option value="NOT_TAUGHT">Chưa dạy</option><option value="TAUGHT">Đã dạy</option></select></label>
    {loading ? <p role="status">Đang tải lịch 1-1…</p> : state.error ? <div role="alert" className={styles.error}>{state.error}<button className={styles.button} onClick={() => setRevision(n => n + 1)}>Thử lại</button></div>
      : slots.length ? <PaginatedList items={slots} label="suất kèm cá nhân">{visible => <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Môn</th><th>Phòng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Học viên</th><th>Trạng thái</th><th>Dạy</th><th>Ghi chú</th></tr></thead><tbody>{visible.map(slot => <tr key={slot.id}><td>{slot.sportName || '—'}</td><td>{slot.roomName ? `${slot.roomName}${slot.floor ? ` · ${slot.floor}` : ''}` : 'Chưa xếp phòng'}</td><td>{when(slot.startAt)}</td><td>{when(slot.endAt)}</td><td>{slot.memberName || 'Chưa có người đặt'}</td><td>{statuses[slot.status] || slot.status}</td><td>{teaching[slot.teachingStatus] || '—'}</td><td>{editing?.id === slot.id ? <><textarea aria-label="Ghi chú buổi 1-1" maxLength={1000} value={editing.note} disabled={saving} onChange={e => setEditing({ id: slot.id, note: e.target.value })} /><button className={styles.primaryButton} disabled={saving} onClick={saveNote}>{saving ? 'Đang lưu…' : 'Lưu'}</button><button className={styles.button} disabled={saving} onClick={() => setEditing(null)}>Hủy</button></> : <>{slot.coachNote || '—'}{slot.status === 'BOOKED' ? <button className={styles.button} onClick={() => setEditing({ id: slot.id, note: slot.coachNote || '' })}>Ghi chú</button> : null}</>}</td></tr>)}</tbody></table></div>}</PaginatedList>
      : <p className={styles.empty}>Không có suất kèm cá nhân nào phù hợp.</p>}
  </section>
}
