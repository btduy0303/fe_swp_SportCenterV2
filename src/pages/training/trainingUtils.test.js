import test from 'node:test'
import assert from 'node:assert/strict'
import { filterSessions, sessionStatusFilter } from './trainingUtils.js'

const sessions = ['SCHEDULED', 'PROPOSED', 'DONE', 'CANCELED_BY_CENTER'].map((status, index) => ({
  id: index + 1, classId: index === 2 ? 2 : 1, className: 'Bơi cơ bản', room: 'Hồ bơi A', status,
}))

test('scheduled excludes proposed makeup and canceled sessions', () => {
  assert.deepEqual(filterSessions(sessions, '', 'scheduled', '').map(s => s.status), ['SCHEDULED'])
})
test('completed includes only DONE, while all preserves each status', () => {
  assert.deepEqual(filterSessions(sessions, '', 'completed', '').map(s => s.status), ['DONE'])
  assert.equal(filterSessions(sessions, '', 'all', '').length, 4)
})
test('unknown URL filter falls back to all', () => {
  assert.equal(sessionStatusFilter('invalid'), 'all')
  assert.equal(sessionStatusFilter(null), 'all')
})
test('class and Vietnamese search apply together with status', () => {
  assert.equal(filterSessions(sessions, '1', 'scheduled', '  BƠI CƠ BẢN  ').length, 1)
  assert.equal(filterSessions(sessions, '2', 'scheduled', '').length, 0)
  assert.equal(filterSessions(sessions, '', 'all', 'không tồn tại').length, 0)
})
