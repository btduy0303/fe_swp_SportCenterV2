import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from './NotificationBell'
import ChangePasswordModal from './ChangePasswordModal'
import styles from '../../css/common/Navbar.module.css'
import MemberAccountMenu from './MemberAccountMenu'


const HOME_OF = { MANAGER: '/manager', ADMIN: '/manager', RECEPTIONIST: '/receptionist', COACH: '/coach', MEMBER: '/member' }

export default function Navbar({ className = '' }) {
  const auth = useAuth() || {}
  const { user, token, logout } = auth
  const role = user?.roleCode || (user?.role && (typeof user?.role === 'string' ? user.role : user.role.code))
  const [showPassword, setShowPassword] = useState(false)

  return (
    <header className={`${styles.navbar} ${className}`}>
      <Link to="/" className={styles.brand}>
        <div className={styles.brandBadge}>G6</div>
        <span className={styles.brandText}>Sport Center</span>
      </Link>

      <nav className={styles.navLinks}>
        <Link to="/#mon-tap" className={styles.link}>Môn Tập</Link>
        <Link to="/#packages" className={styles.link}>Gói Hội Viên</Link>
        <Link to="/#classes" className={styles.link}>Lớp Thể Thao</Link>
        <Link to="/#schedule" className={styles.link}>Khung Giờ</Link>
        {token && ['COACH', 'MEMBER'].includes(role) ? <Link to={role === 'COACH' ? '/coach/training' : '/member/training'} className={styles.link}>Tập Luyện</Link> : null}
        {token && (
          <Link to={HOME_OF[role] || '/member'} className={styles.link} style={{ color: 'var(--accent-blue)' }}>
            Khu Vực Của Tôi
          </Link>
        )}
      </nav>

      <div className={styles.navActions}>
        {token ? <NotificationBell /> : null}
        {token && role === 'MEMBER' ? <MemberAccountMenu user={user} logout={logout} onChangePassword={() => setShowPassword(true)} /> : token ? (
          <>
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
