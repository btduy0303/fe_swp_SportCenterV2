import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import styles from '../../css/auth/Auth.module.css'

// Trang đăng nhập hệ thống
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

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
      toast.error(err.message || 'Email hoặc mật khẩu không chính xác')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.glow}></div>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brandBadge}>S</div>
          <h2 className={styles.title}>Đăng Nhập</h2>
          <p className={styles.subtitle}>Truy cập hệ thống quản lý Sport Center</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email tài khoản</label>
            <input
              type="email"
              required
              className={styles.input}
              placeholder="nhap.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Mật khẩu</label>
            <input
              type="password"
              required
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className={styles.footerText}>
          Chưa có tài khoản?
          <Link to="/register" className={styles.link}>Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  )
}
