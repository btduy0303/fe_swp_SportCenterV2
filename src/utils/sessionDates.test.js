import test from 'node:test'
import assert from 'node:assert/strict'
import { daysText, sessionPlan, weekdayLabel } from './sessionDates.js'

const fmt = (plan) => plan.map((p) => `${p.date.getMonth() + 1}/${p.date.getDate()}@${p.timeSlotId}`)

test('each chosen weekday keeps its own time slot', () => {
  // Thứ 2 02/11/2026: thứ 2 lúc khung 1, thứ 4 lúc khung 2
  assert.deepEqual(fmt(sessionPlan('2026-11-02', { 1: 1, 3: 2 }, 4)), ['11/2@1', '11/4@2', '11/9@1', '11/11@2'])
})

test('the first session is the first matching day after the start date', () => {
  // Thứ 3 03/11 không nằm trong danh sách nên buổi đầu là thứ 4 04/11
  assert.deepEqual(fmt(sessionPlan('2026-11-03', { 3: 5, 7: 5 }, 3)), ['11/4@5', '11/8@5', '11/11@5'])
})

test('no weekdays or no sessions gives no plan', () => {
  assert.deepEqual(sessionPlan('2026-11-02', {}, 3), [])
  assert.deepEqual(sessionPlan('2026-11-02', { 1: 1 }, 0), [])
  assert.deepEqual(sessionPlan('', { 1: 1 }, 3), [])
})

test('labels and text use T2 to CN with the time of each day', () => {
  assert.equal(weekdayLabel(7), 'CN')
  assert.equal(daysText([{ weekday: 1, startTime: '10:00:00', endTime: '11:00:00' }, { weekday: 3, startTime: '17:00:00', endTime: '18:00:00' }]),
    'T2 10:00 – 11:00, T4 17:00 – 18:00')
})
