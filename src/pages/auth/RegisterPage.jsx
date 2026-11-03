import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { EMAIL_PATTERN, FormError, PHONE_PATTERN, PasswordField, TextField, authMessage } from '../../components/auth/AuthFields'
import styles from '../../css/auth/Auth.module.css'

// Kiểm tra từng ô trước khi gửi; lỗi hiện ngay dưới ô để người dùng biết sai ở đâu
function validate(f) {
  const errors = {}
  if (!f.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên'
  if (!EMAIL_PATTERN.test(f.email.trim())) errors.email = 'Email chưa đầy đủ, ví dụ ten@gmail.com'
  if (!PHONE_PATTERN.test(f.phone.trim())) errors.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09'
  if (f.password.length < 8) errors.password = 'Mật khẩu cần từ 8 ký tự'
  if (f.confirmPassword !== f.password) errors.confirmPassword = 'Mật khẩu xác nhận chưa khớp'
  return errors
}

// Trang đăng ký tài khoản hội viên mới
export default function RegisterPage() {
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const toast = useToast()
  const navigate = useNavigate()

  const set = (name) => (value) => {
    setFormData((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const found = validate(formData)
    setErrors(found)
    if (Object.keys(found).length) return

    setLoading(true)
    try {
      const { confirmPassword, ...registerPayload } = formData
      await authService.register({ ...registerPayload, email: formData.email.trim(), phone: formData.phone.trim() })
      toast.success('Đăng ký thành công! Nhập mã xác thực đã gửi qua email.')
      navigate('/verify-email', { state: { email: formData.email.trim() } })
    } catch (err) {
      const message = authMessage(err.message, 'Đăng ký chưa được. Vui lòng thử lại.')
      // Lỗi trùng email hoặc số điện thoại gắn vào đúng ô
      if (err.message === 'Email already exists') setErrors({ email: message })
      else if (err.message === 'Phone already exists') setErrors({ phone: message })
      else setFormError(message)
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
          <h2 className={styles.title}>Tạo Tài Khoản</h2>
          <p className={styles.subtitle}>Mã xác thực sẽ gửi tới email của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <TextField label="Họ và tên" type="text" placeholder="Nguyễn Văn A" value={formData.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" />
          <TextField label="Email" type="email" placeholder="Nhập email của bạn" value={formData.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          <TextField label="Số điện thoại" type="tel" placeholder="0912345678" value={formData.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
          <PasswordField
            label="Mật khẩu" placeholder="Tối thiểu 8 ký tự" maxLength={72} value={formData.password} onChange={set('password')} error={errors.password}
            rules={[[formData.password.length >= 8, 'Từ 8 ký tự']]} autoComplete="new-password"
          />
          <PasswordField label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" maxLength={72} value={formData.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} autoComplete="new-password" />
          <FormError message={formError} />

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản'}
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
