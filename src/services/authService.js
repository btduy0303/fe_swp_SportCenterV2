// Hàm phân tích dữ liệu phản hồi an toàn tránh lỗi Unexpected end of JSON
async function parseJsonResponse(res) {
  const text = await res.text()
  if (!text || text.trim() === '') {
    return {}
  }
  try {
    return JSON.parse(text)
  } catch (err) {
    return { raw: text }
  }
}

// Dịch vụ gọi API xác thực tài khoản và quản lý thông tin cá nhân
export const authService = {
  // Đăng nhập hệ thống
  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) {
      throw new Error(data.message || 'Đăng nhập không thành công')
    }
    return data
  },

  // Đăng ký tài khoản hội viên mới
  async register(payload) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) {
      throw new Error(data.message || 'Đăng ký không thành công')
    }
    return data
  },

  // Lấy thông tin tài khoản hiện tại
  async getMe(token) {
    const res = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) {
      throw new Error(data.message || 'Không thể lấy thông tin tài khoản')
    }
    return data
  },

  // Cập nhật thông tin cơ bản
  async updateMe(token, payload) {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.message || 'Cập nhật thất bại')
    return data
  },

  // Cập nhật hồ sơ hội viên
  async updateMemberProfile(token, payload) {
    const res = await fetch('/api/users/me/member-profile', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.message || 'Cập nhật hồ sơ hội viên thất bại')
    return data
  },
}
