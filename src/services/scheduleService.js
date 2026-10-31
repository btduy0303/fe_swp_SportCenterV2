import { apiRequest } from './apiHelper'

// Dịch vụ gọi API lịch học cố định theo tuần của lớp (class_schedules)
export const scheduleService = {
  async getAll(token) {
    return await apiRequest('GET', '/api/class-schedules', { token, errorMsg: 'Không thể tải lịch học' })
  },

  async getByClass(token, classId) {
    return await apiRequest('GET', `/api/class-schedules/class/${classId}`, { token, errorMsg: 'Không thể tải lịch của lớp' })
  },

}
