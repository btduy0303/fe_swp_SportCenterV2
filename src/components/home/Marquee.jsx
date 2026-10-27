import React from 'react'
import { SPORTS } from '../../data/landing'

// Dải chữ chạy ngang tên các môn
export default function Marquee() {
  // Lặp 4 lần để vòng chạy liền mạch (translateX -50%)
  const row = [...SPORTS, ...SPORTS]
  return (
    <div className="marquee" aria-hidden="true">
      <div className="track">
        {[0, 1].map((k) => row.map((s, i) => (
          <span key={`${k}-${i}`}>{s.name}<i>✦</i></span>
        )))}
      </div>
    </div>
  )
}
