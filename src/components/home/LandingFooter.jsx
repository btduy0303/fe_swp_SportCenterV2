import React from 'react'
import { BRAND } from '../../data/landing'

// Chân trang trang chủ
export default function LandingFooter({ hours, sports }) {
  return (
    <footer>
      <div className="wrap">
        <div>
          <span className="brand"><b>{BRAND}</b></span>
          <p style={{ marginTop: 10 }}>Sport Center. {sports.map((s) => s.name).join(', ')}.</p>
        </div>
        {hours && (
          <div>
            <h3>Giờ mở cửa</h3>
            <p>{hours}</p>
          </div>
        )}
        <small>© {new Date().getFullYear()} {BRAND} Sport Center</small>
      </div>
    </footer>
  )
}
