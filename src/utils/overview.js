// Tính toán cho trang Tổng quan của hội viên: tuần này, chuỗi buổi liên tiếp, lịch điểm danh nhiều tuần.
// Mọi ngày là chuỗi yyyy-MM-dd theo giờ máy, cùng dạng với ngày BE trả về.
const pad = (n) => String(n).padStart(2, '0')
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7))

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
export const isAttended = (a) => a.status === 'PRESENT' || a.status === 'LATE'
const isSession = (t) => t.status !== 'CANCELED_BY_CENTER' && !t.declined

// 7 ngày của tuần chứa `today`. state: ok (đã có mặt), now (hôm nay), miss (vắng), plan (sắp tới), rest (không có buổi)
export function buildWeek(today, timetable, attendance) {
  const todayKey = dateKey(today)
  const start = mondayOf(today)
  const keys = DAY_LABELS.map((_, i) => dateKey(addDays(start, i)))
  const sessions = timetable.filter(isSession).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const attended = new Set(attendance.filter(isAttended).map((a) => a.date))
  const absent = new Set(attendance.filter((a) => a.status === 'ABSENT').map((a) => a.date))
  const days = keys.map((key, i) => {
    const todays = sessions.filter((s) => s.date === key)
    const first = todays[0]
    let state = 'rest'
    let note = 'Nghỉ'
    if (attended.has(key)) { state = 'ok'; note = first?.title || 'Có mặt' }
    else if (key === todayKey) { state = 'now'; note = first?.startTime || 'Hôm nay' }
    else if (key < todayKey && absent.has(key)) { state = 'miss'; note = 'Vắng' }
    else if (first) { state = key > todayKey ? 'plan' : 'rest'; note = first.startTime }
    return { key, label: DAY_LABELS[i], state, note }
  })
  const done = attendance.filter((a) => isAttended(a) && keys.includes(a.date)).length
  const total = Math.max(sessions.filter((s) => keys.includes(s.date)).length, done)
  return { days, done, total, todaySession: sessions.find((s) => s.date === todayKey) || null }
}

// Số buổi có mặt/đến muộn liên tiếp tính ngược từ buổi gần nhất; vắng thì dừng, buổi chưa điểm danh hoặc có phép bị bỏ qua
export function streak(attendance, today) {
  const todayKey = dateKey(today)
  const past = attendance.filter((a) => a.date <= todayKey)
    .sort((a, b) => `${b.date}${b.startTime || ''}`.localeCompare(`${a.date}${a.startTime || ''}`))
  let count = 0
  for (const a of past) {
    if (isAttended(a)) count += 1
    else if (a.status === 'ABSENT') break
  }
  return count
}

// Lưới `weeks` tuần kết thúc ở tuần hiện tại, mỗi ô là một ngày.
// state: y có mặt, a vắng, e có phép, n không có buổi, f chưa tới, t hôm nay (kèm status là kết quả của ngày đó nếu có)
export function recentWeeks(today, attendance, weeks = 5) {
  const todayKey = dateKey(today)
  const byDay = {}
  const rank = { y: 3, a: 2, e: 1 }
  for (const a of attendance) {
    const s = isAttended(a) ? 'y' : a.status === 'ABSENT' ? 'a' : a.status === 'EXCUSED' ? 'e' : null
    if (s && (rank[s] > (rank[byDay[a.date]] || 0))) byDay[a.date] = s
  }
  const start = addDays(mondayOf(today), -7 * (weeks - 1))
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = addDays(start, i)
    const key = dateKey(d)
    const result = byDay[key] || 'n'
    return { key, day: d.getDate(), month: d.getMonth() + 1, state: key === todayKey ? 't' : key > todayKey ? 'f' : result, result }
  })
}

// Các hạng đang bán (mỗi tierLevel một bậc) và vị trí của hạng `tierLevel` trong đó.
// index = số hạng có tierLevel <= tierLevel (0 nếu chưa có gói); next = hạng ngay trên, null nếu đã ở đỉnh
export function tierInfo(packages, tierLevel) {
  const tiers = [...new Map((packages || []).map((p) => [p.tierLevel, p])).values()].sort((a, b) => a.tierLevel - b.tierLevel)
  const index = tierLevel == null ? 0 : tiers.filter((t) => t.tierLevel <= tierLevel).length
  return { tiers, index, next: tiers[index] || null }
}
