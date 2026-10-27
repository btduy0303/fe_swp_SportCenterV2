import { parseApiResponse, apiRequest } from './apiHelper'

// Dịch vụ gọi API cho Huấn Luyện Viên (Coach)
export const coachService = {
  // Lấy lịch dạy các lớp của HLV
  async getMyClassSessions(token) {
    const res = await fetch('/api/coach/class-sessions/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải lịch dạy')
  },

  // Lấy danh sách các slot 1-1 của HLV
  async getMy1On1Slots(token) {
    const res = await fetch('/api/coach/slots/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải suất tập 1-1')
  },

  // Mở thêm slot 1-1 mới
  async create1On1Slot(token, payload) {
    const res = await fetch('/api/coach/slots', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Mở slot 1-1 thất bại')
  },

  // Hủy slot 1-1
  // Hủy suất đã có người giữ/đặt: BE bắt buộc có lý do
  async cancel1On1Slot(token, slotId, reason = 'Coach hủy suất') {
    return await apiRequest('POST', `/api/coach/slots/${slotId}/cancel`, { token, body: { reason }, errorMsg: 'Hủy suất tập thất bại' })
  },

  // Danh sách khung giờ cố định của trung tâm
  async getTimeSlots() {
    return await apiRequest('GET', '/api/time-slots', { errorMsg: 'Không thể tải khung giờ' })
  },

  // Xóa slot 1-1 chưa có người đặt
  async delete1On1Slot(token, slotId) {
    const res = await fetch(`/api/coach/slots/${slotId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Xóa slot thất bại')
  },

  // Ghi kết quả đánh giá thể lực
  async submitAssessmentResult(token, slotId, payload) {
    const res = await fetch(`/api/coach/assessment-slots/${slotId}/result`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Ghi nhận kết quả thất bại')
  },

  // Khung giờ còn trống để mở suất 1-1 (from, to dạng yyyy-MM-dd)
  async getSlotAvailability(token, from, to) {
    return await apiRequest('GET', '/api/coach/time-slots/availability', { token, query: { from, to }, errorMsg: 'Không thể tải khung giờ trống' })
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
