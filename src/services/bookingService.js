import { parseApiResponse, apiRequest } from './apiHelper'

// Dịch vụ gọi API đăng ký lớp, đặt lịch 1-1 và đánh giá thể lực (Flow 2)
export const bookingService = {
  // Đăng ký tham gia lớp học
  async registerClass(token, classId, acknowledgeAdvancedWarning = false) {
    const res = await fetch(`/api/member/class-registrations/${classId}?acknowledgeAdvancedWarning=${acknowledgeAdvancedWarning}`, {
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

  // Rời lớp đang học (buổi chưa học được hoàn theo quy định)
  async leaveClass(token, registrationId) {
    return await apiRequest('POST', `/api/member/class-registrations/${registrationId}/leave`, { token, errorMsg: 'Rời lớp không thành công' })
  },

  // Tạo link thanh toán PayOS cho đăng ký lớp (voucherId tùy chọn)
  async payClassOnline(token, registrationId, voucherId) {
    return await apiRequest('POST', `/api/member/class-registrations/${registrationId}/online-payment`, { token, query: { voucherId }, errorMsg: 'Tạo giao dịch thanh toán thất bại' })
  },

  async checkClassPayment(token, registrationId) {
    return await apiRequest('POST', `/api/member/class-registrations/${registrationId}/online-payment/check`, { token, errorMsg: 'Kiểm tra thanh toán thất bại' })
  },

  // Tạo link thanh toán PayOS cho buổi 1-1
  async payCoachSlotOnline(token, slotId, voucherId) {
    return await apiRequest('POST', `/api/member/coach-slots/${slotId}/online-payment`, { token, query: { voucherId }, errorMsg: 'Tạo giao dịch thanh toán thất bại' })
  },

  async checkCoachSlotPayment(token, slotId) {
    return await apiRequest('POST', `/api/member/coach-slots/${slotId}/online-payment/check`, { token, errorMsg: 'Kiểm tra thanh toán thất bại' })
  },

  // Từ chối buổi học bù, nhận hoàn tiền buổi đó
  async declineSession(token, sessionId) {
    return await apiRequest('POST', `/api/member/class-sessions/${sessionId}/decline`, { token, errorMsg: 'Từ chối buổi học không thành công' })
  },

  // Nhận xét của coach sau mỗi buổi học
  async getMyClassEvaluations(token) {
    return await apiRequest('GET', '/api/member/class-evaluations/me', { token, errorMsg: 'Không thể tải đánh giá của coach' })
  },
}
