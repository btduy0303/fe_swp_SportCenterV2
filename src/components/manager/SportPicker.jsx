import React, { useState } from 'react'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Môn của một phòng hoặc coach: bình thường chỉ hiện tên môn, bấm "Sửa môn" mới mở ô tick để dòng bảng luôn gọn
export default function SportPicker({ categories, sports, onSave }) {
  const saved = (sports || []).map((s) => s.id)
  const [editing, setEditing] = useState(null) // danh sách id đang tick, null khi không sửa

  if (!editing) {
    return (
      <div className={styles.pickerView}>
        <span>{saved.length ? (sports || []).map((s) => s.name).join(', ') : 'Chưa gán môn'}</span>
        <button type="button" className={styles.btnEdit} onClick={() => setEditing(saved)}>Sửa môn</button>
      </div>
    )
  }

  const toggle = (id) => setEditing(editing.includes(id) ? editing.filter((x) => x !== id) : [...editing, id])
  const changed = editing.length !== saved.length || editing.some((id) => !saved.includes(id))
  return (
    <div className={styles.pickerEdit}>
      <div className={styles.pickerChecks}>
        {categories.map((c) => (
          <label key={c.id}><input type="checkbox" checked={editing.includes(c.id)} onChange={() => toggle(c.id)} /> {c.name}</label>
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.btnAction} disabled={!changed || editing.length === 0}
          onClick={async () => { if (await onSave(editing)) setEditing(null) }}>Lưu môn</button>
        <button type="button" className={styles.btnEdit} onClick={() => setEditing(null)}>Hủy</button>
      </div>
    </div>
  )
}
