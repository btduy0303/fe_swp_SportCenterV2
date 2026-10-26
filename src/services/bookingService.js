import { parseApiResponse } from './apiHelper'

// Dịch vụ gọi API đăng ký lớp, đặt lịch 1-1 và đánh giá thể lực (Flow 2)
export const bookingService = {
  // Đăng ký tham gia lớp học
  async registerClass(token, classId) {
    const res = await fetch(`/api/member/class-registrations/${classId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Đăng ký lớp học không thành công')
  },

  // Danh sách các lớp đã đăng ký của hội viên
  async getMyClassRegistrations(token) {
    const res = await fetch('/api/member/class-registrations/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải danh sách lớp đã đăng ký')
  },

  // Hủy đăng ký lớp học
  async cancelClassRegistration(token, registrationId) {
    const res = await fetch(`/api/member/class-registrations/${registrationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Hủy đăng ký lớp không thành công')
  },

  // Danh sách suất tập 1-1 còn trống của các huấn luyện viên
  async getAvailableCoachSlots(token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch('/api/coach-slots', { headers })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải suất tập 1-1')
  },

  // Đặt lịch buổi tập 1-1 với huấn luyện viên
  async bookCoachSlot(token, slotId) {
    const res = await fetch(`/api/member/coach-slots/${slotId}/book`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Đặt lịch 1-1 không thành công')
  },

  // Lấy danh sách lịch 1-1 của cá nhân
  async getMyCoachSlots(token) {
    const res = await fetch('/api/member/coach-slots/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải lịch 1-1 cá nhân')
  },

  // Hủy lịch hẹn 1-1
  async cancelCoachSlot(token, bookingId) {
    const res = await fetch(`/api/member/coach-slots/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Hủy lịch 1-1 không thành công')
  },

  // Vào danh sách chờ khi lớp học đã đầy (BR-WL-01)
  async joinWaitlist(token, classId) {
    const res = await fetch(`/api/member/class-registrations/${classId}/waitlist`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Không thể tham gia danh sách chờ')
  },

  // Xem các khung giờ đánh giá thể lực còn trống (BR-ASM-01)
  async getAssessmentSlots(token) {
    const res = await fetch('/api/assessment-slots', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải lịch đánh giá thể lực')
  },

  // Đặt lịch đánh giá thể lực (BR-ASM-01)
  async bookAssessmentSlot(token, slotId) {
    const res = await fetch(`/api/member/assessment-slots/${slotId}/book`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Đặt lịch đánh giá thể lực không thành công')
  },

  // Hủy lịch đánh giá thể lực
  async cancelAssessmentSlot(token, slotId) {
    const res = await fetch(`/api/member/assessment-slots/${slotId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Hủy lịch đánh giá không thành công')
  },

  // Danh sách lịch đánh giá thể lực sắp tới của tôi
  async getMyAssessments(token) {
    const res = await fetch('/api/member/assessment-slots/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải lịch hẹn đánh giá')
  },

  // Lịch sử đo lường thể lực và tiến độ (BMI, cân nặng)
  async getMyFitnessProgress(token) {
    const res = await fetch('/api/member/fitness-progress/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải tiến độ thể lực')
  },
}
