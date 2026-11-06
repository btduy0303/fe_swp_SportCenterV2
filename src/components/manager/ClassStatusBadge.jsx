import React from 'react'
import { STATUS_VI } from '../../utils/schedule'

// Màu theo trạng thái lớp, dùng chung cho danh sách lớp và thẻ vận hành lớp
const COLORS = {
  DRAFT: 'var(--text-secondary)',
  OPEN: 'var(--success)',
  IN_PROGRESS: 'var(--accent-blue)',
  COMPLETED: 'var(--text-muted)',
  CANCELED: 'var(--danger)',
}

export default function ClassStatusBadge({ status }) {
  const color = COLORS[status] || 'var(--text-secondary)'
  return (
    <span style={{ color, boxShadow: `inset 0 0 0 1px ${color}`, padding: '0.15rem 0.55rem', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {STATUS_VI[status] || status}
    </span>
  )
}
