import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import styles from '../../css/auth/Auth.module.css'

// Quên mật khẩu: bước 1 nhập email nhận mã 6 số, bước 2 nhập mã và mật khẩu mới
export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const toast = useToast()
  const navigate = useNavigate()

  const sendCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.forgotPassword(email.trim())
      toast.success('Nếu email đã đăng ký, mã xác nhận đã được gửi tới hộp thư')
      setStep(2)
    } catch (err) {
      toast.error(err.message || 'Không thể gửi mã')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.resetPassword(email.trim(), code.trim(), newPassword)
      toast.success('Đã đặt lại mật khẩu, mời bạn đăng nhập')
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Đặt lại mật khẩu không thành công')
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
          <h2 className={styles.title}>Quên Mật Khẩu</h2>
          <p className={styles.subtitle}>
            {step === 1 ? 'Nhập email để nhận mã xác nhận 6 số' : 'Nhập mã đã gửi và mật khẩu mới'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={sendCode} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input type="email" required className={styles.input} placeholder="nguyenvana@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi Mã'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Mã xác nhận</label>
              <input type="text" required inputMode="numeric" maxLength={6} pattern="\d{6}" className={styles.input} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Mật khẩu mới</label>
              <input type="password" required minLength={8} maxLength={72} className={styles.input} placeholder="8 đến 72 ký tự" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Đặt Lại Mật Khẩu'}
            </button>
          </form>
        )}

        <div className={styles.footerText}>
          <Link to="/login" className={styles.link}>Về trang đăng nhập</Link>
        </div>
      </div>
    </div>
  )
}
