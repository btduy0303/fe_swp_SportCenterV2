import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { scheduleService } from '../../services/scheduleService'
import { DAY_VI } from '../common/WeeklySchedule'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Lịch dạy cố định hằng tuần của coach (thứ, giờ, phòng, lớp)
export function CoachWeeklySchedule() {
  const { token } = useAuth()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    scheduleService.getMyCoachSchedules(token).then((r) => setRows(Array.isArray(r) ? r : [])).catch(() => setRows([]))
  }, [token])

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Lịch Dạy Hằng Tuần</h2>
      {rows === null ? <p style={{ color: 'var(--text-muted)' }}>Đang tải...</p> : rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Bạn chưa được phân công lịch dạy cố định nào.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Thứ</th>
                <th className={styles.th}>Giờ</th>
                <th className={styles.th}>Lớp</th>
                <th className={styles.th}>Phòng</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={styles.row}>
                  <td className={styles.td}>{DAY_VI[r.dayOfWeek] || r.dayOfWeekName}</td>
                  <td className={styles.td}>{String(r.startTime).slice(0, 5)} - {String(r.endTime).slice(0, 5)}</td>
                  <td className={styles.td}><strong>{r.className}</strong> ({r.categoryName})</td>
                  <td className={styles.td}>{r.roomName}, {r.floor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Hồ sơ coach: chuyên môn, số năm kinh nghiệm, chứng chỉ (căn cứ để manager xếp hạng coach)
export function CoachProfileCard() {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ specialty: '', yearsExperience: '', certifications: '' })
  const [rank, setRank] = useState('')

  useEffect(() => {
    authService.getMe(token).then((me) => {
      const p = me?.coachProfile || {}
      setForm({ specialty: p.specialty || '', yearsExperience: p.yearsExperience ?? '', certifications: p.certifications || '' })
      setRank(p.coachRank || p.rank || '')
    }).catch(() => {})
  }, [token])

  const save = async (e) => {
    e.preventDefault()
    try {
      await authService.updateCoachProfile(token, {
        specialty: form.specialty,
        yearsExperience: form.yearsExperience === '' ? null : Number(form.yearsExperience),
        certifications: form.certifications,
      })
      toast.success('Đã cập nhật hồ sơ coach')
    } catch (err) {
      toast.error(err.message || 'Cập nhật hồ sơ thất bại')
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Hồ Sơ Coach{rank ? ` · hạng ${rank}` : ''}</h2>
      <form onSubmit={save} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input className={styles.input} placeholder="Chuyên môn" value={form.specialty} onChange={set('specialty')} />
        <input type="number" min="0" className={styles.input} style={{ width: 160 }} placeholder="Năm kinh nghiệm" value={form.yearsExperience} onChange={set('yearsExperience')} />
        <input className={styles.input} style={{ flex: 1, minWidth: 260 }} placeholder="Chứng chỉ" value={form.certifications} onChange={set('certifications')} />
        <button type="submit" className={styles.btnAction}>Lưu Hồ Sơ</button>
      </form>
    </div>
  )
}
