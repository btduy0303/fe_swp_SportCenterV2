import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { receptionistService } from '../../services/receptionistService'
import styles from '../../css/manager/ManagerDashboard.module.css'

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—')

// Ghi hội viên vào/ra trung tâm; chỉ hội viên còn gói hợp lệ mới check-in được
export default function FacilityAttendanceTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [members, setMembers] = useState([])
  const [memberId, setMemberId] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(todayStr())
  const [name, setName] = useState('')
  const [rows, setRows] = useState([])

  const load = useCallback(async () => {
    try {
      setRows(await receptionistService.getFacilityAttendances(token, date, name))
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách ra vào')
    }
  }, [token, date, name, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    receptionistService.searchMembers(token, '').then(setMembers)
  }, [token])

  const checkIn = async (e) => {
    e.preventDefault()
    if (!memberId) {
      toast.error('Vui lòng chọn hội viên')
      return
    }
    try {
      await receptionistService.checkInMember(token, Number(memberId), notes)
      toast.success('Đã ghi nhận hội viên vào trung tâm')
      setMemberId('')
      setNotes('')
      load()
    } catch (err) {
      toast.error(err.message || 'Check-in thất bại')
    }
  }

  const checkOut = async (id) => {
    try {
      await receptionistService.checkOutMember(token, id)
      toast.success('Đã ghi nhận hội viên ra về')
      load()
    } catch (err) {
      toast.error(err.message || 'Check-out thất bại')
    }
  }

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Check-in Hội Viên</h2>
        <form onSubmit={checkIn}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Hội viên</label>
              <select className={styles.select} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">-- Chọn hội viên --</option>
                {members.filter((m) => m.active).map((m) => (
                  <option key={m.id} value={m.id}>#{m.id} - {m.fullName} ({m.phone || m.email})</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ghi chú (không bắt buộc)</label>
              <input className={styles.input} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn-primary">Check-in</button>
        </form>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Lượt Ra Vào Trong Ngày</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
            <input className={styles.input} placeholder="Tìm theo tên..." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-muted">Chưa có lượt ra vào nào.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Hội viên</th>
                  <th className={styles.th}>Giờ vào</th>
                  <th className={styles.th}>Giờ ra</th>
                  <th className={styles.th}>Ghi chú</th>
                  <th className={styles.th}>Người ghi</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={styles.row}>
                    <td className={styles.td}><strong>{r.memberName}</strong><br />{r.memberEmail}</td>
                    <td className={styles.td}>{fmtTime(r.checkInTime)}</td>
                    <td className={styles.td}>{r.checkOutTime ? fmtTime(r.checkOutTime) : <span className={styles.statusActive}>Đang ở trong</span>}</td>
                    <td className={styles.td}>{r.notes || '—'}</td>
                    <td className={styles.td}>{r.recordedByName || '—'}</td>
                    <td className={styles.td}>
                      {!r.checkOutTime && (
                        <button type="button" className={styles.btnAction} onClick={() => checkOut(r.id)}>Check-out</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
