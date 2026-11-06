import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import styles from '../../css/manager/ManagerPackages.module.css'

const TIERS = [1, 2, 3, 4]
const EMPTY = { code: '', name: '', description: '', monthlyPrice: '', hasPersonalPlan: false }

// Gói hội viên: hệ thống có 4 hạng và mỗi hạng chỉ có một gói. Hạng đã có gói hiện quyền lợi và nút Sửa;
// hạng còn trống mời tạo gói ngay tại chỗ.
export default function PackagesTab({ packages, onDone, onEdit }) {
  const { token } = useAuth()
  const toast = useToast()
  const [creating, setCreating] = useState(null) // hạng đang mở form tạo
  const [form, setForm] = useState(EMPTY)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    try {
      await managerService.createPackage(token, {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        tierLevel: creating,
        monthlyPrice: Number(form.monthlyPrice),
        hasPersonalPlan: form.hasPersonalPlan,
      })
      toast.success('Đã tạo gói hội viên')
      setCreating(null)
      setForm(EMPTY)
      onDone()
    } catch (err) {
      toast.error(err.message || 'Tạo gói thất bại')
    }
  }

  const ladder = (tier) => (
    <div className={styles.tier}>
      <b>Hạng {tier}</b>
      <div className={styles.ladder} aria-hidden="true">{TIERS.map((n) => <u key={n} className={n <= tier ? styles.on : ''} />)}</div>
    </div>
  )

  return (
    <section>
      <p className={styles.lead}>Người đã mua giữ nguyên quyền lợi lúc mua, dù bạn sửa gói sau đó. Hệ thống có 4 hạng, mỗi hạng chỉ có một gói.</p>
      {TIERS.map((tier) => {
        const pkg = packages.find((p) => p.tierLevel === tier)
        if (!pkg) {
          return (
            <React.Fragment key={tier}>
              <div className={`${styles.row} ${styles.empty} ${creating === tier ? styles.open : ''}`}>
                {ladder(tier)}
                <p className={styles.free}>Hạng này còn trống</p>
                <button type="button" className={creating === tier ? styles.btnOutline : styles.btn} onClick={() => { setForm(EMPTY); setCreating(creating === tier ? null : tier) }}>
                  {creating === tier ? 'Đóng' : 'Tạo gói'}
                </button>
              </div>
              {creating === tier && (
                <form className={styles.panel} onSubmit={submit}>
                  <div className={styles.fields}>
                    <label>Mã gói<input required placeholder="Ví dụ: VANG" value={form.code} onChange={set('code')} /></label>
                    <label>Tên gói<input required value={form.name} onChange={set('name')} /></label>
                    <label>Giá mỗi tháng (đ)<input required type="number" min="0" value={form.monthlyPrice} onChange={set('monthlyPrice')} /></label>
                    <label className={styles.check}><input type="checkbox" checked={form.hasPersonalPlan} onChange={(e) => setForm({ ...form, hasPersonalPlan: e.target.checked })} /> Bài tập riêng từ coach</label>
                    <label className={styles.wide}>Mô tả quyền lợi<input value={form.description} onChange={set('description')} /></label>
                  </div>
                  <div className={styles.foot}>
                    <button type="button" className={styles.btnOutline} onClick={() => setCreating(null)}>Đóng</button>
                    <button type="submit" className={styles.btn}>Tạo gói hạng {tier}</button>
                  </div>
                </form>
              )}
            </React.Fragment>
          )
        }
        return (
          <div key={tier} className={styles.row}>
            {ladder(tier)}
            <div>
              <p className={styles.name}>{pkg.name}<span className={styles.code}>{pkg.code}</span></p>
              {pkg.description ? <p className={styles.meta}>{pkg.description}</p> : null}
            </div>
            <div className={styles.perks}>
              <span className={styles.perk}>Giảm học phí lớp {pkg.tuitionDiscountPct}%</span>
              <span className={styles.perk}>Giảm buổi 1-1 {pkg.oneOnOneDiscountPct}%</span>
              {pkg.hasPersonalPlan ? <span className={styles.perk}>Bài tập riêng</span> : null}
            </div>
            <div className={styles.price}><span className={styles.num}>{formatVND(pkg.monthlyPrice).replace(' đ', '')}</span><small>đ mỗi tháng</small></div>
            <button type="button" className={styles.btnOutline} onClick={() => onEdit(pkg)}>Sửa</button>
          </div>
        )
      })}
    </section>
  )
}
