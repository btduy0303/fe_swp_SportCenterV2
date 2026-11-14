import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import ConfirmModal from '../common/ConfirmModal'
import SportPicker from './SportPicker'
import styles from '../../css/manager/ManagerDashboard.module.css'

const ROOM_STATUS = [['AVAILABLE', 'Sẵn sàng'], ['MAINTENANCE', 'Bảo trì'], ['CLOSED', 'Đóng cửa']]
const EMPTY = { roomName: '', floor: 'Tầng 1', capacity: 20, description: '' }

// Phòng tập trong một bảng: thêm, sửa thông tin, trạng thái (bảo trì thì đổi phòng các buổi sắp tới), môn được dạy, xóa
export default function RoomsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [rooms, setRooms] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null) // bản nháp của phòng đang sửa
  // deleting: { room, usage } sau khi đã hỏi BE phòng này xóa hẳn được hay chỉ ngừng sử dụng
  const [deleting, setDeleting] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([managerService.getRooms(token), managerService.getCategories(token)])
      setRooms(r)
      setCategories(c)
    } catch (err) {
      toast.error(err.message || 'Không thể tải phòng tập')
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  // Chạy một thao tác, báo kết quả, tải lại. Trả true nếu thành công
  const run = async (action, okMsg, failMsg) => {
    try {
      await action()
      toast.success(okMsg)
      load()
      return true
    } catch (err) {
      toast.error(err.message || failMsg)
      return false
    }
  }

  const askDelete = async (room) => {
    try {
      setDeleting({ room, usage: await managerService.getRoomUsage(token, room.id) })
    } catch (err) {
      toast.error(err.message || 'Không thể kiểm tra phòng')
    }
  }
  const shown = rooms.filter((r) => Boolean(r.archived) === showArchived)

  const payload = (r) => ({ roomName: r.roomName.trim(), floor: r.floor || 'Tầng 1', capacity: parseInt(r.capacity, 10), description: r.description || '' })
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const setEdit = (key) => (e) => setEditing({ ...editing, [key]: e.target.value })

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Thêm Phòng Tập</h2>
        <form className={styles.inlineForm}
          onSubmit={async (e) => { e.preventDefault(); if (await run(() => managerService.createRoom(token, payload(form)), 'Đã thêm phòng', 'Thêm phòng thất bại')) setForm(EMPTY) }}>
          <label className={styles.label}>Tên phòng<input required className={styles.input} placeholder="Ví dụ: Phòng Yoga 01" value={form.roomName} onChange={set('roomName')} /></label>
          <label className={styles.label}>Tầng<input className={styles.input} value={form.floor} onChange={set('floor')} /></label>
          <label className={styles.label}>Sức chứa<input required type="number" min="1" className={styles.input} value={form.capacity} onChange={set('capacity')} /></label>
          <label className={styles.label}>Mô tả<input className={styles.input} placeholder="Trang thiết bị..." value={form.description} onChange={set('description')} /></label>
          <button type="submit" className={styles.btnAction}>Thêm phòng</button>
        </form>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Danh Sách Phòng ({shown.length})</h2>
        <div className={styles.actions} role="group" aria-label="Lọc phòng" style={{ marginBottom: '0.75rem' }}>
          {[[false, 'Đang dùng'], [true, 'Đã ngừng sử dụng']].map(([v, l]) => (
            <button key={l} type="button" aria-pressed={showArchived === v} className={showArchived === v ? styles.btnEdit : styles.btnAction} onClick={() => setShowArchived(v)}>
              {l} ({rooms.filter((r) => Boolean(r.archived) === v).length})
            </button>
          ))}
        </div>
        <p className={styles.hint}>Phòng chỉ xếp được lớp và buổi 1-1 thuộc môn đã gán. Chuyển sang "Bảo trì" thì các buổi sắp tới được đổi sang phòng khác.</p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Phòng</th>
                <th className={styles.th}>Trạng thái</th>
                <th className={styles.th}>Môn được dạy</th>
                <th className={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td className={styles.td} colSpan={4}>{showArchived ? 'Không có phòng nào đã ngừng sử dụng.' : 'Chưa có phòng nào.'}</td></tr>}
              {shown.map((r) => editing?.id === r.id ? (
                <tr key={r.id} className={styles.row}>
                  <td className={styles.td} colSpan={3}>
                    <div className={styles.inlineForm}>
                      <label className={styles.label}>Tên phòng<input className={styles.input} value={editing.roomName} onChange={setEdit('roomName')} /></label>
                      <label className={styles.label}>Tầng<input className={styles.input} value={editing.floor} onChange={setEdit('floor')} /></label>
                      <label className={styles.label}>Sức chứa<input type="number" min="1" className={styles.input} value={editing.capacity} onChange={setEdit('capacity')} /></label>
                      <label className={styles.label}>Mô tả<input className={styles.input} value={editing.description} onChange={setEdit('description')} /></label>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button type="button" className={styles.btnAction} disabled={!editing.roomName.trim()}
                        onClick={async () => { if (await run(() => managerService.updateRoom(token, r.id, payload(editing)), 'Đã lưu phòng', 'Lưu phòng thất bại')) setEditing(null) }}>Lưu</button>
                      <button type="button" className={styles.btnEdit} onClick={() => setEditing(null)}>Hủy</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={r.id} className={styles.row}>
                  <td className={styles.td}><strong>{r.roomName}</strong><br /><span className={styles.hint}>{r.floor || 'Tầng 1'} · {r.capacity} chỗ{r.description ? ` · ${r.description}` : ''}</span></td>
                  <td className={styles.td}>
                    {r.archived ? <span className={styles.hint}>Ngừng sử dụng</span> : (
                    <select className={`${styles.select} ${styles.tableSelect}`} aria-label={`Trạng thái ${r.roomName}`} value={r.maintenanceStatus || 'AVAILABLE'}
                      onChange={(e) => run(() => managerService.setRoomMaintenance(token, r.id, e.target.value), 'Đã đổi trạng thái phòng', 'Đổi trạng thái phòng thất bại')}>
                      {ROOM_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    )}
                  </td>
                  <td className={styles.td}>
                    <SportPicker categories={categories} sports={r.sports}
                      onSave={(ids) => run(() => managerService.setRoomSports(token, r.id, ids), 'Đã lưu môn của phòng', 'Lưu môn thất bại')} />
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      {r.archived ? (
                        <button type="button" className={styles.btnEdit} onClick={() => run(() => managerService.restoreRoom(token, r.id), 'Đã dùng lại phòng', 'Dùng lại phòng thất bại')}>Dùng lại</button>
                      ) : (
                        <>
                          <button type="button" className={styles.btnEdit} onClick={() => setEditing({ id: r.id, roomName: r.roomName || '', floor: r.floor || 'Tầng 1', capacity: r.capacity || 20, description: r.description || '' })}>Sửa</button>
                          <button type="button" className={styles.btnDanger} onClick={() => askDelete(r)}>Xóa</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleting}
        title={deleting?.usage.result === 'DELETED' ? 'Xóa phòng tập' : 'Ngừng sử dụng phòng'}
        message={!deleting ? '' : deleting.usage.result === 'DELETED'
          ? `Phòng "${deleting.room.roomName}" chưa từng được dùng nên sẽ bị xóa hẳn.`
          : `Phòng "${deleting.room.roomName}" đã có lớp hoặc buổi 1-1 dùng nên chỉ chuyển sang "Ngừng sử dụng", dữ liệu cũ vẫn giữ. Phòng sẽ không được xếp lịch mới.${deleting.usage.upcomingSessions > 0 ? ` Còn ${deleting.usage.upcomingSessions} buổi sắp tới vẫn học ở phòng này, hãy đổi phòng cho các buổi đó.` : ''}`}
        confirmText={deleting?.usage.result === 'DELETED' ? 'Xóa hẳn' : 'Ngừng sử dụng'}
        type="danger"
        onConfirm={() => { const d = deleting; setDeleting(null); run(() => managerService.deleteRoom(token, d.room.id), d.usage.result === 'DELETED' ? 'Đã xóa phòng' : 'Đã ngừng sử dụng phòng', 'Xóa phòng thất bại') }}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
