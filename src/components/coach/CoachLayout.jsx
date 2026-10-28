import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarDays, ClipboardCheck, Dumbbell, ChartNoAxesCombined, Activity, UserRound, Clock3, PanelLeftClose, PanelLeftOpen, Menu, X, ArrowUpRight, LogOut } from 'lucide-react'
import NotificationBell from '../common/NotificationBell'
import ChangePasswordModal from '../common/ChangePasswordModal'
import { useAuth } from '../../context/AuthContext'
import styles from '../../css/coach/CoachDashboard.module.css'
import theme from '../../css/training/Flow4Theme.module.css'

const links = [
  ['overview', 'Tổng quan', '/coach', LayoutDashboard],
  ['classes', 'Lớp phụ trách', '/coach?view=classes', Users],
  ['sessions', 'Lịch giảng dạy', '/coach/training?tab=sessions', CalendarDays],
  ['attendance', 'Điểm danh', '/coach?view=attendance', ClipboardCheck],
  ['plans', 'Kế hoạch tập luyện', '/coach/training?tab=plans', Dumbbell],
  ['results', 'Kết quả tập luyện', '/coach/training?tab=sessions&status=completed', Activity],
  ['progress', 'Tiến bộ học viên', '/coach/training?tab=progress', ChartNoAxesCombined],
  ['slots', 'Lịch kèm 1-1', '/coach?view=slots', Clock3],
  ['weekly', 'Lịch dạy hằng tuần', '/coach?view=weekly', CalendarDays],
  ['reviews', 'Xếp loại cuối khóa', '/coach?view=reviews', ClipboardCheck],
  ['profile', 'Hồ sơ của tôi', '/coach?view=profile', UserRound],
]

export default function CoachLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [currentDate] = useState(() => new Intl.DateTimeFormat('vi-VN', { day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Ho_Chi_Minh' }).format(new Date()))
  const mobileDialog = useRef(null)
  const params = new URLSearchParams(location.search)
  const active = location.pathname === '/coach' ? (params.get('view') || 'overview')
    : params.get('status') === 'completed' ? 'results' : (params.get('tab') || 'sessions')
  const pageTitle = links.find(([id]) => id === active)?.[1] || 'Huấn luyện'
  const initials = (user?.fullName || 'HLV').split(' ').filter(Boolean).slice(-2).map(s => s[0]).join('')
  useEffect(() => {
    if (mobileOpen) mobileDialog.current?.showModal()
    else mobileDialog.current?.close()
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [mobileOpen])
  const navigation = isMobile => <>
    <Link to="/coach" className={styles.brand} onClick={() => setMobileOpen(false)} aria-label="Sport Center, tổng quan"><span className={styles.brandMark}><Dumbbell size={23} aria-hidden="true" /></span>{isMobile || !collapsed ? <span>SPORT CENTER<small>COACH WORKSPACE</small></span> : null}</Link>
    <p className={styles.navCaption}>{isMobile || !collapsed ? 'HUẤN LUYỆN' : '•••'}</p>
    <nav aria-label={isMobile ? 'Điều hướng Coach trên điện thoại' : 'Điều hướng huấn luyện viên'}>{links.map(([id, label, to, Icon]) => <Link key={id} to={to} aria-label={label} title={!isMobile && collapsed ? label : undefined} aria-current={active === id ? 'page' : undefined} onClick={() => setMobileOpen(false)}><Icon size={19} aria-hidden="true" />{isMobile || !collapsed ? <span>{label}</span> : null}</Link>)}</nav>
    <div className={styles.sidebarBottom}><Link to="/" title="Website trung tâm"><ArrowUpRight size={18} aria-hidden="true" />{isMobile || !collapsed ? 'Website trung tâm' : null}</Link><button onClick={() => setShowPassword(true)} title="Đổi mật khẩu"><UserRound size={18} aria-hidden="true" />{isMobile || !collapsed ? 'Đổi mật khẩu' : null}</button><button onClick={logout} title="Đăng xuất"><LogOut size={18} aria-hidden="true" />{isMobile || !collapsed ? 'Đăng xuất' : null}</button></div>
  </>
  return <div className={`${theme.theme} ${styles.shell}`} data-collapsed={collapsed}>
    <a className={styles.skipLink} href="#coach-content">Đến nội dung chính</a>
    <aside className={styles.sidebar}>{navigation(false)}<button className={styles.collapseButton} onClick={() => setCollapsed(v => !v)} aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen size={19} /> : <><PanelLeftClose size={19} /><span>Thu gọn thanh bên</span></>}</button></aside>
    <div className={styles.workArea}>
      <header className={styles.topbar}><div className={styles.topbarTitle}><button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Mở menu điều hướng" aria-haspopup="dialog"><Menu size={21} /></button><span>Không gian Coach <span className={styles.breadcrumbSlash}>/</span> <strong>{pageTitle}</strong></span></div>
        <div className={styles.topbarActions}><NotificationBell /><span className={styles.topbarDate}><CalendarDays size={16} aria-hidden="true" />{currentDate}</span><Link to="/coach?view=profile" className={styles.coachIdentity} aria-label={`Hồ sơ của ${user?.fullName || 'huấn luyện viên'}`}><span className={styles.avatar} aria-hidden="true">{initials}</span><span><strong>{user?.fullName || 'Huấn luyện viên'}</strong><small>Huấn luyện viên</small></span></Link></div>
      </header>
      <div className={styles.content} id="coach-content" tabIndex={-1}>{children}</div>
      <footer className={styles.workspaceFooter}><span>Sport Center · Không gian huấn luyện</span><Link to="/">Website trung tâm <ArrowUpRight size={14} aria-hidden="true" /></Link></footer>
    </div>
    {showPassword ? <ChangePasswordModal onClose={() => setShowPassword(false)} /> : null}
    <dialog ref={mobileDialog} className={styles.mobileDrawer} aria-label="Menu huấn luyện viên" onCancel={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} onClick={e => { if (e.target === e.currentTarget) setMobileOpen(false) }}><div><button className={styles.drawerClose} onClick={() => setMobileOpen(false)} aria-label="Đóng menu điều hướng"><X size={22} /></button>{navigation(true)}</div></dialog>
  </div>
}
