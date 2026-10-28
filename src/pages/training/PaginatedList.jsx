import { useState } from 'react'
import Pagination from './Pagination'
import { pageBounds } from './paginationUtils'

export default function PaginatedList({ items, children, resetKey = '', label, disabled = false, hideControls = false }) {
  const [position, setPosition] = useState({ page: 1, size: 10, resetKey })
  const bounds = pageBounds(items.length, position.resetKey === resetKey ? position.page : 1, position.size)
  if (position.resetKey !== resetKey || position.page !== bounds.page) {
    setPosition({ ...position, resetKey, page: bounds.page })
  }
  return <>
    {children(items.slice(bounds.start, bounds.end))}
    {!hideControls ? <Pagination {...bounds} pageSize={position.size} total={items.length} label={label} busy={disabled}
      onPageChange={page => setPosition(old => ({ ...old, page }))}
      onPageSizeChange={size => setPosition(old => ({ ...old, page: 1, size }))} /> : null}
  </>
}
