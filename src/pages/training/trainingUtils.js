export const labels = {
  PRESENT: 'Có mặt', ABSENT: 'Vắng', LATE: 'Đến muộn', EXCUSED: 'Có phép', DECLINED_MAKEUP: 'Từ chối buổi bù',
  SCHEDULED: 'Đã lên lịch', DONE: 'Đã hoàn thành', PROPOSED: 'Đề xuất buổi bù', CANCELED_BY_CENTER: 'Đã hủy',
  DRAFT: 'Bản nháp', PUBLISHED: 'Đã giao', COMPLETED: 'Hoàn thành', ARCHIVED: 'Lưu trữ', PARTIAL: 'Một phần',
  NOT_COMPLETED: 'Chưa hoàn thành', OPEN: 'Đang mở', IN_PROGRESS: 'Đang học', CANCELED: 'Đã hủy',
}
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
export const displayDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN') : '—'
export const numeric = value => value === '' || value == null ? null : Number(value)

export const sessionStatusFilter = value => ['all', 'scheduled', 'completed'].includes(value) ? value : 'all'
export function filterSessions(sessions, classId, status, search) {
  const filter = sessionStatusFilter(status)
  const query = search.trim().toLocaleLowerCase('vi')
  return sessions.filter(session => (!classId || session.classId === Number(classId))
    && (filter === 'all' || session.status === (filter === 'completed' ? 'DONE' : 'SCHEDULED'))
    && `${session.className} ${session.room}`.toLocaleLowerCase('vi').includes(query))
}
