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
  const [deleting, setDeleting] = useState(null)

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
        <h2 className={styles.cardTitle}>Danh Sách Phòng ({rooms.length})</h2>
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
              {rooms.map((r) => editing?.id === r.id ? (
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
                    <select className={`${styles.select} ${styles.tableSelect}`} aria-label={`Trạng thái ${r.roomName}`} value={r.maintenanceStatus || 'AVAILABLE'}
                      onChange={(e) => run(() => managerService.setRoomMaintenance(token, r.id, e.target.value), 'Đã đổi trạng thái phòng', 'Đổi trạng thái phòng thất bại')}>
                      {ROOM_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className={styles.td}>
                    <SportPicker categories={categories} sports={r.sports}
                      onSave={(ids) => run(() => managerService.setRoomSports(token, r.id, ids), 'Đã lưu môn của phòng', 'Lưu môn thất bại')} />
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button type="button" className={styles.btnEdit} onClick={() => setEditing({ id: r.id, roomName: r.roomName || '', floor: r.floor || 'Tầng 1', capacity: r.capacity || 20, description: r.description || '' })}>Sửa</button>
                      <button type="button" className={styles.btnDanger} onClick={() => setDeleting(r)}>Xóa</button>
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
        title="Xóa Phòng Tập"
        message={deleting ? `Xóa phòng "${deleting.roomName}"? Các lớp học đặt tại phòng này sẽ bị ảnh hưởng.` : ''}
        confirmText="Xóa Phòng"
        type="danger"
        onConfirm={() => { const r = deleting; setDeleting(null); run(() => managerService.deleteRoom(token, r.id), 'Đã xóa phòng', 'Xóa phòng thất bại') }}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
