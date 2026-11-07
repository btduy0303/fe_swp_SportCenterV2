import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { receptionistService } from '../../services/receptionistService'
import styles from '../../css/receptionist/Reception.module.css'

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—')
const initial = (name = '') => name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() || '?'
const stay = (a, b) => {
  const min = Math.round((new Date(b) - new Date(a)) / 60000)
  return min >= 60 ? `${Math.floor(min / 60)} giờ ${min % 60} phút` : `${min} phút`
}

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

  const inside = rows.filter((r) => !r.checkOutTime)
  const done = rows.filter((r) => r.checkOutTime)
  const avg = done.length ? Math.round(done.reduce((s, r) => s + (new Date(r.checkOutTime) - new Date(r.checkInTime)) / 60000, 0) / done.length) : null

  return (
    <div className={styles.wrap}>
      <form className={styles.panel} onSubmit={checkIn}>
        <h3>Check-in hội viên</h3>
        <div className={styles.fields}>
          <label className={styles.field}>Hội viên
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Chọn hội viên</option>
              {members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.fullName} · {m.phone || m.email}</option>)}
            </select>
          </label>
          <label className={styles.field}>Ghi chú (không bắt buộc)
            <input maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className={styles.foot}><button type="submit" className={styles.btn}>Check-in</button></div>
      </form>

      <div className={styles.stats}>
        <div className={styles.stat}><small>Lượt ra vào</small><b>{rows.length}</b><em>{date === todayStr() ? 'Hôm nay' : `Ngày ${date.split('-').reverse().join('/')}`}</em></div>
        <div className={styles.stat}><small>Đang ở trong</small><b>{inside.length}</b><em>Chưa check-out</em></div>
        <div className={styles.stat}><small>Thời gian tập trung bình</small><b>{avg == null ? '—' : `${avg}'`}</b><em>{done.length} lượt đã ra về</em></div>
      </div>

      <div className={styles.toolbar}>
        <input type="date" aria-label="Ngày" style={{ flex: 'none', minWidth: 0 }} value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="search" aria-label="Tìm theo tên" placeholder="Tìm theo tên hội viên" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {rows.length === 0 ? <p className={styles.empty}>Chưa có lượt ra vào nào.</p> : rows.map((r) => (
        <article key={r.id} className={styles.visit}>
          <span className={styles.avatar} aria-hidden="true">{initial(r.memberName)}</span>
          <div>
            <span className={styles.name}>{r.memberName}</span>
            <span className={styles.meta}>{r.memberEmail}{r.notes ? ` · ${r.notes}` : ''}</span>
          </div>
          <span className={styles.time}>{fmtTime(r.checkInTime)} – {r.checkOutTime ? fmtTime(r.checkOutTime) : '…'}<small>{r.checkOutTime ? stay(r.checkInTime, r.checkOutTime) : 'Đang ở trong'}</small></span>
          <span className={styles.meta}>{r.recordedByName ? `Ghi bởi ${r.recordedByName}` : ''}</span>
          {!r.checkOutTime ? <button type="button" className={`${styles.btnOutline} ${styles.sm}`} onClick={() => checkOut(r.id)}>Check-out</button> : <span className={`${styles.tag} ${styles.ok}`}>Đã ra về</span>}
        </article>
      ))}
    </div>
  )
}
