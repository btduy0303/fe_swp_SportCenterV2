import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import styles from '../../css/manager/ManagerDashboard.module.css'

const KIND = { PERCENT: 'Giảm %', AMOUNT: 'Giảm tiền', FREE_ONE_ON_ONE: 'Tặng 1 buổi 1-1' }
const TARGET = { CLASS: 'học phí lớp', PACKAGE: 'giá gói', ONE_ON_ONE: 'buổi 1-1' }

// Các ưu đãi hệ thống tự phát: tên, lúc nào hội viên nhận, và khóa cấu hình tương ứng.
// whenKey: cấu hình số ngày nằm trong câu điều kiện (ví dụ gói còn dưới 7 ngày).
const AUTO = [
  { key: 'voucher.welcome', name: 'Chào mừng', when: 'Xác thực email xong' },
  { key: 'voucher.birthday_valid_days', name: 'Sinh nhật', when: 'Đến sinh nhật', daysOnly: true, discount: 'Theo gói: 10%, 20% hoặc 1 buổi 1-1' },
  { key: 'voucher.completion', name: 'Học xong lớp', when: 'Hoàn thành một lớp' },
  { key: 'voucher.early_renewal', name: 'Gia hạn sớm', before: 'Gói còn dưới', whenKey: 'voucher.early_renewal_days', after: 'ngày mà chưa gia hạn' },
  { key: 'voucher.winback', name: 'Quay lại tập', before: 'Gói đã hết hạn', whenKey: 'voucher.winback_after_days', after: 'ngày mà chưa mua lại' },
  { key: 'voucher.compensation', name: 'Bù lỗi trung tâm', when: 'Trung tâm gây lỗi cho hội viên, ví dụ hủy buổi' },
]

// Cấu hình voucher hệ thống tự tặng (chào mừng, sinh nhật, học xong lớp, gia hạn sớm, quay lại, bù lỗi)
export default function VoucherSettings() {
  const { token } = useAuth()
  const toast = useToast()
  const [values, setValues] = useState(null)
  const [drafts, setDrafts] = useState({})

  const load = useCallback(async () => {
    try {
      const list = await managerService.getVoucherSettings(token)
      const map = Object.fromEntries(list.map((r) => [r.key, typeof r.value === 'object' ? { ...r.value } : r.value]))
      setValues(map)
      setDrafts(map)
    } catch (err) {
      toast.error(err.message || 'Không thể tải cấu hình voucher')
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  const set = (key, patch) => setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }))
  const setNumber = (key, v) => setDrafts((d) => ({ ...d, [key]: v }))

  // Chỉ lưu những khóa của dòng này mà người dùng đã đổi
  const save = async (row) => {
    const keys = [row.key, row.whenKey].filter(Boolean)
    try {
      for (const key of keys) {
        const d = drafts[key]
        if (JSON.stringify(d) === JSON.stringify(values[key])) continue
        const value = typeof d === 'object'
          ? { kind: d.kind, value: Number(d.value), applies_to: d.applies_to, valid_days: Number(d.valid_days) }
          : Number(d)
        await managerService.updateVoucherSetting(token, key, value)
      }
      toast.success('Đã lưu, áp dụng cho voucher tặng từ bây giờ')
      load()
    } catch (err) {
      toast.error(err.message || 'Lưu cấu hình thất bại')
    }
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Voucher tự động</h2>
      <p className="text-muted">Hệ thống tự phát voucher khi hội viên đủ điều kiện. Thay đổi chỉ áp dụng cho voucher tặng từ lúc lưu.</p>
      {values === null ? <p className="text-muted">Đang tải...</p> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Ưu đãi</th><th className={styles.th}>Hội viên nhận khi</th><th className={styles.th}>Mức giảm</th><th className={styles.th}>Dùng trong</th><th className={styles.th} />
              </tr>
            </thead>
            <tbody>
              {AUTO.filter((r) => drafts[r.key] !== undefined).map((r) => {
                const d = drafts[r.key]
                const isObject = typeof d === 'object'
                return (
                  <tr key={r.key} className={styles.row}>
                    <td className={styles.td}><strong>{r.name}</strong></td>
                    <td className={styles.td}>
                      {r.whenKey ? (
                        <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {r.before}
                          <input type="number" min="1" aria-label={`${r.name}: số ngày`} className={styles.input} style={{ width: 70 }} value={drafts[r.whenKey] ?? ''} onChange={(e) => setNumber(r.whenKey, e.target.value)} />
                          {r.after}
                        </span>
                      ) : r.when}
                    </td>
                    <td className={styles.td}>
                      {isObject ? (
                        <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select aria-label={`${r.name}: loại giảm`} className={styles.select} value={d.kind} onChange={(e) => set(r.key, { kind: e.target.value })}>
                            {Object.entries(KIND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                          {d.kind !== 'FREE_ONE_ON_ONE' && <input type="number" min="0" aria-label={`${r.name}: mức giảm`} className={styles.input} style={{ width: 90 }} value={d.value} onChange={(e) => set(r.key, { value: e.target.value })} />}
                          <span>{d.kind === 'PERCENT' ? '% ' : ''}{TARGET[d.applies_to] || d.applies_to}</span>
                        </span>
                      ) : r.discount}
                    </td>
                    <td className={styles.td}>
                      <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input type="number" min="1" aria-label={`${r.name}: số ngày dùng`} className={styles.input} style={{ width: 80 }} value={isObject ? d.valid_days : d} onChange={(e) => (isObject ? set(r.key, { valid_days: e.target.value }) : setNumber(r.key, e.target.value))} />
                        ngày
                      </span>
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
