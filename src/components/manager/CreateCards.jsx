import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Form tạo gói hội viên mới (hạng 1 đến 4, giá mỗi tháng)
export function PackageCreateCard({ packages = [], onDone }) {
  const { token } = useAuth()
  const toast = useToast()
  const empty = { code: '', name: '', description: '', tierLevel: 1, monthlyPrice: '', hasPersonalPlan: false }
  const [form, setForm] = useState(empty)
  // Mỗi hạng (1 đến 4) chỉ có một gói, nên chỉ cho tạo ở hạng còn trống
  const freeTiers = [1, 2, 3, 4].filter((t) => !packages.some((p) => p.tierLevel === t))

  const submit = async (e) => {
    e.preventDefault()
    try {
      await managerService.createPackage(token, {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        tierLevel: freeTiers.includes(Number(form.tierLevel)) ? Number(form.tierLevel) : freeTiers[0],
        monthlyPrice: Number(form.monthlyPrice),
        hasPersonalPlan: form.hasPersonalPlan,
      })
      toast.success('Đã tạo gói hội viên')
      setForm(empty)
      onDone()
    } catch (err) {
      toast.error(err.message || 'Tạo gói thất bại')
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Tạo Gói Hội Viên Mới</h2>
      {freeTiers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Hệ thống có 4 hạng gói và mỗi hạng chỉ có một gói; cả 4 hạng đã có gói. Muốn đổi giá hoặc quyền lợi, hãy sửa gói ở danh sách bên dưới.</p>
      ) : (
      <form onSubmit={submit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input required className={styles.input} placeholder="Mã gói (VD: VANG)" value={form.code} onChange={set('code')} />
        <input required className={styles.input} placeholder="Tên gói" value={form.name} onChange={set('name')} />
        <select className={styles.select} value={freeTiers.includes(Number(form.tierLevel)) ? form.tierLevel : freeTiers[0]} onChange={set('tierLevel')}>
          {freeTiers.map((t) => <option key={t} value={t}>Hạng {t}</option>)}
        </select>
        <input required type="number" min="0" className={styles.input} style={{ width: 180 }} placeholder="Giá mỗi tháng" value={form.monthlyPrice} onChange={set('monthlyPrice')} />
        <label style={{ fontSize: '0.9rem' }}>
          <input type="checkbox" checked={form.hasPersonalPlan} onChange={(e) => setForm({ ...form, hasPersonalPlan: e.target.checked })} /> Bài tập riêng từ coach
        </label>
        <input className={styles.input} style={{ flex: 1, minWidth: 240 }} placeholder="Mô tả quyền lợi" value={form.description} onChange={set('description')} />
        <button type="submit" className={styles.btnAction}>Tạo Gói</button>
      </form>
      )}
    </div>
  )
}
