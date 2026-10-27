import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { notificationService } from '../../services/notificationService'
import styles from '../../css/common/Navbar.module.css'

const POLL_MS = 60000

// Chuông thông báo: số chưa đọc, danh sách thông báo, đánh dấu đã đọc
export default function NotificationBell() {
  const { token } = useAuth() || {}
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ unreadCount: 0, notifications: [] })

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

  const read = async (n) => {
    if (n.read) return
    await notificationService.markRead(token, n.id).catch(console.error)
    load()
  }

  const readAll = async () => {
    await notificationService.markAllRead(token).catch(console.error)
    load()
  }

  return (
    <div className={styles.bellWrap}>
      <button type="button" className={styles.bellBtn} aria-label="Thông báo" onClick={() => setOpen(!open)}>
        🔔
        {data.unreadCount > 0 && <span className={styles.bellBadge}>{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>}
      </button>
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropHead}>
            Thông báo
            {data.unreadCount > 0 && <button type="button" onClick={readAll}>Đánh dấu đã đọc hết</button>}
          </div>
          {data.notifications.length === 0 && <div className={styles.empty}>Chưa có thông báo</div>}
          {data.notifications.map((n) => (
            <button type="button" key={n.id} className={`${styles.noti} ${n.read ? '' : styles.unread}`} onClick={() => read(n)}>
              <b>{n.title}</b>
              <span>{n.content}</span>
              <small>{new Date(n.createdAt).toLocaleString('vi-VN')}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
