import React from 'react'
import { BRAND, CONTACT } from '../../data/landing'

const todo = (v) => (v === 'CẦN ĐIỀN' ? <span className="todo">{v}</span> : v)

// Chân trang trang chủ
export default function LandingFooter() {
  return (
    <footer>
      <div className="wrap">
        <div>
          <span className="brand"><b>{BRAND}</b></span>
          <p style={{ marginTop: 10 }}>Sport Center. Bơi lội, yoga, bóng chuyền, cầu lông, thể lực, zumba, boxing.</p>
        </div>
        <div>
          <h3>Liên hệ</h3>
          <p>Địa chỉ: {todo(CONTACT.address)}</p>
          <p>Hotline: {todo(CONTACT.hotline)}</p>
        </div>
        <div>
          <h3>Giờ mở cửa</h3>
          <p>{CONTACT.hours}</p>
        </div>
        <small>© {new Date().getFullYear()} {BRAND} Sport Center</small>
      </div>
    </footer>
  )
}
