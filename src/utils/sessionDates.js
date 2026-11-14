// Các buổi 1-1: đi từng ngày từ firstDate (yyyy-MM-dd), mỗi khung giờ của thứ đó là một buổi (giờ sớm trước), đến khi đủ
// `sessions` buổi. slotsByWeekday: { thứ: [timeSlotId, ...] } đã xếp theo giờ, thứ theo kiểu backend: 1 = thứ 2 đến 7 = chủ nhật.
export function sessionPlan(firstDate, slotsByWeekday, sessions) {
  const count = Number(sessions) || 0
  const hasAny = Object.values(slotsByWeekday).some((ids) => ids.length > 0)
  if (!firstDate || count < 1 || !hasAny) return []
  const [y, m, d] = firstDate.split('-').map(Number)
  const plan = []
  for (let i = 0; plan.length < count; i += 1) {
    const day = new Date(y, m - 1, d + i)
    const iso = day.getDay() === 0 ? 7 : day.getDay()
    for (const timeSlotId of slotsByWeekday[iso] || []) {
      if (plan.length < count) plan.push({ date: day, weekday: iso, timeSlotId })
    }
  }
  return plan
}

// { thứ: [timeSlotId, ...] } từ danh sách { weekday, timeSlotId, startTime }, khung giờ sớm trước
export function slotsByWeekday(days = []) {
  const map = {}
  ;[...days].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
    .forEach((d) => { (map[d.weekday] ||= []).push(d.timeSlotId) })
  return map
}

export const weekdayLabel = (d) => (d === 7 ? 'CN' : `T${d + 1}`)

const hm = (t) => String(t).slice(0, 5)

// Lịch tuần gọn, gom theo thứ: "T2 06:00, 08:00 · T7 10:00" (chỉ giờ bắt đầu) từ danh sách days của yêu cầu
export const weeklyText = (days = []) => {
  const byDay = new Map()
  ;[...days].sort((a, b) => a.weekday - b.weekday || String(a.startTime).localeCompare(String(b.startTime)))
    .forEach((d) => byDay.set(d.weekday, [...(byDay.get(d.weekday) || []), hm(d.startTime)]))
  return [...byDay].map(([w, times]) => `${weekdayLabel(w)} ${times.join(', ')}`).join(' · ')
}

// "T2 10:00 – 11:00, T4 17:00 – 18:00" từ danh sách days của yêu cầu
export const daysText = (days = []) => [...days]
  .sort((a, b) => a.weekday - b.weekday || String(a.startTime).localeCompare(String(b.startTime)))
  .map((d) => `${weekdayLabel(d.weekday)} ${hm(d.startTime)} – ${hm(d.endTime)}`).join(', ')
