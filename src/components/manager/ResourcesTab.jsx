import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import styles from '../../css/manager/ManagerDashboard.module.css'

const ROOM_STATUS = [['AVAILABLE', 'Sẵn sàng'], ['MAINTENANCE', 'Bảo trì'], ['CLOSED', 'Đóng cửa']]
const RANKS = [['COACH', 'Coach'], ['SENIOR', 'Senior'], ['MASTER', 'Master']]

// Phòng (trạng thái, môn được dạy) và coach (hạng, môn dạy, nghỉ dài ngày, hủy suất 1-1)
export default function ResourcesTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [rooms, setRooms] = useState([])
  const [coaches, setCoaches] = useState([])
  const [categories, setCategories] = useState([])
  const [roomSports, setRoomSports] = useState({})
  const [coachSports, setCoachSports] = useState({})
  const [leave, setLeave] = useState({ coachId: '', from: '', to: '', reason: '' })

  const load = async () => {
    try {
      const [r, a, c] = await Promise.all([
        managerService.getRooms(token),
        managerService.getAccounts(token),
        managerService.getCategories(token),
      ])
      setRooms(r)
      setCoaches(a.filter((u) => u.role === 'COACH'))
      setCategories(c)
    } catch (err) {
      toast.error(err.message || 'Không thể tải phòng và coach')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const run = async (action, okMsg, failMsg) => {
    try {
      await action()
      toast.success(okMsg)
      load()
    } catch (err) {
      toast.error(err.message || failMsg)
    }
  }

  const toggle = (state, setState, id, catId) => {
    const cur = new Set(state[id] || [])
    if (cur.has(catId)) cur.delete(catId)
    else cur.add(catId)
    setState({ ...state, [id]: [...cur] })
  }

  const sportChecks = (state, setState, id) => (
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
      {categories.map((c) => (
        <label key={c.id} style={{ fontSize: '0.85rem' }}>
          <input type="checkbox" checked={(state[id] || []).includes(c.id)} onChange={() => toggle(state, setState, id, c.id)} /> {c.name}
        </label>
      ))}
    </div>
  )

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Phòng Tập</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Lưu môn sẽ thay thế toàn bộ môn đang gán cho phòng, nên hãy tick đủ các môn phòng đó dạy.</p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className={styles.row}>
                  <td className={styles.td}><strong>{r.roomName}</strong><br />{r.floor} · {r.capacity} chỗ</td>
                  <td className={styles.td}>
                    <select className={styles.select} value={r.maintenanceStatus}
                      onChange={(e) => run(() => managerService.setRoomMaintenance(token, r.id, e.target.value), 'Đã đổi trạng thái phòng', 'Đổi trạng thái phòng thất bại')}>
                      {ROOM_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className={styles.td}>{sportChecks(roomSports, setRoomSports, r.id)}</td>
                  <td className={styles.td}>
                    <button type="button" className={styles.btnAction} disabled={!(roomSports[r.id] || []).length}
                      onClick={() => run(() => managerService.setRoomSports(token, r.id, roomSports[r.id]), 'Đã lưu môn của phòng', 'Lưu môn thất bại')}>
                      Lưu môn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Coach</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id} className={styles.row}>
                  <td className={styles.td}><strong>{c.fullName}</strong><br />{c.email}</td>
                  <td className={styles.td}>
                    <select className={styles.select} defaultValue="" onChange={(e) => e.target.value && run(() => managerService.setCoachRank(token, c.id, e.target.value), 'Đã đổi hạng coach', 'Đổi hạng thất bại')}>
                      <option value="">Đổi hạng...</option>
                      {RANKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className={styles.td}>{sportChecks(coachSports, setCoachSports, c.id)}</td>
                  <td className={styles.td}>
                    <button type="button" className={styles.btnAction} disabled={!(coachSports[c.id] || []).length}
                      onClick={() => run(() => managerService.setCoachSports(token, c.id, coachSports[c.id]), 'Đã lưu môn của coach', 'Lưu môn thất bại')}>
                      Lưu môn
                    </button>{' '}
                    <button type="button" className={styles.btnDanger}
                      onClick={() => run(() => managerService.cancelCoachSlots(token, c.id, 'Trung tâm hủy suất 1-1 của coach'), 'Đã hủy các suất 1-1 của coach', 'Hủy suất thất bại')}>
                      Hủy suất 1-1
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Coach Nghỉ Dài Ngày</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(() => managerService.coachLeave(token, leave.coachId, { from: leave.from, to: leave.to, reason: leave.reason }), 'Đã ghi nhận coach nghỉ, các buổi trong khoảng này đã được hủy', 'Ghi nhận thất bại')
          }}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
        >
          <select required className={styles.select} value={leave.coachId} onChange={(e) => setLeave({ ...leave, coachId: e.target.value })}>
            <option value="">Chọn coach</option>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <input required type="date" className={styles.input} value={leave.from} onChange={(e) => setLeave({ ...leave, from: e.target.value })} />
          <input required type="date" className={styles.input} value={leave.to} onChange={(e) => setLeave({ ...leave, to: e.target.value })} />
          <input required className={styles.input} placeholder="Lý do" value={leave.reason} onChange={(e) => setLeave({ ...leave, reason: e.target.value })} />
          <button type="submit" className={styles.btnDanger}>Ghi nhận nghỉ</button>
        </form>
      </div>
    </>
  )
}
