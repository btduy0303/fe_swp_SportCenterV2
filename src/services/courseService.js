import { apiRequest } from './apiHelper'

// Dịch vụ gọi API khóa học (courses): mẫu để mở lớp
export const courseService = {
  // filters: { sportCategoryId, level, active }
  async list(token, filters = {}) {
    return await apiRequest('GET', '/api/courses', { token, query: filters, errorMsg: 'Không thể tải danh sách khóa học' })
  },

  // payload: { sportCategoryId, name, description, level, totalSessions, defaultTuition, prerequisiteCourseId }
  async create(token, payload) {
    return await apiRequest('POST', '/api/courses', { token, body: payload, errorMsg: 'Tạo khóa học thất bại' })
  },

  async update(token, id, payload) {
    return await apiRequest('PUT', `/api/courses/${id}`, { token, body: payload, errorMsg: 'Cập nhật khóa học thất bại' })
  },

  async setActive(token, id, active) {
    return await apiRequest('PATCH', `/api/courses/${id}/active`, { token, body: { active }, errorMsg: 'Đổi trạng thái khóa học thất bại' })
  },
}
