import React, { useState } from 'react'
import styles from '../../css/manager/ManagerAccounts.module.css'

const GROUPS = [['COACH', 'Huấn luyện viên'], ['RECEPTIONIST', 'Lễ tân'], ['MANAGER', 'Quản lý']]
const initial = (name = '') => name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() || '?'

// Tài khoản nhân sự: nhóm theo vai trò. Form tạo mới mở ra khi bấm nút, tạo xong thì tự đóng.
// Các hàm tạo, sửa, khóa, mở khóa do trang cha giữ (có hộp xác nhận); onCreate trả true khi tạo thành công.
export default function AccountsTab({ accounts, categories, form, setForm, coachSports, setCoachSports, onCreate, onEdit, onDeactivate, onActivate }) {
  const [open, setOpen] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const toggleSport = (id) => setCoachSports((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const submit = async (e) => {
    if (await onCreate(e)) setOpen(false)
  }

  return (
    <section>
      <div className={styles.top}>
        <span className={styles.lead} />
        <button type="button" className={open ? styles.btnOutline : styles.btn} onClick={() => setOpen(!open)}>{open ? 'Đóng' : '+ Tạo tài khoản'}</button>
      </div>

      {open && (
        <form className={styles.panel} onSubmit={submit}>
          <h3>Tạo tài khoản nhân viên hoặc huấn luyện viên</h3>
          <div className={styles.fields}>
            <label>Họ và tên<input type="text" required value={form.fullName} onChange={set('fullName')} /></label>
            <label>Email<input type="email" required value={form.email} onChange={set('email')} /></label>
            <label>Số điện thoại<input type="tel" required value={form.phone} onChange={set('phone')} /></label>
            <label>Mật khẩu<input type="password" required value={form.password} onChange={set('password')} /></label>
            <label>Vai trò
              <select value={form.roleCode} onChange={set('roleCode')}>
                <option value="COACH">Huấn luyện viên</option>
                <option value="RECEPTIONIST">Lễ tân</option>
              </select>
            </label>
            {form.roleCode === 'COACH' && (
              <label className={styles.wide}>Môn coach được dạy (chọn ít nhất 1)
                <span className={styles.sports}>
                  {categories.map((c) => (
                    <label key={c.id}><input type="checkbox" checked={coachSports.includes(c.id)} onChange={() => toggleSport(c.id)} /> {c.name}</label>
                  ))}
                </span>
              </label>
            )}
          </div>
          <div className={styles.foot}>
            <button type="button" className={styles.btnOutline} onClick={() => setOpen(false)}>Đóng</button>
            <button type="submit" className={styles.btn}>Tạo tài khoản</button>
          </div>
        </form>
      )}

      {GROUPS.map(([role, label]) => {
        const list = accounts.filter((a) => (a.role?.code || a.role) === role)
        if (list.length === 0) return null
        return (
          <div key={role}>
            <p className={styles.head}><b>{label}</b> · {list.length}</p>
            {list.map((acc) => {
              const active = acc.active !== undefined ? acc.active : acc.isActive
              return (
                <article key={acc.id} className={`${styles.row} ${active ? '' : styles.off}`}>
                  <span className={styles.avatar} aria-hidden="true">{initial(acc.fullName)}</span>
                  <div>
                    <p className={styles.name}>{acc.fullName}</p>
                    <p className={styles.meta}>{acc.email}{acc.phone ? ` · ${acc.phone}` : ''}{role === 'COACH' && acc.sports?.length ? ` · ${acc.sports.map((s) => s.name).join(', ')}` : ''}</p>
                  </div>
                  <span className={`${styles.tag} ${active ? styles.on : styles.locked}`}>{active ? 'Hoạt động' : 'Đã khóa'}</span>
                  <div className={styles.actions}>
                    <button type="button" className={styles.btnOutline} onClick={() => onEdit(acc)}>Sửa</button>
                    {role === 'MANAGER' ? <span className={styles.fixed}>Cố định</span>
                      : active ? <button type="button" className={styles.btnDanger} onClick={() => onDeactivate(acc.id, acc.email)}>Khóa</button>
                        : <button type="button" className={styles.btnOutline} onClick={() => onActivate(acc.id, acc.email)}>Kích hoạt</button>}
                  </div>
                </article>
              )
            })}
          </div>
        )
      })}
    </section>
  )
}
