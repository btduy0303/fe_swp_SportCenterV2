import { dateKey } from './overview.js'

const toDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Doanh thu từng ngày từ mùng 1 tới hôm nay. Ngày không có giao dịch tính 0 để cột biểu đồ không bị nhảy
export function revenueByDay(lines, today) {
  const byKey = new Map((lines || []).map((l) => [l.label, Number(l.amount) || 0]))
  return Array.from({ length: today.getDate() }, (_, i) => {
    const key = dateKey(new Date(today.getFullYear(), today.getMonth(), i + 1))
    return { key, day: i + 1, amount: byKey.get(key) || 0 }
  })
}

const pad = (n) => String(n).padStart(2, '0')
const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

// Lịch hôm nay: buổi lớp (bỏ buổi đã hủy) và buổi 1-1 đã có người giữ chỗ hoặc đặt, xếp theo giờ.
// state: done = đã xong, now = đang diễn ra, next = sắp tới
export function todaySchedule(sessions, slots, now) {
  const items = [
    ...sessions.filter((s) => !s.status.startsWith('CANCELED')).map((s) => ({
      key: `c${s.id}`, kind: 'class', start: String(s.startTime).slice(0, 5), end: String(s.endTime).slice(0, 5),
      title: s.makeup ? `${s.className} (học bù)` : s.className, sub: `${s.roomName} · Coach ${s.coachName}`,
    })),
    ...slots.filter((s) => s.status === 'HELD' || s.status === 'BOOKED').map((s) => ({
      key: `o${s.id}`, kind: 'one', start: clock(new Date(s.startAt)), end: clock(new Date(s.endAt)),
      title: `${s.sportName || 'Buổi 1-1'} · ${s.memberName}`, sub: ['Buổi 1-1', s.roomName, `Coach ${s.coachName}`].filter(Boolean).join(' · '),
    })),
  ]
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return items
    .map((i) => ({ ...i, state: minutes(i.end) <= nowMin ? 'done' : minutes(i.start) <= nowMin ? 'now' : 'next' }))
    .sort((a, b) => a.start.localeCompare(b.start))
}

// Lớp còn nháp: soon là lớp khai giảng trong vòng withinDays ngày tới (kèm số ngày còn lại), later là số lớp nháp còn lại
export function draftClasses(classes, today, withinDays = 7) {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const soon = []
  let later = 0
  for (const c of classes) {
    if (c.status !== 'DRAFT') continue
    const days = Math.round((toDate(c.startDate) - from) / 86400000)
    if (days >= 0 && days <= withinDays) soon.push({ c, days })
    else later += 1
  }
  return { soon: soon.sort((a, b) => a.days - b.days), later }
}
