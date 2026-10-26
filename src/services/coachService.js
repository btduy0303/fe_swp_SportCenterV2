import { parseApiResponse } from './apiHelper'

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
  async cancel1On1Slot(token, slotId) {
    const res = await fetch(`/api/coach/slots/${slotId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Hủy slot 1-1 thất bại')
  },

  // Xóa slot 1-1
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
}
