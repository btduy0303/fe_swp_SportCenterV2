import React from 'react'
import { STATUS_VI } from '../../utils/schedule'

// Màu theo trạng thái lớp, dùng chung cho bảng lớp và thẻ vận hành lớp
const COLORS = {
  DRAFT: '#ff4d00',
  OPEN: '#4ade80',
  IN_PROGRESS: '#60a5fa',
  COMPLETED: '#a1a1aa',
  CANCELED: '#f87171',
}

export default function ClassStatusBadge({ status }) {
  const color = COLORS[status] || '#a1a1aa'
  return (
    <span style={{ color, background: `${color}1f`, padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {STATUS_VI[status] || status}
    </span>
  )
}
