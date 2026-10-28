import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import CoachLeavePanel from './CoachLeavePanel'
import styles from '../../css/manager/ManagerDashboard.module.css'

const ROOM_STATUS = [['AVAILABLE', 'Sẵn sàng'], ['MAINTENANCE', 'Bảo trì'], ['CLOSED', 'Đóng cửa']]
const RANKS = [['COACH', 'Coach'], ['SENIOR', 'Senior'], ['MASTER', 'Master']]
const ids = (sports) => (sports || []).map((s) => s.id)
// Có thay đổi so với môn đang lưu và còn ít nhất một môn thì mới cho lưu
const canSave = (current = [], saved) => current.length > 0 && (current.length !== saved.length || current.some((id) => !saved.includes(id)))
const hint = { color: 'var(--text-muted)', marginBottom: '1rem' }

// part="rooms": trạng thái và môn của phòng. part="coaches": hạng, môn dạy, nghỉ dài ngày, hủy suất 1-1 của coach
export default function ResourcesTab({ part, onOpenClass }) {
  const { token } = useAuth()
  const toast = useToast()
  const [rooms, setRooms] = useState([])
  const [coaches, setCoaches] = useState([])
  const [categories, setCategories] = useState([])
  const [roomSports, setRoomSports] = useState({})
  const [coachSports, setCoachSports] = useState({})

  const load = async () => {
    try {
      const [r, a, c] = await Promise.all([
        managerService.getRooms(token),
        managerService.getAccounts(token),
        managerService.getCategories(token),
      ])
      const coachList = a.filter((u) => u.role === 'COACH')
      setRooms(r)
      setCoaches(coachList)
      setCategories(c)
      setRoomSports(Object.fromEntries(r.map((x) => [x.id, ids(x.sports)])))
      setCoachSports(Object.fromEntries(coachList.map((x) => [x.id, ids(x.sports)])))
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
      {part === 'rooms' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Trạng Thái Và Môn Của Từng Phòng</h2>
          <p style={hint}>Chọn phòng đang sẵn sàng, bảo trì hay đóng cửa. Các ô đã tick là môn phòng đó đang dùng được; sửa ô tick rồi bấm "Lưu môn". Phòng chỉ xếp được lớp thuộc môn đã tick.</p>
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
                      <button type="button" className={styles.btnAction} style={{ whiteSpace: 'nowrap' }} disabled={!canSave(roomSports[r.id], ids(r.sports))}
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
      )}

      {part === 'coaches' && (
        <>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Danh Sách Coach</h2>
            <p style={hint}>Hạng và các môn mỗi coach đang dạy (ô đã tick). Sửa ô tick rồi bấm "Lưu môn". Coach chỉ xếp được vào lớp thuộc môn đã tick.</p>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Coach</th>
                    <th className={styles.th}>Hạng</th>
                    <th className={styles.th}>Môn được dạy</th>
                    <th className={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((c) => (
                    <tr key={c.id} className={styles.row}>
                      <td className={styles.td}><strong>{c.fullName}</strong><br />{c.email}</td>
                      <td className={styles.td}>
                        <select className={styles.select} style={{ minWidth: 120 }} value={c.coachRank || 'COACH'} onChange={(e) => run(() => managerService.setCoachRank(token, c.id, e.target.value), 'Đã đổi hạng coach', 'Đổi hạng thất bại')}>
                          {RANKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                      <td className={styles.td}>{sportChecks(coachSports, setCoachSports, c.id)}</td>
                      <td className={styles.td}>
                        <button type="button" className={styles.btnAction} style={{ whiteSpace: 'nowrap' }} disabled={!canSave(coachSports[c.id], ids(c.sports))}
                          onClick={() => run(() => managerService.setCoachSports(token, c.id, coachSports[c.id]), 'Đã lưu môn của coach', 'Lưu môn thất bại')}>
                          Lưu môn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <CoachLeavePanel coaches={coaches} onOpenClass={onOpenClass} />
        </>
      )}

    </>
  )
}
