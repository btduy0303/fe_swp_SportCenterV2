import React, { useEffect, useId, useRef, useState } from 'react'
import styles from '../../css/common/ConfirmModal.module.css'

// Hộp thoại xin lý do trước khi làm một việc không hoàn tác được (hủy buổi, đổi coach...).
// Hiện ngay giữa màn hình nên người dùng không phải tìm ô nhập ở chỗ khác; con trỏ nằm sẵn trong ô lý do.
export default function ReasonDialog({ isOpen, title, message, label = 'Lý do', confirmText = 'Xác nhận', minLength = 3, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  const input = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!isOpen) return
    setReason('')
    input.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  const ready = reason.trim().length >= minLength
  const submit = (e) => {
    e.preventDefault()
    if (ready) onConfirm(reason.trim())
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <form className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} onClick={(e) => e.stopPropagation()} onSubmit={submit}
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}>
        <h3 id={`${id}-t`} className={styles.title}>{title}</h3>
        {message && <p className={styles.message}>{message}</p>}
        <label htmlFor={`${id}-r`} style={{ display: 'block', margin: '0.75rem 0 0.35rem', fontSize: '0.85rem' }}>{label}</label>
        <input id={`${id}-r`} ref={input} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', font: 'inherit' }} />
        <p style={{ margin: '0.35rem 0 0', minHeight: '1.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {ready ? '' : `Nhập ít nhất ${minLength} ký tự để tiếp tục.`}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={onCancel}>Quay lại</button>
          <button type="submit" className={styles.btnConfirm} disabled={!ready}>{confirmText}</button>
        </div>
      </form>
    </div>
  )
}
