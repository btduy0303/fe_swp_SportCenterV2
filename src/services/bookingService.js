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

  // Lấy danh sách lịch 1-1 của cá nhân
  async getMyCoachSlots(token) {
    const res = await fetch('/api/member/coach-slots/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải lịch 1-1 cá nhân')
  },

  // Vào danh sách chờ khi lớp học đã đầy (BR-WL-01)
  async joinWaitlist(token, classId, acknowledgeAdvancedWarning = false) {
    const res = await fetch(`/api/member/class-registrations/${classId}/waitlist?acknowledgeAdvancedWarning=${acknowledgeAdvancedWarning}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Không thể tham gia danh sách chờ')
  },

  // Tạo link thanh toán PayOS cho đăng ký lớp
  async payClassOnline(token, registrationId) {
    return await apiRequest('POST', `/api/member/class-registrations/${registrationId}/online-payment`, { token, errorMsg: 'Tạo giao dịch thanh toán thất bại' })
  },

  async checkClassPayment(token, registrationId) {
    return await apiRequest('POST', `/api/member/class-registrations/${registrationId}/online-payment/check`, { token, errorMsg: 'Kiểm tra thanh toán thất bại' })
  },

  // Dời một buổi 1-1 đã trả tiền sang ngày và khung giờ khác. body: { date, timeSlotId, coachId? }
  async rescheduleCoachSlot(token, slotId, body) {
    return await apiRequest('POST', `/api/member/coach-slots/${slotId}/reschedule`, { token, body, errorMsg: 'Dời lịch thất bại' })
  },

  // Yêu cầu 1-1 nhiều buổi: gửi, xem, hủy, rồi trả tiền một lần cho cả chuỗi sau khi được duyệt
  // Gói 1-1 đang bán (lọc theo môn nếu có)
  async getOneOnOnePackages(sportCategoryId) {
    const q = sportCategoryId ? `?sportCategoryId=${sportCategoryId}` : ''
    return await apiRequest('GET', `/api/one-on-one-packages${q}`, { errorMsg: 'Không thể tải các gói 1-1' })
  },

  // Lịch bận của coach từ ngày from đến ngày to (yyyy-MM-dd), để hội viên tránh chọn giờ đã kín
  async getCoachBusy(token, coachId, from, to) {
    return await apiRequest('GET', `/api/member/coach-options/${coachId}/busy?from=${from}&to=${to}`, { token, errorMsg: 'Không thể tải lịch của huấn luyện viên' })
  },

  async getCoachOptions(token) {
    return await apiRequest('GET', '/api/member/coach-options', { token, errorMsg: 'Không thể tải danh sách huấn luyện viên' })
  },

  async submitCoachRequest(token, body) {
    return await apiRequest('POST', '/api/member/coach-requests', { token, body, errorMsg: 'Gửi yêu cầu thất bại' })
  },

  async getMyCoachRequests(token) {
    return await apiRequest('GET', '/api/member/coach-requests', { token, errorMsg: 'Không thể tải yêu cầu 1-1' })
  },

  async cancelCoachRequest(token, id) {
    return await apiRequest('POST', `/api/member/coach-requests/${id}/cancel`, { token, errorMsg: 'Hủy yêu cầu thất bại' })
  },

  async payCoachRequestOnline(token, id) {
    return await apiRequest('POST', `/api/member/coach-requests/${id}/online-payment`, { token, errorMsg: 'Tạo giao dịch thanh toán thất bại' })
  },

  async checkCoachRequestPayment(token, id) {
    return await apiRequest('POST', `/api/member/coach-requests/${id}/online-payment/check`, { token, errorMsg: 'Kiểm tra thanh toán thất bại' })
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
