import { parseApiResponse } from './apiHelper'


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

  async toggleTimeSlot(token, id) {
    const res = await fetch(`/api/manager/time-slots/${id}/active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    return await parseApiResponse(res, 'Đổi trạng thái slot thất bại')
  },
}
