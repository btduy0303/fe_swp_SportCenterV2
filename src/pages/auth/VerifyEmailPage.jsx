import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { FormError, TextField, authMessage } from '../../components/auth/AuthFields'
import styles from '../../css/auth/Auth.module.css'

// Chờ giữa hai lần gửi mã (BE mặc định 60 giây, auth.verify_resend_cooldown_seconds)
const RESEND_SECONDS = 60

// Trang nhập mã 6 số gửi qua email sau khi đăng ký; chưa xác thực thì không đăng nhập được
export default function VerifyEmailPage() {
  const location = useLocation()
  const fromRegister = !!location.state?.email
  const [email, setEmail] = useState(location.state?.email || '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Vừa đăng ký xong thì mã mới được gửi, nên bắt đầu đếm ngược luôn
  const [wait, setWait] = useState(fromRegister ? RESEND_SECONDS : 0)

  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (wait <= 0) return undefined
    const timer = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Mã xác thực gồm 6 số')
      return
    }
    setLoading(true)
    try {
      await authService.verifyEmail(email.trim(), code.trim())
      toast.success('Xác thực email thành công! Bạn có thể đăng nhập.')
      navigate('/login')
    } catch (err) {
      setError(authMessage(err.message, 'Xác thực chưa được. Vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    if (!email.trim()) {
      setError('Vui lòng nhập email để nhận lại mã')
      return
    }
    try {
      await authService.resendVerification(email.trim())
      toast.success('Đã gửi lại mã xác thực, vui lòng kiểm tra hộp thư')
      setWait(RESEND_SECONDS)
    } catch (err) {
      setError(authMessage(err.message, 'Không thể gửi lại mã'))
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.glow}></div>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brandBadge}>G6</div>
          <h2 className={styles.title}>Xác Thực Email</h2>
          <p className={styles.subtitle}>
            {fromRegister ? `Bước 2 của đăng ký. Mã 6 số đã gửi tới ${email}` : 'Nhập mã 6 số đã gửi tới hộp thư của bạn'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {!fromRegister && <TextField label="Email" type="email" placeholder="Nhập email của bạn" value={email} onChange={setEmail} />}
          <TextField label="Mã xác thực" type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={setCode} autoComplete="one-time-code" hint="Mã có thời hạn. Hết hạn thì bấm gửi lại mã." />
          <FormError message={error} />

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Xác Thực'}
          </button>
        </form>

        <div className={styles.footerText}>
          Chưa nhận được mã?
          <button type="button" className={`${styles.linkBtn} ${styles.link}`} onClick={handleResend} disabled={wait > 0}>
            {wait > 0 ? `Gửi lại sau ${wait} giây` : 'Gửi lại mã'}
          </button>
        </div>
        <div className={styles.footerText}>
          {fromRegister && <>Sai email?<Link to="/register" className={styles.link}>Đăng ký lại</Link></>}
          {!fromRegister && <Link to="/login" className={styles.link}>Về trang đăng nhập</Link>}
        </div>
      </div>
    </div>
  )
}
