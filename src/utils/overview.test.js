import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWeek, recentWeeks, streak, tierInfo } from './overview.js'

const today = new Date(2026, 10, 5) // Thứ Năm 05/11/2026
const att = (date, status) => ({ date, status, startTime: '18:00' })

test('week runs Monday to Sunday and counts attended against scheduled sessions', () => {
  const timetable = [
    { date: '2026-11-02', startTime: '07:00', title: 'Yoga', status: 'DONE' },
    { date: '2026-11-05', startTime: '18:00', title: 'Boxing', status: 'SCHEDULED' },
    { date: '2026-11-06', startTime: '07:00', title: 'Yoga', status: 'SCHEDULED' },
    { date: '2026-11-04', startTime: '09:00', title: 'Hủy', status: 'CANCELED_BY_CENTER' },
  ]
  const week = buildWeek(today, timetable, [att('2026-11-02', 'PRESENT')])
  assert.deepEqual(week.days.map((d) => d.key), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
  assert.deepEqual(week.days.map((d) => d.state), ['ok', 'rest', 'rest', 'now', 'plan', 'rest', 'rest'])
  assert.equal(week.done, 1)
  assert.equal(week.total, 3)
  assert.equal(week.todaySession.title, 'Boxing')
})

test('streak stops at an absence and skips unmarked sessions', () => {
  const list = [att('2026-11-04', 'PRESENT'), att('2026-11-03', null), att('2026-11-02', 'LATE'), att('2026-10-30', 'ABSENT'), att('2026-10-28', 'PRESENT')]
  assert.equal(streak(list, today), 2)
  assert.equal(streak([], today), 0)
})

test('recent weeks grid has 35 day cells with numbers, results and today marked', () => {
  const cells = recentWeeks(today, [att('2026-11-04', 'PRESENT'), att('2026-11-03', 'ABSENT'), att('2026-11-02', 'EXCUSED'), att('2026-11-02', 'ABSENT')])
  assert.equal(cells.length, 35)
  assert.equal(cells[0].key, '2026-10-05')
  assert.equal(cells[0].day, 5)
  assert.equal(cells[31].state, 't')
  assert.equal(cells[30].state, 'y')
  assert.equal(cells[29].state, 'a')
  assert.equal(cells[28].state, 'a')
  assert.equal(cells[32].state, 'f')
  assert.equal(cells[1].state, 'n')
})

test('tier info counts sold tiers up to the member tier and finds the next one', () => {
  const pk = [{ tierLevel: 3, name: 'C' }, { tierLevel: 1, name: 'A' }, { tierLevel: 2, name: 'B' }, { tierLevel: 2, name: 'B2' }]
  assert.deepEqual([tierInfo(pk, 2).tiers.length, tierInfo(pk, 2).index, tierInfo(pk, 2).next.name], [3, 2, 'C'])
  assert.equal(tierInfo(pk, 3).next, null)
  assert.equal(tierInfo(pk, undefined).index, 0)
  assert.equal(tierInfo(undefined, 1).tiers.length, 0)
})
