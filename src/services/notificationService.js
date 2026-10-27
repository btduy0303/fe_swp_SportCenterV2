import { apiRequest } from './apiHelper'

// Dịch vụ gọi API thông báo của người dùng đăng nhập
export const notificationService = {
  async getMine(token, unreadOnly = false) {
    return await apiRequest('GET', '/api/notifications/me', { token, query: { unreadOnly }, errorMsg: 'Không thể tải thông báo' })
  },

  async markRead(token, id) {
    return await apiRequest('PATCH', `/api/notifications/${id}/read`, { token, errorMsg: 'Không thể đánh dấu đã đọc' })
  },

  async markAllRead(token) {
    return await apiRequest('PATCH', '/api/notifications/read-all', { token, errorMsg: 'Không thể đánh dấu đã đọc' })
  },
}
