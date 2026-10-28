import test from 'node:test'
import assert from 'node:assert/strict'
import { loadRecordPage, pageBounds, pageNumbers } from './paginationUtils.js'

test('empty and shrinking lists keep a valid page and last-page range', () => {
  assert.deepEqual(pageBounds(0, 3, 10), { page: 1, pages: 1, start: 0, end: 0 })
  assert.deepEqual(pageBounds(23, 5, 10), { page: 3, pages: 3, start: 20, end: 23 })
  assert.deepEqual(pageBounds(7, 3, 10), { page: 1, pages: 1, start: 0, end: 7 })
})

test('large page counts have bounded controls, including first and last pages', () => {
  assert.deepEqual(pageNumbers(1, 1), [1])
  assert.deepEqual(pageNumbers(1, 100), [1, 2, 3, 4, 'gap-100', 100])
  assert.deepEqual(pageNumbers(50, 100), [1, 'gap-49', 49, 50, 51, 'gap-100', 100])
  assert.deepEqual(pageNumbers(100, 100), [1, 'gap-97', 97, 98, 99, 100])
})

const rows = Array.from({ length: 1037 }, (_, index) => ({ id: 1037 - index }))
function fixture(items = rows) {
  const batch = (cursor, limit) => {
    const remaining = cursor == null ? items : items.filter(row => row.id < cursor)
    const selected = remaining.slice(0, limit)
    return { items: selected, nextCursor: remaining.length > limit ? selected.at(-1).id : null }
  }
  return { initial: batch(null, 50), batch }
}

test('cached pages and going back do not request the API again', async () => {
  const { initial } = fixture()
  const fail = () => assert.fail('A cached page must not fetch')
  assert.equal(await loadRecordPage(initial, 5, 10, fail), initial)
  assert.equal(await loadRecordPage(initial, 1, 20, fail), initial)
})

test('20-row pages fill across the initial 50-row cursor boundary', async () => {
  const { initial, batch } = fixture(rows.slice(0, 73))
  const requests = []
  const next = (cursor, limit) => { requests.push([cursor, limit]); return batch(cursor, limit) }
  const third = await loadRecordPage(initial, 3, 20, next)
  assert.equal(third.items.length, 60)
  assert.equal(requests[0][1], 10)
  const fourth = await loadRecordPage(third, 4, 20, next)
  assert.deepEqual(fourth.items.slice(60), rows.slice(60, 73))
  assert.equal(fourth.nextCursor, null)
  assert.equal(pageBounds(73, 4, 20).end, 73)
})

test('all 1037 history records remain reachable exactly once', async () => {
  const { initial, batch } = fixture()
  let cache = initial
  const visited = []
  for (let page = 1; page <= 104; page++) {
    cache = await loadRecordPage(cache, page, 10, batch)
    const bounds = pageBounds(cache.items.length, page, 10)
    visited.push(...cache.items.slice(bounds.start, bounds.end).map(row => row.id))
  }
  assert.deepEqual(visited, rows.map(row => row.id))
  assert.equal(new Set(visited).size, 1037)
  assert.equal(cache.nextCursor, null)
})

test('a failed fetch preserves successful batches for retry', async () => {
  const { initial, batch } = fixture()
  let saved = initial
  let calls = 0
  await assert.rejects(loadRecordPage(initial, 7, 10, (cursor, limit) => {
    if (++calls === 2) throw new Error('Offline')
    return batch(cursor, Math.min(limit, 10))
  }, next => { saved = next }), /Offline/)
  assert.equal(saved.items.length, 60)
  const retried = await loadRecordPage(saved, 7, 10, batch)
  assert.deepEqual(retried.items, rows.slice(0, 70))
})

test('a stalled cursor fails instead of fetching forever', async () => {
  const { initial } = fixture()
  await assert.rejects(loadRecordPage(initial, 6, 10, cursor => ({ items: [], nextCursor: cursor })), /Không thể chuyển trang/)
})

test('aborted requests do not publish a new page', async () => {
  const { initial } = fixture()
  await assert.rejects(loadRecordPage(initial, 6, 10, () => { throw new DOMException('Aborted', 'AbortError') }, () => {
    assert.fail('An aborted batch must not update the cache')
  }), { name: 'AbortError' })
})
