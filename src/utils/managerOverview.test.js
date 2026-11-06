import test from 'node:test'
import assert from 'node:assert/strict'
import { revenueByDay, draftClasses, todaySchedule } from './managerOverview.js'

test('todaySchedule drops canceled sessions, keeps booked 1-1 slots and marks done/now/next by time', () => {
  const at = (h, m) => new Date(2026, 10, 6, h, m).toISOString()
  const sessions = [
    { id: 1, className: 'Yoga', startTime: '07:00:00', endTime: '08:30:00', roomName: 'P1', coachName: 'Lan', status: 'SCHEDULED' },
    { id: 2, className: 'Bơi', startTime: '09:00:00', endTime: '10:30:00', roomName: 'Hồ', coachName: 'Minh', status: 'SCHEDULED' },
    { id: 3, className: 'Hủy', startTime: '11:00:00', endTime: '12:00:00', roomName: 'P2', coachName: 'Hùng', status: 'CANCELED_BY_CENTER' },
  ]
  const slots = [
    { id: 9, status: 'BOOKED', startAt: at(18, 30), endAt: at(19, 30), memberName: 'Lan', sportName: 'Boxing', roomName: 'P3', coachName: 'Đạt' },
    { id: 10, status: 'OPEN', startAt: at(13, 0), endAt: at(14, 0), memberName: null, coachName: 'Đạt' },
  ]
  const list = todaySchedule(sessions, slots, new Date(2026, 10, 6, 9, 30))
  assert.deepEqual(list.map((i) => [i.key, i.state]), [['c1', 'done'], ['c2', 'now'], ['o9', 'next']])
  assert.equal(list[2].start, '18:30')
})

test('revenueByDay fills days without payments with 0', () => {
  const days = revenueByDay([{ label: '2026-11-02', amount: 500 }, { label: '2026-11-04', amount: '250.5' }], new Date(2026, 10, 4))
  assert.deepEqual(days.map((d) => d.amount), [0, 500, 0, 250.5])
  assert.equal(days[3].key, '2026-11-04')
})

test('draftClasses splits drafts starting within a week from the rest', () => {
  const today = new Date(2026, 10, 6, 15, 30)
  const classes = [
    { id: 1, status: 'DRAFT', startDate: '2026-11-07' },
    { id: 2, status: 'DRAFT', startDate: '2026-11-13' },
    { id: 3, status: 'DRAFT', startDate: '2026-11-14' },
    { id: 4, status: 'DRAFT', startDate: '2026-11-01' },
    { id: 5, status: 'OPEN', startDate: '2026-11-07' },
  ]
  const { soon, later } = draftClasses(classes, today)
  assert.deepEqual(soon.map((s) => [s.c.id, s.days]), [[1, 1], [2, 7]])
  assert.equal(later, 2)
})
