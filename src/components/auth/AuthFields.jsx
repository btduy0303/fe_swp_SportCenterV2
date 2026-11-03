import React, { useId, useState } from 'react'
import styles from '../../css/auth/Auth.module.css'

// Câu lỗi BE trả bằng tiếng Anh, đổi sang câu tiếng Việt nói rõ cần làm gì
const MESSAGES = {
  'Invalid email or password': 'Email hoặc mật khẩu chưa đúng. Kiểm tra lại hoặc đặt lại mật khẩu.',
  'Account is locked': 'Tài khoản đang bị khóa. Hãy liên hệ trung tâm để được hỗ trợ.',
  'Email already exists': 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.',
  'Phone already exists': 'Số điện thoại này đã được đăng ký.',
  'Invalid email format': 'Email chưa đầy đủ, ví dụ ten@gmail.com',
  'Phone must be 10 digits starting with 03, 05, 07, 08 or 09': 'Số điện thoại gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09',
  'Password must be at least 8 characters': 'Mật khẩu cần từ 8 ký tự',
  'Invalid or expired code': 'Mã chưa đúng hoặc đã hết hạn. Kiểm tra lại hoặc gửi mã mới.',
  'Please wait before requesting a new code': 'Vui lòng chờ một lát rồi gửi lại mã.',
}

export const authMessage = (message, fallback) => MESSAGES[message] || message || fallback

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/
export const PHONE_PATTERN = /^0[35789]\d{8}$/

// Ô nhập kèm nhãn, gợi ý và lỗi hiện ngay dưới ô (đọc được bằng trình đọc màn hình)
export function TextField({ label, error, hint, onChange, ...input }) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input id={id} className={`${styles.input} ${error ? styles.invalid : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} onChange={(e) => onChange(e.target.value)} {...input} />
      {error ? <p id={`${id}-err`} role="alert" className={styles.error}>{error}</p> : hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}

// Ô mật khẩu có nút hiện/ẩn; rules: [[điều kiện đạt hay chưa, chữ]] hiện thành danh sách tích
export function PasswordField({ label, error, rules, onChange, value, ...input }) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.pwWrap}>
        <input id={id} type={shown ? 'text' : 'password'} className={`${styles.input} ${error ? styles.invalid : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} value={value} onChange={(e) => onChange(e.target.value)} {...input} />
        <button type="button" className={styles.eye} aria-pressed={shown} onClick={() => setShown(!shown)}>{shown ? 'Ẩn' : 'Hiện'}</button>
      </div>
      {error && <p id={`${id}-err`} role="alert" className={styles.error}>{error}</p>}
      {rules && value && (
        <ul className={styles.rules}>
          {rules.map(([ok, text]) => <li key={text} className={ok ? styles.ruleOk : ''}>{ok ? '✓' : '•'} {text}</li>)}
        </ul>
      )}
    </div>
  )
}

// Hộp báo lỗi chung của cả biểu mẫu (lỗi từ máy chủ, không thuộc riêng ô nào)
export function FormError({ message }) {
  return message ? <p role="alert" className={styles.formError}>{message}</p> : null
}
