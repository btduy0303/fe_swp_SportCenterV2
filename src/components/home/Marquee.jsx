import React from 'react'
// Dải chữ chạy ngang tên các môn
export default function Marquee({ sports }) {
  if (!sports.length) return null
  // Lặp 4 lần để vòng chạy liền mạch (translateX -50%)
  const row = [...sports, ...sports]
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
