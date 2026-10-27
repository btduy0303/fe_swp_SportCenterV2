import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Danh sách khoản hoàn tiền: chờ xử lý hoặc đã xong; xác nhận khi đã chuyển tiền cho hội viên
export default function RefundsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState('PENDING')
  const [refunds, setRefunds] = useState([])

  const load = useCallback(async () => {
    try {
      setRefunds(await managerService.getRefunds(token, status))
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách hoàn tiền')
    }
  }, [token, status, toast])

  useEffect(() => {
    load()
  }, [load])

  const complete = async (id) => {
    try {
      await managerService.completeRefund(token, id)
      toast.success('Đã xác nhận hoàn tiền')
      load()
    } catch (err) {
      toast.error(err.message || 'Xác nhận hoàn tiền thất bại')
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Hoàn Tiền</h2>
        <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">Chờ hoàn</option>
          <option value="DONE">Đã hoàn</option>
        </select>
      </div>
      {refunds.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Không có khoản hoàn tiền nào.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Hội viên</th>
                <th className={styles.th}>Hóa đơn</th>
                <th className={styles.th}>Số tiền</th>
                <th className={styles.th}>Lý do</th>
                <th className={styles.th}>Yêu cầu lúc</th>
                <th className={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id} className={styles.row}>
                  <td className={styles.td}><strong>{r.memberName}</strong><br />{r.memberEmail}</td>
                  <td className={styles.td}>{r.invoiceNumber}</td>
                  <td className={styles.td}>{formatVND(r.amount)} ({r.method})</td>
                  <td className={styles.td}>{r.reason}</td>
                  <td className={styles.td}>
                    {new Date(r.requestedAt).toLocaleString('vi-VN')}
                    {r.overdue && <span style={{ color: '#f87171', marginLeft: 6 }}>Quá hạn</span>}
                  </td>
                  <td className={styles.td}>
                    {r.status === 'PENDING'
                      ? <button type="button" className={styles.btnAction} onClick={() => complete(r.id)}>Xác nhận đã hoàn</button>
                      : `Xử lý bởi ${r.processedByName || ''}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
