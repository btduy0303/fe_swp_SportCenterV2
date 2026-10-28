import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { trainingRequest } from '../../services/trainingService'
import { ErrorMessage } from './TrainingShared'
import Pagination from './Pagination'
import { loadRecordPage, pageBounds } from './paginationUtils'

export default function PagedRecords({ page, resource, children, label = 'lịch sử' }) {
  const { token } = useAuth()
  // Reset the cache when its input changes, including after a save/reload.
  const [source, setSource] = useState({ page, resource, token, revision: 0 })
  if (source.page !== page || source.resource !== resource || source.token !== token) {
    setSource({ page, resource, token, revision: source.revision + 1 })
  }
  return <CursorRecords key={source.revision} initial={page} resource={resource} token={token} label={label}>{children}</CursorRecords>
}

function CursorRecords({ initial, resource, token, children, label }) {
  const [records, setRecords] = useState(initial)
  const [position, setPosition] = useState({ page: 1, size: 10 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(null)
  const pending = useRef(null)
  useEffect(() => () => pending.current?.abort(), [])
  const bounds = pageBounds(records.items.length, position.page, position.size)

  async function navigate(page, size = position.size) {
    if (pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setBusy(true); setError(''); setRetry(null)
    try {
      const loaded = await loadRecordPage(records, page, size, async (cursor, limit) => {
        const query = new URLSearchParams({ cursor: String(cursor), limit: String(limit) })
        const next = await trainingRequest(token, `${resource}${resource.includes('?') ? '&' : '?'}${query}`, { signal: controller.signal })
        controller.signal.throwIfAborted()
        return next
      }, setRecords)
      if (!controller.signal.aborted) setPosition({ page: pageBounds(loaded.items.length, page, size).page, size })
    } catch (e) {
      if (!controller.signal.aborted) { setError(e.message); setRetry({ page, size }) }
    } finally {
      pending.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return <>
    {children(records.items.slice(bounds.start, bounds.end))}
    <ErrorMessage error={error} />
    {retry ? <button type="button" disabled={busy} onClick={() => navigate(retry.page, retry.size)}>Thử tải lại trang</button> : null}
    <Pagination {...bounds} pageSize={position.size} total={records.nextCursor == null ? records.items.length : null}
      hasMore={records.nextCursor != null} busy={busy} label={label}
      onPageChange={navigate} onPageSizeChange={size => navigate(1, size)} />
  </>
}
