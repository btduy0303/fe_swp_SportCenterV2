import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../../services/authService'
import { EMAIL_PATTERN, FormError, PasswordField, TextField, authMessage } from '../../components/auth/AuthFields'
import styles from '../../css/auth/Auth.module.css'

const STEPS = ['Nhập email', 'Nhập mã', 'Mật khẩu mới']

// Quên mật khẩu, ba bước: nhập email nhận mã 6 số, nhập mã cùng mật khẩu mới, rồi báo đã đổi xong
export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async (e) => {
    e.preventDefault()
    setError('')
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Email chưa đầy đủ, ví dụ ten@gmail.com')
      return
    }
    setLoading(true)
    try {
      await authService.forgotPassword(email.trim())
      setStep(2)
    } catch (err) {
      setError(authMessage(err.message, 'Không thể gửi mã. Vui lòng thử lại.'))
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Mã gồm 6 số')
      return
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError('Mật khẩu mới từ 8 đến 72 ký tự')
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword(email.trim(), code.trim(), newPassword)
      setStep(3)
    } catch (err) {
      setError(authMessage(err.message, 'Đặt lại mật khẩu chưa được. Vui lòng thử lại.'))
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
          <h2 className={styles.title}>{step === 3 ? 'Đã Đổi Mật Khẩu' : 'Quên Mật Khẩu'}</h2>
          <p className={styles.subtitle}>
            {step === 1 && 'Nhập email đã đăng ký, chúng tôi sẽ gửi mã.'}
            {step === 2 && 'Mã 6 số đã gửi tới email nếu email đó đã đăng ký.'}
            {step === 3 && 'Đăng nhập lại bằng mật khẩu mới.'}
          </p>
        </div>

        <ol className={styles.steps} aria-label="Các bước">
          {STEPS.map((name, i) => <li key={name} aria-current={step === i + 1 ? 'step' : undefined}>{i + 1}. {name}</li>)}
        </ol>

        {step === 1 && (
          <form onSubmit={sendCode} className={styles.form} noValidate>
            <TextField label="Email" type="email" placeholder="Nhập email của bạn" value={email} onChange={setEmail} autoComplete="email" />
            <FormError message={error} />
            <button type="submit" className={styles.btnSubmit} disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi mã'}</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={resetPassword} className={styles.form} noValidate>
            <TextField label="Mã 6 số" type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={setCode} autoComplete="one-time-code" />
            <PasswordField label="Mật khẩu mới" maxLength={72} placeholder="8 đến 72 ký tự" value={newPassword} onChange={setNewPassword} rules={[[newPassword.length >= 8, 'Từ 8 ký tự']]} autoComplete="new-password" />
            <FormError message={error} />
            <button type="submit" className={styles.btnSubmit} disabled={loading}>{loading ? 'Đang lưu...' : 'Đổi mật khẩu'}</button>
          </form>
        )}

        {step === 3 && (
          <div className={styles.success}>
            <span className={styles.tick} aria-hidden="true">✓</span>
            <Link to="/login" className={styles.btnSubmit} style={{ display: 'block', textAlign: 'center' }}>Về đăng nhập</Link>
          </div>
        )}

        {step !== 3 && (
          <div className={styles.footerText}>
            <Link to="/login" className={styles.link}>Về trang đăng nhập</Link>
          </div>
        )}
      </div>
    </div>
  )
}
