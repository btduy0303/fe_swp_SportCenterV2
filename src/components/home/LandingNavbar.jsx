import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { BRAND } from '../../data/landing'

const ITEMS = [
  ['Môn tập', '#mon-tap'],
  ['Gói hội viên', '#packages'],
  ['Lớp học', '#classes'],
  ['Lịch học', '#schedule'],
  ['Coach 1-1', '#coach'],
  ['Ưu đãi', '#uu-dai'],
]

// Thanh điều hướng trang chủ: giữ đăng nhập, đăng xuất và link Quản Lý như Navbar chung
export default function LandingNavbar() {
  const auth = useAuth() || {}
  const { user, token, logout } = auth
  const role = user?.roleCode || (user?.role && (typeof user?.role === 'string' ? user.role : user.role.code))
  const isManager = role === 'MANAGER' || role === 'ADMIN'

  return (
    <header className="nav">
      <div className="wrap">
        <Link className="brand" to="/" aria-label={`${BRAND} Sport Center`}>
          <b>{BRAND}</b><small>SPORT CENTER</small>
        </Link>
        <nav aria-label="Điều hướng chính">
          <ul>
            {ITEMS.map(([t, h]) => <li key={h}><a href={h}>{t}</a></li>)}
            {token && isManager && <li><Link to="/manager">Quản lý</Link></li>}
          </ul>
        </nav>
        <div className="actions">
          {token ? (
            <>
              <span className="who">{user ? user.fullName : 'Tài khoản'}</span>
              <button type="button" className="btn alt" onClick={logout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <Link className="login" to="/login">Đăng nhập</Link>
              <Link className="btn" to="/register">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
