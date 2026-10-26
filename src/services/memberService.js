import { parseApiResponse } from './apiHelper'

// Dịch vụ gọi API đăng ký gói tập, thanh toán và quản lý hội viên (Flow 1)
export const memberService = {
  // Lấy gói tập hiện tại của hội viên
  async getMySubscription(token) {
    const res = await fetch('/api/member/subscriptions/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await parseApiResponse(res, 'Không thể tải gói tập')
  },

  // Đăng ký mua gói hội viên
  async subscribePackage(token, packageId, months = 1) {
    const res = await fetch('/api/member/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packageId, months }),
    })
    return await parseApiResponse(res, 'Không thể đăng ký gói')
  },

  // Tạo liên kết thanh toán PayOS
  async createPaymentUrl(token, subscriptionId) {
    const res = await fetch(`/api/member/subscriptions/${subscriptionId}/online-payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Tạo giao dịch thanh toán thất bại')
  },

  // Kiểm tra trạng thái thanh toán online
  async checkPaymentStatus(token, subscriptionId) {
    const res = await fetch(`/api/member/subscriptions/${subscriptionId}/online-payment/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Kiểm tra trạng thái thất bại')
  },

  // Hủy đơn mua gói
  async cancelSubscription(token, subscriptionId) {
    const res = await fetch(`/api/member/subscriptions/${subscriptionId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Hủy gói không thành công')
  },

  // Xem lịch sử thanh toán hóa đơn
  async getMyPayments(token) {
    const res = await fetch('/api/member/payments/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải lịch sử thanh toán')
  },

  // Danh sách voucher cá nhân
  async getMyVouchers(token) {
    const res = await fetch('/api/member/vouchers', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải voucher')
  },

  // Gia hạn gói hội viên (BR-PKG-09)
  async renewSubscription(token, packageId, months = 1) {
    const res = await fetch('/api/member/subscriptions/renew', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packageId, months }),
    })
    return await parseApiResponse(res, 'Gia hạn gói thất bại')
  },

  // Nâng cấp gói hội viên (BR-PKG-10)
  async upgradeSubscription(token, packageId, months = 1) {
    const res = await fetch('/api/member/subscriptions/upgrade', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packageId, months }),
    })
    return await parseApiResponse(res, 'Nâng cấp gói thất bại')
  },

  // Đổi mã voucher chiến dịch (BR-VCH-02)
  async redeemVoucher(token, code) {
    const res = await fetch('/api/member/vouchers/redeem', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    })
    return await parseApiResponse(res, 'Nhập mã voucher thất bại')
  },
}
