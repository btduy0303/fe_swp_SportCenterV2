import React from 'react'
import { Link } from 'react-router-dom'
import { BRAND } from '../../data/landing'

// Chân trang trang chủ
export default function LandingFooter({ hours, sports }) {
  return (
    <footer>
      <div className="wrap">
        <div>
          <span className="brand"><b>{BRAND}</b></span>
          <p style={{ marginTop: 10 }}>Sport Center{sports.length > 0 && `. ${sports.map((s) => s.name).join(', ')}`}.</p>
        </div>
        {hours && (
          <div>
            <h3>Giờ mở cửa</h3>
            <p>{hours}</p>
          </div>
        )}
        <nav className="legal-links" aria-label="Văn bản của trung tâm">
          <Link to="/terms">Điều khoản sử dụng</Link>
          <Link to="/privacy">Chính sách bảo mật</Link>
        </nav>
        <small>© {new Date().getFullYear()} {BRAND} Sport Center</small>
      </div>
    </footer>
  )
}
