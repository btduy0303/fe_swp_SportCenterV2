import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import styles from '../../css/common/ConfirmModal.module.css'

// Đổi mật khẩu khi đã đăng nhập (mọi vai trò); mật khẩu mới 8 đến 72 ký tự
export default function ChangePasswordModal({ onClose }) {
  const { token } = useAuth()
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await authService.changePassword(token, currentPassword, newPassword)
      toast.success('Đã đổi mật khẩu')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Đổi mật khẩu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const input = { width: '100%', padding: '0.6rem 0.8rem', marginTop: 6, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className={styles.title}>Đổi mật khẩu</h3>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Mật khẩu hiện tại
          <input type="password" required style={input} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          Mật khẩu mới (8 đến 72 ký tự)
          <input type="password" required minLength={8} maxLength={72} style={input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Hủy</button>
          <button type="submit" className={styles.btnConfirm} disabled={saving}>{saving ? 'Đang lưu...' : 'Đổi mật khẩu'}</button>
        </div>
      </form>
    </div>
  )
}
