export const DAY_SHORT = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN' }
export const DAY_LONG = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ nhật' }

export const hhmm = (t) => String(t).slice(0, 5)

// Lịch tuần của một lớp thành chữ dễ đọc, ví dụ "T2, T4 · 20:00-21:45 · Phòng Yoga"
export function scheduleText(rows) {
  if (!rows || rows.length === 0) return 'Chưa xếp lịch'
  const groups = new Map()
  for (const r of rows) {
    const key = `${hhmm(r.startTime)}-${hhmm(r.endTime)} · ${r.roomName}`
    groups.set(key, [...(groups.get(key) || []), r.dayOfWeek])
  }
  return [...groups].map(([key, days]) => `${days.sort().map((d) => DAY_SHORT[d]).join(', ')} · ${key}`).join(' | ')
}

// Gom danh sách lịch của mọi lớp thành { classId: [rows] }
export function groupByClass(rows) {
  const map = {}
  for (const r of rows || []) (map[r.classId] ||= []).push(r)
  return map
}

export const STATUS_VI = {
  DRAFT: 'Nháp', OPEN: 'Đang mở đăng ký', IN_PROGRESS: 'Đang học', COMPLETED: 'Đã kết thúc', CANCELED: 'Đã hủy',
}
