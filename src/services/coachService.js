import { parseApiResponse, apiRequest } from './apiHelper'

// Dịch vụ gọi API cho Huấn Luyện Viên (Coach)
export const coachService = {
  // Lấy lịch dạy các lớp của HLV
  async getMyClassSessions(token, from, to) {
    return await apiRequest('GET', '/api/coach/class-sessions/me', { token, query: { from, to }, errorMsg: 'Không thể tải lịch dạy' })
  },

  // Lấy danh sách các slot 1-1 của HLV
  async getMy1On1Slots(token, signal) {
    const res = await fetch('/api/coach/slots/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
    return await parseApiResponse(res, 'Không thể tải suất tập 1-1')
  },

  // Danh sách khung giờ cố định của trung tâm
  async getTimeSlots() {
    return await apiRequest('GET', '/api/time-slots', { errorMsg: 'Không thể tải khung giờ' })
  },

  // Danh sách học viên và nhận xét của một lớp mình dạy
  async getClassEvaluations(token, classId) {
    return await apiRequest('GET', `/api/coach/classes/${classId}/evaluations`, { token, errorMsg: 'Không thể tải đánh giá học viên' })
  },

  // Nhận xét một học viên: { grade, comment }
  async evaluateStudent(token, classId, registrationId, payload) {
    return await apiRequest('POST', `/api/coach/classes/${classId}/evaluations/${registrationId}`, { token, body: payload, errorMsg: 'Lưu đánh giá thất bại' })
  },
}
