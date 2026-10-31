import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import CoachLeavePanel from './CoachLeavePanel'
import SportPicker from './SportPicker'
import styles from '../../css/manager/ManagerDashboard.module.css'

const RANKS = [['COACH', 'Coach'], ['SENIOR', 'Senior'], ['MASTER', 'Master']]

// Coach: hạng, môn dạy; bên dưới là phần coach nghỉ (tìm người dạy thay, hủy suất 1-1)
export default function ResourcesTab({ onOpenClass }) {
  const { token } = useAuth()
  const toast = useToast()
  const [coaches, setCoaches] = useState([])
  const [categories, setCategories] = useState([])

  const load = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([managerService.getAccounts(token), managerService.getCategories(token)])
      setCoaches(a.filter((u) => u.role === 'COACH'))
      setCategories(c)
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách coach')
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

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

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Danh Sách Coach ({coaches.length})</h2>
        <p className={styles.hint}>Hạng quyết định giá buổi 1-1. Coach chỉ xếp được vào lớp và buổi 1-1 thuộc môn đã gán.</p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Coach</th>
                <th className={styles.th}>Hạng</th>
                <th className={styles.th}>Môn được dạy</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id} className={styles.row}>
                  <td className={styles.td}><strong>{c.fullName}</strong><br /><span className={styles.hint}>{c.email}</span></td>
                  <td className={styles.td}>
                    <select className={`${styles.select} ${styles.tableSelect}`} aria-label={`Hạng ${c.fullName}`} value={c.coachRank || 'COACH'} onChange={(e) => run(() => managerService.setCoachRank(token, c.id, e.target.value), 'Đã đổi hạng coach', 'Đổi hạng thất bại')}>
                      {RANKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className={styles.td}>
                    <SportPicker categories={categories} sports={c.sports}
                      onSave={(ids) => run(() => managerService.setCoachSports(token, c.id, ids), 'Đã lưu môn của coach', 'Lưu môn thất bại')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <details className={styles.card}>
        <summary className={styles.cardTitle} style={{ cursor: 'pointer' }}>Coach Nghỉ: Tìm Người Dạy Thay</summary>
        <CoachLeavePanel coaches={coaches} onOpenClass={onOpenClass} />
      </details>
    </>
  )
}
