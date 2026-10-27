import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from './NotificationBell'
import ChangePasswordModal from './ChangePasswordModal'
import styles from '../../css/common/Navbar.module.css'


export default function Navbar() {
  const auth = useAuth() || {}
  const { user, token, logout } = auth
  const role = user?.roleCode || (user?.role && (typeof user?.role === 'string' ? user.role : user.role.code))
  const isManager = role === 'MANAGER' || role === 'ADMIN'
  const [showPassword, setShowPassword] = useState(false)

  return (
    <header className={styles.navbar}>
      <Link to="/" className={styles.brand}>
        <div className={styles.brandBadge}>S</div>
        <span className={styles.brandText}>SPORT CENTER</span>
      </Link>

      <nav className={styles.navLinks}>
        <Link to="/#packages" className={styles.link}>Gói Hội Viên</Link>
        <Link to="/#classes" className={styles.link}>Lớp Thể Thao</Link>
        <Link to="/#schedule" className={styles.link}>Khung Giờ</Link>
        {token && isManager && (
          <Link to="/manager" className={styles.link} style={{ color: '#38bdf8', fontWeight: '700' }}>
            Quản Lý
          </Link>
        )}
      </nav>

      <div className={styles.navActions}>
        {token ? (
          <>
            <NotificationBell />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {user ? user.fullName : 'Tài khoản'}
            </span>
            <button type="button" className={styles.btnSecondary} onClick={() => setShowPassword(true)}>
              Đổi Mật Khẩu
            </button>
            <button type="button" className={styles.btnSecondary} onClick={logout}>
              Đăng Xuất
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.btnSecondary}>Đăng Nhập</Link>
            <Link to="/register" className={styles.btnPrimary}>Đăng Ký Ngay</Link>
          </>
        )}
      </div>
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
    </header>
  )
}
