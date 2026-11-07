import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import ConfirmModal from '../common/ConfirmModal'
import styles from '../../css/manager/ManagerPackages.module.css'

const EMPTY = { code: '', name: '', description: '', monthlyPrice: '', hasPersonalPlan: false, tuitionDiscountPct: 0, oneOnOneDiscountPct: 0, waitlistPriority: 0 }

// Gói hội viên: mỗi hạng chỉ có một gói. Hạng đã có gói hiện quyền lợi và nút Sửa;
// hạng còn trống mời tạo gói ngay tại chỗ, luôn còn một hạng trống phía trên để thêm gói mới.
export default function PackagesTab({ packages, onDone, onEdit }) {
  const { token } = useAuth()
  const toast = useToast()
  const [creating, setCreating] = useState(null) // hạng đang mở form tạo
  const [form, setForm] = useState(EMPTY)
  const [deleting, setDeleting] = useState(null) // gói đang chờ xác nhận xóa
  const top = Math.max(4, ...packages.map((p) => p.tierLevel)) + 1
  const TIERS = Array.from({ length: top }, (_, i) => i + 1)
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
        tuitionDiscountPct: Number(form.tuitionDiscountPct),
        oneOnOneDiscountPct: Number(form.oneOnOneDiscountPct),
        waitlistPriority: Number(form.waitlistPriority),
      })
      toast.success('Đã tạo gói hội viên')
      setCreating(null)
      setForm(EMPTY)
      onDone()
    } catch (err) {
      toast.error(err.message || 'Tạo gói thất bại')
    }
  }

  const toggleActive = async (pkg) => {
    try {
      await managerService.setPackageActive(token, pkg.id, !pkg.isActive)
      toast.success(pkg.isActive ? 'Đã ẩn gói, khách không còn thấy gói này' : 'Đã hiện lại gói')
      onDone()
    } catch (err) {
      toast.error(err.message || 'Đổi trạng thái gói thất bại')
    }
  }

  const confirmDelete = async () => {
    const pkg = deleting
    setDeleting(null)
    try {
      await managerService.deletePackage(token, pkg.id)
      toast.success('Đã xóa gói')
      onDone()
    } catch (err) {
      toast.error(err.message || 'Xóa gói thất bại')
    }
  }

  // Gợi ý khoảng được phép: gói mới phải nằm giữa hạng ngay dưới và hạng ngay trên (BE chặn nếu sai)
  const range = (tier) => {
    const lower = [...packages].filter((p) => p.tierLevel < tier).sort((a, b) => b.tierLevel - a.tierLevel)[0]
    const upper = [...packages].filter((p) => p.tierLevel >= tier).sort((a, b) => a.tierLevel - b.tierLevel)[0]
    const text = (p) => `hạng ${p.tierLevel} ${p.name}: ${formatVND(p.monthlyPrice)}/tháng, giảm lớp ${p.tuitionDiscountPct}%, giảm 1-1 ${p.oneOnOneDiscountPct}%, ưu tiên chờ ${p.waitlistPriority}${p.hasPersonalPlan ? ', có bài tập riêng' : ''}`
    if (!lower && !upper) return null
    return `Quyền lợi và giá phải nằm giữa các hạng bên cạnh. ${lower ? `Hạng dưới là ${text(lower)}.` : ''} ${upper ? `Hạng trên là ${text(upper)}.` : ''}`
  }

  const createForm = (tier, insert = false) => (
                <form className={styles.panel} onSubmit={submit}>
                  {range(tier) && <p className={styles.lead}>{range(tier)}</p>}
                  <div className={styles.fields}>
                    <label>Mã gói<input required placeholder="Ví dụ: VANG" value={form.code} onChange={set('code')} /></label>
                    <label>Tên gói<input required value={form.name} onChange={set('name')} /></label>
                    <label>Giá mỗi tháng (đ)<input required type="number" min="0" value={form.monthlyPrice} onChange={set('monthlyPrice')} /></label>
                    <label>Giảm học phí lớp (%)<input type="number" min="0" max="100" value={form.tuitionDiscountPct} onChange={set('tuitionDiscountPct')} /></label>
                    <label>Giảm buổi 1-1 (%)<input type="number" min="0" max="100" value={form.oneOnOneDiscountPct} onChange={set('oneOnOneDiscountPct')} /></label>
                    <label>Ưu tiên hàng chờ (0 = không)<input type="number" min="0" value={form.waitlistPriority} onChange={set('waitlistPriority')} /></label>
                    <label className={styles.check}><input type="checkbox" checked={form.hasPersonalPlan} onChange={(e) => setForm({ ...form, hasPersonalPlan: e.target.checked })} /> Bài tập riêng từ coach</label>
                    <label className={styles.wide}>Mô tả quyền lợi<input value={form.description} onChange={set('description')} /></label>
                  </div>
                  <div className={styles.foot}>
                    <button type="button" className={styles.btnOutline} onClick={() => setCreating(null)}>Đóng</button>
                    <button type="submit" className={styles.btn}>{insert ? `Chèn gói vào hạng ${tier}` : `Tạo gói hạng ${tier}`}</button>
                  </div>
                </form>
  )

  const ladder = (tier) => (
    <div className={styles.tier}>
      <b>Hạng {tier}</b>
      <div className={styles.ladder} aria-hidden="true">{TIERS.map((n) => <u key={n} className={n <= tier ? styles.on : ''} />)}</div>
    </div>
  )

  return (
    <section>
      <p className={styles.lead}>Người đã mua giữ nguyên quyền lợi lúc mua, dù bạn sửa gói sau đó. Mỗi hạng chỉ có một gói, bạn có thể thêm hạng mới ở cuối.</p>
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
              {creating === tier && createForm(tier)}
            </React.Fragment>
          )
        }
        return (
          <React.Fragment key={tier}>
          <div className={`${styles.row} ${creating === tier ? styles.open : ''}`}>
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
            <div className={styles.actions}>
              <button type="button" className={styles.btnOutline} onClick={() => onEdit(pkg)}>Sửa</button>
              <button type="button" className={styles.btnOutline} onClick={() => { setForm(EMPTY); setCreating(tier) }}>Chèn gói vào hạng {tier}</button>
              <button type="button" className={styles.btnOutline} onClick={() => toggleActive(pkg)}>{pkg.isActive ? 'Ẩn gói' : 'Hiện lại'}</button>
              <button type="button" className={styles.btnOutline} onClick={() => setDeleting(pkg)}>Xóa</button>
            </div>
          </div>
          {creating === tier && createForm(tier, true)}
          </React.Fragment>
        )
      })}
      <ConfirmModal isOpen={!!deleting} title="Xóa gói hội viên" type="danger" confirmText="Xóa gói"
        message={deleting ? `Xóa hẳn gói "${deleting.name}"? Chỉ xóa được gói chưa ai mua. Gói đã có người mua thì hãy chọn Ẩn gói.` : ''}
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </section>
  )
}
