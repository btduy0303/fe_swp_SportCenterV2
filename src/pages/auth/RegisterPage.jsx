import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import styles from '../../css/auth/Auth.module.css'

// Trang đăng ký tài khoản hội viên mới
export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)

  const toast = useToast()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await authService.register(formData)
      toast.success('Đăng ký thành công! Nhập mã xác thực đã gửi qua email.')
      setTimeout(() => {
        navigate('/verify-email', { state: { email: formData.email.trim() } })
      }, 1200)
    } catch (err) {
      toast.error(err.message || 'Đăng ký không thành công')
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
          <h2 className={styles.title}>Đăng Ký Hội Viên</h2>
          <p className={styles.subtitle}>Tạo tài khoản để tham gia tập luyện tại Sport Center</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Họ và tên</label>
            <input
              type="text"
              name="fullName"
              required
              className={styles.input}
              placeholder="Nguyễn Văn A"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              required
              className={styles.input}
              placeholder="nguyenvana@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Số điện thoại</label>
            <input
              type="tel"
              name="phone"
              required
              className={styles.input}
              placeholder="0912345678"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Mật khẩu</label>
            <input
              type="password"
              name="password"
              required
              className={styles.input}
              minLength={8}
              maxLength={72}
              placeholder="Tối thiểu 8 ký tự"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký Ngay'}
          </button>
        </form>

        <div className={styles.footerText}>
          Đã có tài khoản?
          <Link to="/login" className={styles.link}>Đăng nhập</Link>
        </div>
      </div>
    </div>
  )
}
