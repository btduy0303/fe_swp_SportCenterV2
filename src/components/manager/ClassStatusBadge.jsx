import React from 'react'
import { STATUS_VI } from '../../utils/schedule'

// Màu theo trạng thái lớp, dùng chung cho bảng lớp và thẻ vận hành lớp
const COLORS = {
  DRAFT: 'var(--accent-blue)',
  OPEN: 'var(--success)',
  IN_PROGRESS: 'var(--info)',
  COMPLETED: 'var(--text-secondary)',
  CANCELED: 'var(--danger)',
}

export default function ClassStatusBadge({ status }) {
  const color = COLORS[status] || 'var(--text-secondary)'
  return (
    <span style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)`, padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {STATUS_VI[status] || status}
    </span>
  )
}
