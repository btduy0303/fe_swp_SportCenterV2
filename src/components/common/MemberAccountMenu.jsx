import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, CreditCard, Users, CalendarDays, Receipt, Ticket, UserRound, Dumbbell, LogOut, KeyRound } from 'lucide-react'
import { memberSection, memberSections } from './memberSections'
import styles from '../../css/common/MemberAccountMenu.module.css'

const icons = { subscription: CreditCard, classes: Users, slots: CalendarDays, payments: Receipt, vouchers: Ticket, profile: UserRound }

function Avatar({ user }) {
  const [failed, setFailed] = useState(false)
  const initials = (user?.fullName || 'Hội viên').trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toLocaleUpperCase('vi')
  return <span className={styles.avatar} aria-hidden="true">{user?.avatarUrl && !failed
    ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : initials}</span>
}

export default function MemberAccountMenu(props) {
  const location = useLocation()
  return <AccountDropdown key={location.key} {...props} location={location} />
}

function AccountDropdown({ user, logout, location, onChangePassword }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const panel = useRef(null)
  const keyboardFocus = useRef(false)
  const panelId = useId()
  const active = location.pathname === '/member' ? memberSection(new URLSearchParams(location.search).get('tab')) : null

  useEffect(() => {
    if (!open) return
    if (keyboardFocus.current) { panel.current?.querySelector('a')?.focus(); keyboardFocus.current = false }
    const dismissOutside = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('focusin', dismissOutside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('focusin', dismissOutside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return <div className={styles.account} ref={root}>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={`Menu tài khoản ${user?.fullName || 'hội viên'}`} aria-expanded={open} aria-controls={panelId}
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); keyboardFocus.current = true; if (open) panel.current?.querySelector('a')?.focus(); else setOpen(true) }
      }}>
      <Avatar key={user?.avatarUrl} user={user} /><span className={styles.triggerText}><strong>{user?.fullName || 'Hội viên'}</strong><small>Tài khoản hội viên</small></span>
      <ChevronDown size={16} aria-hidden="true" className={open ? styles.rotated : ''} />
    </button>
    {open ? <div id={panelId} ref={panel} className={styles.dropdown}>
      <div className={styles.identity}><strong>{user?.fullName || 'Hội viên'}</strong><span>{user?.email}</span></div>
      <nav aria-label="Chức năng hội viên" className={styles.links}>
        {memberSections.map(section => { const Icon = icons[section.id]; return <Link key={section.id} to={`/member?tab=${section.id}`} aria-current={active === section.id ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={18} aria-hidden="true" /><span>{section.label}</span></Link> })}
        <Link to="/member/training" aria-current={location.pathname === '/member/training' ? 'page' : undefined} onClick={() => setOpen(false)}><Dumbbell size={18} aria-hidden="true" /><span>Hành trình tập luyện</span></Link>
      </nav>
      <div className={styles.signout}>
        <button type="button" onClick={() => { setOpen(false); onChangePassword() }}><KeyRound size={18} aria-hidden="true" />Đổi mật khẩu</button>
        <button type="button" onClick={() => { setOpen(false); logout() }}><LogOut size={18} aria-hidden="true" />Đăng xuất</button>
      </div>
    </div> : null}
  </div>
}
