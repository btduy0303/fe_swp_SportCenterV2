import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTrainingToast as useToast } from '../training/useTrainingToast'
import { coachService } from '../../services/coachService'
import PaginatedList from '../training/PaginatedList'
import ConfirmModal from '../../components/common/ConfirmModal'
import styles from '../../css/coach/CoachDashboard.module.css'

const when = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
const statuses = { OPEN: 'Còn trống', HELD: 'Đang giữ chỗ', BOOKED: 'Đã đặt', DONE: 'Hoàn thành', CANCELED: 'Đã hủy' }

export default function CoachSlots() {
  const { token } = useAuth()
  const toast = useToast()
  const [timeSlots, setTimeSlots] = useState([])
  const [newSlot, setNewSlot] = useState({ date: '', timeSlotId: '' })
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState('')
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ loading: true, slots: [], error: '' })
  const [canceling, setCanceling] = useState(null)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const loading = state.loading || state.revision !== revision || state.token !== token
  useEffect(() => {
    const controller = new AbortController()
    coachService.getMy1On1Slots(token, controller.signal).then(slots => {
      if (!controller.signal.aborted) setState({ token, revision, slots, loading: false, error: '' })
    }).catch(error => { if (!controller.signal.aborted) setState({ token, revision, slots: [], loading: false, error: error.message }) })
    return () => controller.abort()
  }, [token, revision])
  useEffect(() => {
    let active = true
    coachService.getTimeSlots().then(rows => { if (active) setTimeSlots(rows.filter(row => row.active)) })
      .catch(error => { if (active) setCreateError(error.message) })
    return () => { active = false }
  }, [token])
  async function create(event) {
    event.preventDefault(); setCreateBusy(true); setCreateError('')
    try {
      await coachService.create1On1Slot(token, { date: newSlot.date, timeSlotId: Number(newSlot.timeSlotId) })
      toast.success('Đã mở suất 1-1'); setNewSlot({ date: '', timeSlotId: '' }); setRevision(n => n + 1)
    } catch (error) { setCreateError(error.message) } finally { setCreateBusy(false) }
  }
  async function cancel() {
    setConfirm(false); setBusy(true); setSaveError('')
    try {
      if (canceling.status === 'OPEN') await coachService.delete1On1Slot(token, canceling.id)
      else await coachService.cancel1On1Slot(token, canceling.id, reason.trim())
      toast.success('Đã hủy suất tập 1-1'); setCanceling(null); setReason(''); setRevision(n => n + 1)
    } catch (error) { setSaveError(error.message) } finally { setBusy(false) }
  }
  return <section className={styles.panel}><h2>Các suất kèm cá nhân</h2><p className={styles.muted}>Lịch 1-1 hiện có của bạn. Mọi thời gian hiển thị theo múi giờ trung tâm.</p>
    <form onSubmit={create} className={styles.slotForm}>
      <label>Ngày mở suất<input type="date" required disabled={createBusy} value={newSlot.date} onChange={e => setNewSlot({ ...newSlot, date: e.target.value })} /></label>
      <label>Khung giờ<select required disabled={createBusy} value={newSlot.timeSlotId} onChange={e => setNewSlot({ ...newSlot, timeSlotId: e.target.value })}>
        <option value="">Chọn khung giờ</option>{timeSlots.map(t => <option key={t.id} value={t.id}>Khung {t.slotNo}: {String(t.startTime).slice(0, 5)} – {String(t.endTime).slice(0, 5)}</option>)}
      </select></label>
      <button className={styles.primaryButton} disabled={createBusy || !timeSlots.length}>{createBusy ? 'Đang mở…' : 'Mở suất 1-1'}</button>
    </form>
    {createError ? <p role="alert" className={styles.error}>{createError}</p> : null}
    {loading ? <p role="status">Đang tải lịch 1-1…</p> : state.error ? <div role="alert" className={styles.error}>{state.error}<button className={styles.button} onClick={() => setRevision(n => n + 1)}>Thử lại</button></div>
      : state.slots.length ? <PaginatedList items={state.slots} label="suất kèm cá nhân">{visible => <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Suất tập</th><th>Bắt đầu</th><th>Kết thúc</th><th>Học viên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visible.map(slot => <tr key={slot.id}><td>#{slot.id}</td><td>{when(slot.startAt)}</td><td>{when(slot.endAt)}</td><td>{slot.memberName || 'Chưa có người đặt'}</td><td>{statuses[slot.status] || slot.status}</td><td>{['OPEN', 'HELD', 'BOOKED'].includes(slot.status) ? <button className={styles.button} disabled={busy} onClick={() => { setCanceling(slot); setReason(''); setSaveError(''); if (slot.status === 'OPEN') setConfirm(true) }}>{slot.status === 'OPEN' ? 'Xóa suất trống' : 'Hủy suất đã đặt'}</button> : '—'}</td></tr>)}</tbody></table></div>}</PaginatedList>
      : <p className={styles.empty}>Chưa có suất kèm cá nhân nào.</p>}
    {saveError && canceling?.status === 'OPEN' ? <p role="alert" className={styles.error}>{saveError}</p> : null}
    {canceling && canceling.status !== 'OPEN' ? <form onSubmit={e => { e.preventDefault(); setConfirm(true) }}><label className={styles.reason}>Lý do hủy suất #{canceling.id}<textarea required minLength={3} maxLength={255} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <p className={styles.muted}>Học viên đã đặt được thông báo và xử lý hoàn tiền theo quy định của trung tâm.</p>{saveError ? <p role="alert" className={styles.error}>{saveError}</p> : null}
      <div className={styles.actions}><button className={styles.button} disabled={busy || reason.trim().length < 3} type="submit">{busy ? 'Đang xử lý…' : 'Tiếp tục hủy'}</button><button className={styles.button} disabled={busy} type="button" onClick={() => setCanceling(null)}>Quay lại</button></div></form> : null}
    <ConfirmModal variant="training" isOpen={confirm} title={canceling?.status === 'OPEN' ? 'Xóa suất trống' : 'Hủy suất tập 1-1'} message={canceling?.status === 'OPEN' ? `Xóa suất trống #${canceling.id}?` : `Xác nhận hủy suất #${canceling?.id}. Học viên sẽ nhận thông báo và được hoàn tiền theo quy định.`} confirmText="Xác nhận hủy" type="danger" onConfirm={cancel} onCancel={() => setConfirm(false)} />
  </section>
}
