import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { FormError, PasswordField, TextField, authMessage } from '../../components/auth/AuthFields'
import styles from '../../css/auth/Auth.module.css'

// Trang đăng nhập hệ thống
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await authService.login(email.trim(), password)
      // Lưu token vào context và xác định vai trò
      const token = data.jwtToken || data.token
      const me = await authService.getMe(token)
      login(token, me)

      toast.success(`Đăng nhập thành công! Chào mừng ${me.fullName}`)

      // Điều hướng tương ứng theo vai trò người dùng
      const role = me.roleCode || (me.role && (typeof me.role === 'string' ? me.role : me.role.code)) || 'MEMBER'
      if (role === 'MANAGER') {
        navigate('/manager')
      } else if (role === 'RECEPTIONIST') {
        navigate('/receptionist')
      } else if (role === 'COACH') {
        navigate('/coach')
      } else {
        navigate('/member')
      }
    } catch (err) {
      // BE chặn tài khoản chưa xác thực email (403): chuyển sang trang nhập mã
      if (err.message === 'Email is not verified') {
        toast.error('Email chưa được xác thực, vui lòng nhập mã xác thực.')
        navigate('/verify-email', { state: { email: email.trim() } })
      } else {
        setError(authMessage(err.message, 'Đăng nhập chưa được. Vui lòng thử lại.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.glow}></div>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brandBadge}>G6</div>
          <h2 className={styles.title}>Đăng Nhập</h2>
          <p className={styles.subtitle}>Vào khu vực hội viên G6 Sport Center</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextField label="Email" type="email" required placeholder="Nhập email của bạn" value={email} onChange={setEmail} autoComplete="username" />
          <PasswordField label="Mật khẩu" required placeholder="••••••••" value={password} onChange={setPassword} autoComplete="current-password" />
          <FormError message={error} />

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className={styles.footerText}>
          <Link to="/forgot-password" className={styles.link}>Quên mật khẩu?</Link>
        </div>
        <div className={styles.footerText}>
          Chưa có tài khoản?
          <Link to="/register" className={styles.link}>Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  )
}
