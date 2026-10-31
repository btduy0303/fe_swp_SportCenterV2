import React from 'react'

export const DAY_VI = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ nhật' }

// Lịch học hằng tuần của một lớp (thứ, giờ, phòng). rows lấy sẵn một lần cho mọi lớp ở trang cha, không gọi API từng lớp
export default function WeeklySchedule({ rows }) {
  if (!rows || rows.length === 0) return null
  return (
    <div style={{ marginTop: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
      {rows.map((r) => (
        <div key={r.id}>
          {DAY_VI[r.dayOfWeek] || r.dayOfWeekName}: {String(r.startTime).slice(0, 5)} - {String(r.endTime).slice(0, 5)} · {r.roomName}
        </div>
      ))}
    </div>
  )
}
