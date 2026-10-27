import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import styles from '../../css/auth/Auth.module.css'

// Trang nhập mã 6 số gửi qua email sau khi đăng ký; chưa xác thực thì không đăng nhập được
export default function VerifyEmailPage() {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.verifyEmail(email.trim(), code.trim())
      toast.success('Xác thực email thành công! Bạn có thể đăng nhập.')
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Xác thực email không thành công')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error('Vui lòng nhập email để nhận lại mã')
      return
    }
    try {
      await authService.resendVerification(email.trim())
      toast.success('Đã gửi lại mã xác thực, vui lòng kiểm tra hộp thư')
    } catch (err) {
      toast.error(err.message || 'Không thể gửi lại mã')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.glow}></div>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brandBadge}>S</div>
          <h2 className={styles.title}>Xác Thực Email</h2>
          <p className={styles.subtitle}>Nhập mã 6 số đã gửi tới hộp thư của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              required
              className={styles.input}
              placeholder="nguyenvana@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Mã xác thực</label>
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              pattern="\d{6}"
              className={styles.input}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Xác Thực'}
          </button>
        </form>

        <div className={styles.footerText}>
          Chưa nhận được mã?
          <button type="button" className={styles.link} onClick={handleResend} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
            Gửi lại mã
          </button>
        </div>
        <div className={styles.footerText}>
          <Link to="/login" className={styles.link}>Về trang đăng nhập</Link>
        </div>
      </div>
    </div>
  )
}
