import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import styles from '../../css/manager/ManagerDashboard.module.css'

const KIND = { PERCENT: 'Giảm %', AMOUNT: 'Giảm tiền', FREE_ONE_ON_ONE: 'Tặng 1 buổi 1-1' }
// Mô tả từ BE có kèm mã quy tắc nghiệp vụ nội bộ, không hiển thị cho người dùng
const clean = (text) => (text || '').replace(/\s*\(BR-[^)]*\)/g, '')

const TARGET = { CLASS: 'học phí lớp', PACKAGE: 'gói hội viên', ONE_ON_ONE: 'buổi 1-1' }

// Cấu hình voucher hệ thống tự tặng (hoàn thành lớp, bù lỗi, gia hạn sớm, quay lại, sinh nhật)
export default function VoucherSettings() {
  const { token } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [drafts, setDrafts] = useState({})

  const load = useCallback(async () => {
    try {
      const list = await managerService.getVoucherSettings(token)
      setRows(list)
      setDrafts(Object.fromEntries(list.map((r) => [r.key, typeof r.value === 'object' ? { ...r.value } : r.value])))
    } catch (err) {
      toast.error(err.message || 'Không thể tải cấu hình voucher')
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  const save = async (row) => {
    const d = drafts[row.key]
    const value = typeof d === 'object'
      ? { kind: d.kind, value: Number(d.value), applies_to: d.applies_to, valid_days: Number(d.valid_days) }
      : Number(d)
    try {
      await managerService.updateVoucherSetting(token, row.key, value)
      toast.success('Đã lưu cấu hình, áp dụng cho voucher tặng từ bây giờ')
      load()
    } catch (err) {
      toast.error(err.message || 'Lưu cấu hình thất bại')
    }
  }

  const set = (key, patch) => setDrafts({ ...drafts, [key]: { ...drafts[key], ...patch } })

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Cấu Hình Voucher Tự Động</h2>
      {rows === null ? <p style={{ color: 'var(--text-muted)' }}>Đang tải...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead><tr><th className={styles.th}>Cấu hình</th><th className={styles.th}>Giá trị</th><th className={styles.th} /></tr></thead>
            <tbody>
              {rows.map((r) => {
                const d = drafts[r.key]
                return (
                  <tr key={r.key} className={styles.row}>
                    <td className={styles.td}><strong>{clean(r.description) || r.key}</strong><br /><code style={{ color: 'var(--text-muted)' }}>{r.key}</code></td>
                    <td className={styles.td}>
                      {d !== undefined && typeof d === 'object' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <select className={styles.select} value={d.kind} onChange={(e) => set(r.key, { kind: e.target.value })}>
                            {Object.entries(KIND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                          <input type="number" min="0" className={styles.input} style={{ width: 100 }} value={d.value} onChange={(e) => set(r.key, { value: e.target.value })} />
                          <span>cho {TARGET[d.applies_to] || d.applies_to}, hạn</span>
                          <input type="number" min="1" className={styles.input} style={{ width: 90 }} value={d.valid_days} onChange={(e) => set(r.key, { valid_days: e.target.value })} />
                          <span>ngày</span>
                        </div>
                      ) : (
                        <input type="number" min="0" className={styles.input} style={{ width: 120 }} value={d ?? ''} onChange={(e) => setDrafts({ ...drafts, [r.key]: e.target.value })} />
                      )}
                    </td>
                    <td className={styles.td}><button type="button" className={styles.btnAction} onClick={() => save(r)}>Lưu</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
