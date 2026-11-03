import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { FormError, PasswordField } from '../auth/AuthFields'
import styles from '../../css/common/ConfirmModal.module.css'

// Đổi mật khẩu khi đã đăng nhập (mọi vai trò); mật khẩu mới 8 đến 72 ký tự
export default function ChangePasswordModal({ onClose }) {
  const { token } = useAuth()
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError('Mật khẩu mới từ 8 đến 72 ký tự')
      return
    }
    setSaving(true)
    try {
      await authService.changePassword(token, currentPassword, newPassword)
      toast.success('Đã đổi mật khẩu')
      onClose()
    } catch (err) {
      setError(err.message || 'Đổi mật khẩu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <h3 className={styles.title}>Đổi mật khẩu</h3>
        <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
          <PasswordField label="Mật khẩu hiện tại" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <PasswordField label="Mật khẩu mới (8 đến 72 ký tự)" maxLength={72} value={newPassword} onChange={setNewPassword} rules={[[newPassword.length >= 8, 'Từ 8 ký tự']]} autoComplete="new-password" />
          <FormError message={error} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Hủy</button>
          <button type="submit" className={`${styles.btnConfirm} ${styles.btnConfirmUpdate}`} disabled={saving}>{saving ? 'Đang lưu...' : 'Đổi mật khẩu'}</button>
        </div>
      </form>
    </div>
  )
}
