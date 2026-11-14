import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, CreditCard, Megaphone, RefreshCw, Ticket, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { notificationService } from '../../services/notificationService'
import styles from '../../css/common/NotificationBell.module.css'

const POLL_MS = 60000
const ICONS = { BOOKING: CalendarClock, PAYMENT: CreditCard, MEMBERSHIP: Ticket, WAITLIST: Users, MAKEUP: RefreshCw, ANNOUNCEMENT: Megaphone }

// "5 phút trước", "Hôm qua"... cho thời gian của thông báo
function ago(value) {
  const diff = (Date.now() - new Date(value).getTime()) / 60000
  if (diff < 1) return 'Vừa xong'
  if (diff < 60) return `${Math.floor(diff)} phút trước`
  if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`
  if (diff < 2880) return 'Hôm qua'
  return new Date(value).toLocaleDateString('vi-VN')
}

// Chuông thông báo: hai tab Chưa đọc / Đã đọc; bấm một thông báo thì đánh dấu đã đọc và mở trang phát ra thông báo đó
export default function NotificationBell() {
  const { token } = useAuth() || {}
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('unread')
  const [data, setData] = useState({ unreadCount: 0, notifications: [] })
  const wrap = useRef(null)

  const load = useCallback(async () => {
    try {
      setData(await notificationService.getMine(token))
    } catch (err) {
      console.error(err)
    }
  }, [token])

  // Tải lần đầu rồi tải lại mỗi phút
  useEffect(() => {
    if (!token) return undefined
    load()
    const timer = setInterval(load, POLL_MS)
    return () => clearInterval(timer)
  }, [token, load])

  // Bấm ra ngoài hoặc Esc thì đóng
  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  const openOne = async (n) => {
    if (!n.read) await notificationService.markRead(token, n.id).catch(console.error)
    load()
    if (n.link) {
      setOpen(false)
      navigate(n.link)
    }
  }

  const readAll = async () => {
    await notificationService.markAllRead(token).catch(console.error)
    load()
  }

  const list = data.notifications.filter((n) => (tab === 'unread' ? !n.read : n.read))

  return (
    <div className={styles.bellWrap} ref={wrap}>
      <button type="button" className={styles.bellBtn} aria-label={`Thông báo, ${data.unreadCount} chưa đọc`} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Bell size={18} aria-hidden="true" />
        {data.unreadCount > 0 && <span className={styles.bellBadge}>{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>}
      </button>
      {open && (
        <div className={styles.dropdown} role="dialog" aria-label="Thông báo">
          <div className={styles.dropHead}>
            <strong>Thông báo</strong>
            {data.unreadCount > 0 && <button type="button" onClick={readAll}>Đọc hết</button>}
          </div>
          <div className={styles.tabs} role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'unread'} onClick={() => setTab('unread')}>Chưa đọc <em>{data.unreadCount}</em></button>
            <button type="button" role="tab" aria-selected={tab === 'read'} onClick={() => setTab('read')}>Đã đọc</button>
          </div>
          <div className={styles.list}>
            {list.length === 0 && <div className={styles.empty}>{tab === 'unread' ? 'Bạn đã đọc hết thông báo.' : 'Chưa có thông báo đã đọc.'}</div>}
            {list.map((n) => {
              const Icon = ICONS[n.type] || Megaphone
              return (
                <button type="button" key={n.id} className={`${styles.noti} ${n.read ? '' : styles.unread}`} onClick={() => openOne(n)}>
                  <span className={styles.icon} aria-hidden="true"><Icon size={16} /></span>
                  <span className={styles.body}>
                    <b>{n.title}</b>
                    <span>{n.content}</span>
                    <small>{ago(n.createdAt)}{n.link ? ' · Bấm để xem' : ''}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
