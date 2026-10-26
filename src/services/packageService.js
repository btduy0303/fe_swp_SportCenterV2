// Dịch vụ gọi API gói hội viên
export const packageService = {
  // Lấy toàn bộ danh sách gói tập đang kích hoạt
  async getActivePackages() {
    try {
      const response = await fetch('/api/packages')
      if (!response.ok) {
        throw new Error('Lỗi khi tải danh sách gói tập')
      }
      return await response.json()
    } catch (error) {
      console.error(error)
      return []
    }
  },

  // Lấy chi tiết gói tập theo ID
  async getPackageById(id) {
    try {
      const response = await fetch(`/api/packages/${id}`)
      if (!response.ok) {
        throw new Error(`Không tìm thấy gói tập #${id}`)
      }
      return await response.json()
    } catch (error) {
      console.error(error)
      return null
    }
  },

  // Xem báo giá thử theo số tháng
  async getQuote(id, months = 1) {
    try {
      const response = await fetch(`/api/packages/${id}/quote?months=${months}`)
      if (!response.ok) {
        throw new Error('Không thể tính báo giá')
      }
      return await response.json()
    } catch (error) {
      console.error(error)
      return null
    }
  },
}
