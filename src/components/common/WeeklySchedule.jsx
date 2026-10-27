import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { scheduleService } from '../../services/scheduleService'

export const DAY_VI = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ nhật' }

// Lịch học hằng tuần của một lớp (thứ, giờ, phòng), dùng cho hội viên xem lớp mình học
export default function WeeklySchedule({ classId }) {
  const { token } = useAuth()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    scheduleService.getByClass(token, classId).then((r) => setRows(Array.isArray(r) ? r : [])).catch(() => setRows([]))
  }, [token, classId])

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
