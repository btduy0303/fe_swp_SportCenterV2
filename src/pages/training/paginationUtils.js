export const PAGE_SIZES = [10, 20, 50]

export function pageBounds(count, requestedPage, pageSize) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  const page = Math.min(pages, Math.max(1, requestedPage))
  const start = (page - 1) * pageSize
  return { page, pages, start, end: Math.min(count, start + pageSize) }
}

export function pageNumbers(page, pages) {
  const selected = new Set([1, pages, page - 1, page, page + 1])
  if (page <= 3) [2, 3, 4].forEach(n => selected.add(n))
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach(n => selected.add(n))
  const result = []
  for (const value of [...selected].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b)) {
    if (result.length && value - result[result.length - 1] > 1) result.push(`gap-${value}`)
    result.push(value)
  }
  return result
}

// Reuse the initial batch and fetch only missing records, never all history.
export async function loadRecordPage(records, page, pageSize, fetchNext, onBatch = () => {}) {
  let loaded = records
  const end = page * pageSize
  while (loaded.items.length < end && loaded.nextCursor != null) {
    const next = await fetchNext(loaded.nextCursor, Math.min(100, end - loaded.items.length))
    if (next.nextCursor != null && (next.nextCursor === loaded.nextCursor || !next.items.length)) {
      throw new Error('Không thể chuyển trang. Vui lòng tải lại dữ liệu.')
    }
    loaded = { items: [...loaded.items, ...next.items], nextCursor: next.nextCursor }
    onBatch(loaded)
  }
  return loaded
}
