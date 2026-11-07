import { parseApiResponse, apiRequest } from './apiHelper'


export const managerService = {

  async getAccounts(token) {
    const res = await fetch('/api/manager/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải danh sách tài khoản')
  },

  async createAccount(token, payload) {
    const res = await fetch('/api/manager/accounts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Tạo tài khoản thất bại')
  },

  async updateAccount(token, id, payload) {
    const res = await fetch(`/api/manager/accounts/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Cập nhật tài khoản thất bại')
  },

  async deactivateAccount(token, id) {
    const res = await fetch(`/api/manager/accounts/${id}/deactivate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Khóa tài khoản thất bại')
  },

  async activateAccount(token, id) {
    const res = await fetch(`/api/manager/accounts/${id}/active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Kích hoạt tài khoản thất bại')
  },


  async getRooms(token) {
    const res = await fetch('/api/rooms', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải phòng tập')
  },

  async createRoom(token, payload) {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Tạo phòng tập thất bại')
  },

  async updateRoom(token, id, payload) {
    const res = await fetch(`/api/rooms/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Cập nhật phòng tập thất bại')
  },

  async deleteRoom(token, id) {
    const res = await fetch(`/api/rooms/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Xóa phòng tập không thành công')
  },


  async getCategories(token) {
    const res = await fetch('/api/sport-categories', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải môn thể thao')
  },

  async createCategory(token, payload) {
    const res = await fetch('/api/sport-categories', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Tạo môn thể thao thất bại')
  },

  async updateCategory(token, id, payload) {
    const res = await fetch(`/api/sport-categories/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Cập nhật môn thể thao thất bại')
  },

  async deleteCategory(token, id) {
    const res = await fetch(`/api/sport-categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Xóa môn thể thao không thành công')
  },


  async getAllPackages(token) {
    const res = await fetch('/api/manager/packages', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải gói hội viên')
  },

  async deletePackage(token, id) {
    return await apiRequest('DELETE', `/api/manager/packages/${id}`, { token, errorMsg: 'Xóa gói thất bại' })
  },

  async setPackageActive(token, id, isActive) {
    return await apiRequest('PATCH', `/api/manager/packages/${id}/status`, { token, body: { isActive }, errorMsg: 'Đổi trạng thái gói thất bại' })
  },

  async createPackage(token, payload) {
    const res = await fetch('/api/manager/packages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Tạo gói hội viên thất bại')
  },

  async updatePackage(token, id, payload) {
    const res = await fetch(`/api/manager/packages/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Cập nhật gói hội viên thất bại')
  },


  async getClasses(token) {
    const res = await fetch('/api/sport-classes', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải lớp học')
  },

  async createClass(token, payload) {
    const res = await fetch('/api/sport-classes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Tạo lớp học thất bại')
  },

  async updateClass(token, id, payload) {
    const res = await fetch(`/api/sport-classes/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return await parseApiResponse(res, 'Cập nhật lớp học thất bại')
  },

  async cancelClass(token, id, reason = 'Hủy bởi Quản lý trung tâm') {
    const res = await fetch(`/api/sport-classes/${id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    })
    return await parseApiResponse(res, 'Hủy lớp học thất bại')
  },


  async getTimeSlots(token) {
    const res = await fetch('/api/manager/time-slots', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return await parseApiResponse(res, 'Không thể tải khung giờ')
  },

  // BE bắt buộc gửi { active } để bật hoặc tắt khung giờ
  async toggleTimeSlot(token, id, active) {
    return await apiRequest('PATCH', `/api/manager/time-slots/${id}/active`, { token, body: { active }, errorMsg: 'Đổi trạng thái slot thất bại' })
  },

  // --- Báo cáo ---
  // groupBy: DAY | MONTH | QUARTER, from/to dạng yyyy-MM-dd
  async getRevenueReport(token, from, to, groupBy = 'DAY') {
    return await apiRequest('GET', '/api/manager/reports/revenue', { token, query: { from, to, groupBy }, errorMsg: 'Không thể tải báo cáo doanh thu' })
  },

  // Từng giao dịch của một dòng doanh thu: lọc theo method (CASH, QR_GATEWAY) hoặc item (nhãn khoản thu)
  async getRevenuePayments(token, from, to, filter) {
    return await apiRequest('GET', '/api/manager/reports/revenue/payments', { token, query: { from, to, ...filter }, errorMsg: 'Không thể tải danh sách giao dịch' })
  },

  // Lấp đầy chỗ và chuyên cần của từng lớp
  async getClassPerformance(token) {
    return await apiRequest('GET', '/api/manager/reports/class-performance', { token, errorMsg: 'Không thể tải hiệu quả lớp' })
  },

  async getMemberReport(token, expiringWithinDays = 7) {
    return await apiRequest('GET', '/api/manager/reports/members', { token, query: { expiringWithinDays }, errorMsg: 'Không thể tải báo cáo hội viên' })
  },

  // status: AVAILABLE | MAINTENANCE | CLOSED
  async setRoomMaintenance(token, id, status) {
    return await apiRequest('PATCH', `/api/rooms/${id}/maintenance`, { token, body: { status }, errorMsg: 'Đổi trạng thái phòng thất bại' })
  },

  async setRoomSports(token, id, sportCategoryIds) {
    return await apiRequest('PUT', `/api/rooms/${id}/sports`, { token, body: { sportCategoryIds }, errorMsg: 'Gán môn cho phòng thất bại' })
  },

  // --- Coach ---
  async setCoachSports(token, coachId, sportCategoryIds) {
    return await apiRequest('PUT', `/api/coaches/${coachId}/sports`, { token, body: { sportCategoryIds }, errorMsg: 'Gán môn cho coach thất bại' })
  },

  // Coach nghỉ dài ngày: { from, to, reason }
  async coachLeave(token, coachId, payload) {
    return await apiRequest('POST', `/api/coaches/${coachId}/leave`, { token, body: payload, errorMsg: 'Ghi nhận coach nghỉ thất bại' })
  },

  async cancelCoachSlots(token, coachId, reason) {
    return await apiRequest('POST', `/api/coaches/${coachId}/cancel-slots`, { token, body: { reason }, errorMsg: 'Hủy suất 1-1 của coach thất bại' })
  },

  // --- Lịch 1-1 do trung tâm quyết định ---
  async getCoachSlots(token, { coachId, status, from, to } = {}) {
    return await apiRequest('GET', '/api/manager/coach-slots', { token, query: { coachId, status, from, to }, errorMsg: 'Không thể tải lịch 1-1' })
  },

  // Sự cố của buổi 1-1: ưu tiên đổi phòng, đổi coach, chờ xếp lại; hoàn tiền (cancelCoachSlot) là bước cuối
  // roomId / coachId bỏ trống thì hệ thống tự chọn phòng trống hoặc coach rảnh
  async changeCoachSlotRoom(token, slotId, roomId) {
    return await apiRequest('POST', `/api/manager/coach-slots/${slotId}/change-room`, { token, body: { roomId }, errorMsg: 'Đổi phòng thất bại' })
  },

  async changeCoachSlotCoach(token, slotId, coachId) {
    return await apiRequest('POST', `/api/manager/coach-slots/${slotId}/change-coach`, { token, body: { coachId }, errorMsg: 'Đổi coach thất bại' })
  },

  async markCoachSlotNeedsReschedule(token, slotId, reason) {
    return await apiRequest('POST', `/api/manager/coach-slots/${slotId}/needs-reschedule`, { token, body: { reason }, errorMsg: 'Chuyển sang chờ xếp lại thất bại' })
  },

  async cancelCoachSlot(token, slotId, reason) {
    return await apiRequest('POST', `/api/manager/coach-slots/${slotId}/cancel`, { token, body: { reason }, errorMsg: 'Hủy suất thất bại' })
  },

  // Yêu cầu 1-1 nhiều buổi của hội viên: duyệt cả chuỗi hoặc từ chối kèm lý do
  async getCoachRequests(token, status) {
    return await apiRequest('GET', '/api/manager/coach-requests', { token, query: { status }, errorMsg: 'Không thể tải yêu cầu 1-1' })
  },

  async approveCoachRequest(token, id) {
    return await apiRequest('POST', `/api/manager/coach-requests/${id}/approve`, { token, body: {}, errorMsg: 'Duyệt yêu cầu thất bại' })
  },

  async rejectCoachRequest(token, id, reason) {
    return await apiRequest('POST', `/api/manager/coach-requests/${id}/reject`, { token, body: { reason }, errorMsg: 'Từ chối yêu cầu thất bại' })
  },

  // --- Lớp học ---
  async getClass(token, id) {
    return await apiRequest('GET', `/api/sport-classes/${id}`, { token, errorMsg: 'Không thể tải lớp' })
  },

  async openClass(token, id) {
    return await apiRequest('PATCH', `/api/sport-classes/${id}/open`, { token, errorMsg: 'Mở đăng ký lớp thất bại' })
  },

  async replaceClassCoach(token, id, coachId, reason) {
    return await apiRequest('POST', `/api/sport-classes/${id}/replace-coach`, { token, body: { coachId, reason }, errorMsg: 'Đổi coach thất bại' })
  },

  // schedules: [{ roomId, dayOfWeek, timeSlotId }]
  async replaceClassSchedules(token, id, schedules) {
    return await apiRequest('PUT', `/api/sport-classes/${id}/schedules`, { token, body: { schedules }, errorMsg: 'Lưu lịch học thất bại' })
  },

  async generateClassSessions(token, id) {
    return await apiRequest('POST', `/api/sport-classes/${id}/sessions/generate`, { token, errorMsg: 'Sinh các buổi học thất bại' })
  },

  // Mọi buổi học của mọi lớp trong khoảng ngày (yyyy-MM-dd)
  async getSessionsBetween(token, from, to) {
    return await apiRequest('GET', '/api/class-sessions', { token, query: { from, to }, errorMsg: 'Không thể tải lịch buổi học' })
  },

  async getClassSessions(token, id) {
    return await apiRequest('GET', `/api/sport-classes/${id}/sessions`, { token, errorMsg: 'Không thể tải các buổi học' })
  },

  async getClassWaitlist(token, id) {
    return await apiRequest('GET', `/api/sport-classes/${id}/waitlist`, { token, errorMsg: 'Không thể tải hàng chờ' })
  },

  // --- Buổi học: đổi phòng/coach, hủy, học bù ---
  async updateSession(token, sessionId, { roomId, coachId }) {
    return await apiRequest('PUT', `/api/class-sessions/${sessionId}`, { token, body: { roomId, coachId }, errorMsg: 'Cập nhật buổi học thất bại' })
  },

  async cancelSession(token, sessionId, reason) {
    return await apiRequest('PATCH', `/api/class-sessions/${sessionId}/cancel`, { token, body: { reason }, errorMsg: 'Hủy buổi học thất bại' })
  },

  async getMakeupProposals(token, sessionId) {
    return await apiRequest('GET', `/api/class-sessions/${sessionId}/makeup-proposals`, { token, errorMsg: 'Không thể tải đề xuất học bù' })
  },

  // date dạng yyyy-MM-dd
  async chooseMakeup(token, sessionId, date) {
    return await apiRequest('POST', `/api/class-sessions/${sessionId}/makeup`, { token, body: { date }, errorMsg: 'Xếp học bù thất bại' })
  },

  async refundInsteadOfMakeup(token, sessionId) {
    return await apiRequest('POST', `/api/class-sessions/${sessionId}/refund-instead`, { token, errorMsg: 'Hoàn tiền thay học bù thất bại' })
  },

  // --- Hoàn tiền ---
  async getRefunds(token, status) {
    return await apiRequest('GET', '/api/refunds', { token, query: { status }, errorMsg: 'Không thể tải danh sách hoàn tiền' })
  },

  async sendRefundCode(token, id) {
    return await apiRequest('POST', `/api/refunds/${id}/send-code`, { token, errorMsg: 'Không gửi được mã cho hội viên' })
  },

  async completeRefund(token, id, code) {
    return await apiRequest('POST', `/api/refunds/${id}/complete`, { token, body: { code }, errorMsg: 'Xác nhận hoàn tiền thất bại' })
  },
}
