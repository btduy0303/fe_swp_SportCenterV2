import React, { useEffect, useId, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import styles from '../../css/common/ConfirmModal.module.css'

// Modal xác nhận thao tác cập nhật hoặc xóa với thời gian đếm ngược 3 giây an toàn
export default function ConfirmModal(props) {
  if (props.variant === 'training') return props.isOpen ? <TrainingConfirmation {...props} /> : null
  return <LegacyConfirmation {...props} />
}

function TrainingConfirmation({ title = 'Xác nhận thao tác', message, confirmText = 'Xác nhận', cancelText = 'Quay lại', type = 'primary', onConfirm, onCancel }) {
  const dialog = useRef(null)
  const titleId = useId()
  const messageId = useId()
  const [countdown, setCountdown] = useState(3)
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setInterval(() => setCountdown(n => Math.max(0, n - 1)), 1000)
    return () => { clearInterval(timer); element.close(); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus() }
  }, [])
  return <dialog ref={dialog} className={styles.trainingDialog} aria-labelledby={titleId} aria-describedby={messageId} onCancel={e => { e.preventDefault(); onCancel() }} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
    <span className={styles.trainingIcon}><CircleHelp size={24} aria-hidden="true" /></span><h3 id={titleId}>{title}</h3><p id={messageId}>{message}</p>
    <div className={styles.trainingActions}><button type="button" autoFocus onClick={onCancel}>{cancelText}</button><button type="button" data-type={type} disabled={countdown > 0} onClick={() => { if (!countdown) onConfirm?.() }}>{countdown > 0 ? `${confirmText} (${countdown}s)` : confirmText}</button></div>
  </dialog>
}

function LegacyConfirmation({
  isOpen,
  title = 'Xác Nhận Thao Tác',
  message = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
  confirmText = 'Xác Nhận',
  cancelText = 'Hủy Bỏ',
  type = 'danger', // 'danger' cho xóa hoặc 'primary' cho cập nhật
  onConfirm,
  onCancel,
}) {
  const [countdown, setCountdown] = useState(3)

  // Khởi động đếm ngược 3 giây mỗi khi modal được mở ra
  useEffect(() => {
    if (!isOpen) return

    setCountdown(3)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={onCancel}>
            {cancelText}
          </button>

          <button
            type="button"
            className={`${styles.btnConfirm} ${type === 'primary' ? styles.btnConfirmUpdate : ''}`}
            disabled={countdown > 0}
            onClick={() => {
              if (countdown === 0 && onConfirm) {
                onConfirm()
              }
            }}
          >
            {countdown > 0 ? `${confirmText} (${countdown}s)` : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
