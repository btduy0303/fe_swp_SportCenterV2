// Các buổi 1-1: lấy `sessions` ngày đầu tiên từ firstDate (yyyy-MM-dd) trở đi có thứ nằm trong slotByWeekday,
// mỗi ngày kèm khung giờ của thứ đó. slotByWeekday: { thứ: timeSlotId }, thứ theo kiểu backend: 1 = thứ 2 đến 7 = chủ nhật.
export function sessionPlan(firstDate, slotByWeekday, sessions) {
  const count = Number(sessions) || 0
  if (!firstDate || count < 1 || Object.keys(slotByWeekday).length === 0) return []
  const [y, m, d] = firstDate.split('-').map(Number)
  const plan = []
  for (let i = 0; plan.length < count; i += 1) {
    const day = new Date(y, m - 1, d + i)
    const iso = day.getDay() === 0 ? 7 : day.getDay()
    if (slotByWeekday[iso]) plan.push({ date: day, weekday: iso, timeSlotId: slotByWeekday[iso] })
  }
  return plan
}

export const weekdayLabel = (d) => (d === 7 ? 'CN' : `T${d + 1}`)

const hm = (t) => String(t).slice(0, 5)

// "T2 10:00 – 11:00, T4 17:00 – 18:00" từ danh sách days của yêu cầu
export const daysText = (days = []) => days.map((d) => `${weekdayLabel(d.weekday)} ${hm(d.startTime)} – ${hm(d.endTime)}`).join(', ')
