import React, { useEffect, useState } from 'react'
import styles from '../../css/common/ConfirmModal.module.css'

// Modal xác nhận thao tác cập nhật hoặc xóa với thời gian đếm ngược 3 giây an toàn
export default function ConfirmModal({
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
