import { parseApiResponse } from './apiHelper'

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
}
