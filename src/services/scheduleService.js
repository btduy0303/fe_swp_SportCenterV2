import { apiRequest } from './apiHelper'

// Dịch vụ gọi API lịch học cố định theo tuần của lớp (class_schedules)
export const scheduleService = {
  async getAll(token) {
    return await apiRequest('GET', '/api/class-schedules', { token, errorMsg: 'Không thể tải lịch học' })
  },

  async getById(token, id) {
    return await apiRequest('GET', `/api/class-schedules/${id}`, { token, errorMsg: 'Không thể tải lịch học' })
  },

  async getByClass(token, classId) {
    return await apiRequest('GET', `/api/class-schedules/class/${classId}`, { token, errorMsg: 'Không thể tải lịch của lớp' })
  },

  // dayOfWeek: 1 (thứ 2) đến 7 (chủ nhật)
  async getByDay(token, dayOfWeek) {
    return await apiRequest('GET', `/api/class-schedules/day/${dayOfWeek}`, { token, errorMsg: 'Không thể tải lịch theo ngày' })
  },

  // Lịch dạy của coach đang đăng nhập
  async getMyCoachSchedules(token) {
    return await apiRequest('GET', '/api/class-schedules/coach/me', { token, errorMsg: 'Không thể tải lịch dạy' })
  },
}
