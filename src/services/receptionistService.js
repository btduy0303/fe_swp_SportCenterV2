import { parseApiResponse, apiRequest } from './apiHelper'

// Dịch vụ gọi API cho Nhân Viên Lễ Tân (Receptionist)
export const receptionistService = {
  // Tìm kiếm danh sách hội viên
  async searchMembers(token, keyword = '') {
    const url = keyword ? `/api/receptionist/members?name=${encodeURIComponent(keyword)}` : '/api/receptionist/members'
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải danh sách hội viên')
  },

  // Tạo tài khoản hội viên trực tiếp tại quầy
  async registerMemberAtDesk(token, payload) {
    const res = await fetch('/api/receptionist/members', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Đăng ký tại quầy không thành công')
  },

  // Đăng ký gói tập cho hội viên tại quầy
  async subscribeMemberPackage(token, memberId, packageId, months = 1) {
    const res = await fetch(`/api/receptionist/members/${memberId}/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packageId, months }),
    })
    return await parseApiResponse(res, 'Gán gói tập cho hội viên thất bại')
  },

  // Thu tiền mặt cho gói tập
  async confirmCashPayment(token, subscriptionId, memberId, amount) {
    const res = await fetch('/api/receptionist/payments/cash', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId, memberId, amount }),
    })
    return await parseApiResponse(res, 'Thu tiền mặt thất bại')
  },

  // Hủy đơn mua gói chờ thanh toán
  async cancelSubscription(token, memberId, subscriptionId) {
    const res = await fetch(`/api/receptionist/members/${memberId}/subscriptions/${subscriptionId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Hủy gói không thành công')
  },

  async getMemberSubscriptions(token, memberId) {
    return await apiRequest('GET', `/api/receptionist/members/${memberId}/subscriptions`, { token, errorMsg: 'Không thể tải gói của hội viên' })
  },

  async renewMemberPackage(token, memberId, packageId, months = 1, voucherId) {
    return await apiRequest('POST', `/api/receptionist/members/${memberId}/subscriptions/renew`, { token, body: { packageId, months, voucherId }, errorMsg: 'Gia hạn gói thất bại' })
  },

  async upgradeMemberPackage(token, memberId, packageId, months = 1, voucherId) {
    return await apiRequest('POST', `/api/receptionist/members/${memberId}/subscriptions/upgrade`, { token, body: { packageId, months, voucherId }, errorMsg: 'Nâng hạng gói thất bại' })
  },

  async getMemberVouchers(token, memberId, status) {
    return await apiRequest('GET', `/api/receptionist/members/${memberId}/vouchers`, { token, query: { status }, errorMsg: 'Không thể tải voucher của hội viên' })
  },

  async getMemberClassRegistrations(token, memberId) {
    return await apiRequest('GET', `/api/receptionist/members/${memberId}/class-registrations`, { token, errorMsg: 'Không thể tải lớp của hội viên' })
  },

  // Đăng ký lớp giúp hội viên
  async registerClassForMember(token, userId, classId, acknowledgeAdvancedWarning = false) {
    return await apiRequest('POST', '/api/receptionist/class-registrations', { token, body: { userId, classId, acknowledgeAdvancedWarning }, errorMsg: 'Đăng ký lớp giúp hội viên thất bại' })
  },

  async cancelClassRegistration(token, registrationId) {
    return await apiRequest('PATCH', `/api/receptionist/class-registrations/${registrationId}/cancel`, { token, errorMsg: 'Hủy đăng ký lớp thất bại' })
  },

  async payClassRegistrationCash(token, registrationId, voucherId) {
    return await apiRequest('POST', `/api/receptionist/class-registrations/${registrationId}/cash-payment`, { token, query: { voucherId }, errorMsg: 'Thu tiền mặt thất bại' })
  },

  async getMemberCoachSlots(token, memberId) {
    return await apiRequest('GET', `/api/receptionist/members/${memberId}/coach-slots`, { token, errorMsg: 'Không thể tải buổi 1-1 của hội viên' })
  },

  async payCoachSlotCash(token, slotId, voucherId) {
    return await apiRequest('POST', `/api/receptionist/coach-slots/${slotId}/cash-payment`, { token, query: { voucherId }, errorMsg: 'Thu tiền mặt thất bại' })
  },

  async cancelCoachSlot(token, slotId) {
    return await apiRequest('PATCH', `/api/receptionist/coach-slots/${slotId}/cancel`, { token, errorMsg: 'Hủy suất 1-1 thất bại' })
  },

  async getMemberPayments(token, memberId) {
    return await apiRequest('GET', '/api/receptionist/payments', { token, query: { memberId }, errorMsg: 'Không thể tải lịch sử thanh toán' })
  },

  async getInvoice(token, paymentId) {
    return await apiRequest('GET', `/api/receptionist/payments/${paymentId}/invoice`, { token, errorMsg: 'Không thể tải hóa đơn' })
  },
}
