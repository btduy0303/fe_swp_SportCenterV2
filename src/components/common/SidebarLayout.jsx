import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Dumbbell, PanelLeftClose, PanelLeftOpen, Menu, X, ArrowUpRight, LogOut, KeyRound } from 'lucide-react'
import NotificationBell from './NotificationBell'
import ChangePasswordModal from './ChangePasswordModal'
import { useAuth } from '../../context/AuthContext'
import styles from '../../css/coach/CoachDashboard.module.css'
import theme from '../../css/training/Flow4Theme.module.css'

// Khung dùng chung cho các trang sau đăng nhập: thanh điều hướng dọc bên trái, thanh trên có chuông và tài khoản.
// items: [{ id, label, Icon, to? }]. Mục có `to` là liên kết trang; mục không có `to` gọi onSelect(id).
export default function SidebarLayout({ workspace, caption, rootLabel, roleLabel, items, activeId, onSelect, profileTo, children }) {
  const { user, logout } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [currentDate] = useState(() => new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()))
  const mobileDialog = useRef(null)
  const pageTitle = items.find((i) => i.id === activeId)?.label || workspace
  const initials = (user?.fullName || '?').split(' ').filter(Boolean).slice(-2).map((s) => s[0]).join('')

  useEffect(() => {
    if (mobileOpen) mobileDialog.current?.showModal()
    else mobileDialog.current?.close()
    if (!mobileOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [mobileOpen])

  const link = (item, isMobile) => {
    const { id, label, Icon, to } = item
    const props = {
      'aria-label': label,
      title: !isMobile && collapsed ? label : undefined,
      'aria-current': activeId === id ? 'page' : undefined,
    }
    const inner = <><Icon size={19} aria-hidden="true" />{isMobile || !collapsed ? <span>{label}</span> : null}</>
    if (to) return <Link key={id} to={to} {...props} onClick={() => setMobileOpen(false)}>{inner}</Link>
    return (
      <a key={id} href={`#${id}`} {...props} onClick={(e) => { e.preventDefault(); onSelect(id); setMobileOpen(false) }}>{inner}</a>
    )
  }

  const navigation = (isMobile) => (
    <>
      <Link to="/" className={styles.brand} onClick={() => setMobileOpen(false)} aria-label="G6 Sport Center, về trang chủ">
        <span className={styles.brandMark}><Dumbbell size={23} aria-hidden="true" /></span>
        {isMobile || !collapsed ? <span>G6 SPORT CENTER<small>{workspace}</small></span> : null}
      </Link>
      <p className={styles.navCaption}>{isMobile || !collapsed ? caption : '•••'}</p>
      <nav aria-label={`Điều hướng ${workspace}`}>{items.map((i) => link(i, isMobile))}</nav>
      <div className={styles.sidebarBottom}>
        <Link to="/" title="Website trung tâm"><ArrowUpRight size={18} aria-hidden="true" />{isMobile || !collapsed ? 'Website trung tâm' : null}</Link>
        <button type="button" onClick={() => setShowPassword(true)} title="Đổi mật khẩu"><KeyRound size={18} aria-hidden="true" />{isMobile || !collapsed ? 'Đổi mật khẩu' : null}</button>
        <button type="button" onClick={logout} title="Đăng xuất"><LogOut size={18} aria-hidden="true" />{isMobile || !collapsed ? 'Đăng xuất' : null}</button>
      </div>
    </>
  )

  const identity = (
    <>
      <span className={styles.avatar} aria-hidden="true">{initials}</span>
      <span><strong>{user?.fullName || roleLabel}</strong><small>{roleLabel}</small></span>
    </>
  )

  return (
    <div className={`${theme.theme} ${styles.shell}`} data-collapsed={collapsed}>
      <a className={styles.skipLink} href="#main-content">Đến nội dung chính</a>
      <aside className={styles.sidebar}>
        {navigation(false)}
        <button type="button" className={styles.collapseButton} onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'} aria-expanded={!collapsed}>
          {collapsed ? <PanelLeftOpen size={19} /> : <><PanelLeftClose size={19} /><span>Thu gọn thanh bên</span></>}
        </button>
      </aside>
      <div className={styles.workArea}>
        <header className={styles.topbar}>
          <div className={styles.topbarTitle}>
            <button type="button" className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Mở menu điều hướng" aria-haspopup="dialog"><Menu size={21} /></button>
            <span>{rootLabel} <span className={styles.breadcrumbSlash}>/</span> <strong>{pageTitle}</strong></span>
          </div>
          <div className={styles.topbarActions}>
            <NotificationBell />
            <span className={styles.topbarDate}><CalendarDays size={16} aria-hidden="true" />{currentDate}</span>
            {profileTo
              ? <Link to={profileTo} className={styles.coachIdentity} aria-label={`Hồ sơ của ${user?.fullName || ''}`}>{identity}</Link>
              : <div className={styles.coachIdentity}>{identity}</div>}
          </div>
        </header>
        <div className={styles.content} id="main-content" tabIndex={-1}>{children}</div>
        <footer className={styles.workspaceFooter}><span>G6 Sport Center · {workspace}</span><Link to="/">Website trung tâm <ArrowUpRight size={14} aria-hidden="true" /></Link></footer>
      </div>
      {showPassword ? <ChangePasswordModal onClose={() => setShowPassword(false)} /> : null}
      <dialog ref={mobileDialog} className={styles.mobileDrawer} aria-label={`Menu ${workspace}`} onCancel={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} onClick={(e) => { if (e.target === e.currentTarget) setMobileOpen(false) }}>
        <div>
          <button type="button" className={styles.drawerClose} onClick={() => setMobileOpen(false)} aria-label="Đóng menu điều hướng"><X size={22} /></button>
          {navigation(true)}
        </div>
      </dialog>
    </div>
  )
}
