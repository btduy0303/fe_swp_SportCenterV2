// Dịch vụ gọi API lớp học thể thao
export const classService = {
  // Lấy danh sách các lớp học thể thao đang mở đăng ký
  // filters: { sportCategoryId, level, keyword, hasSeats }
  async getOpenClasses(filters = {}) {
    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ).toString()
      const response = await fetch(params ? `/api/classes?${params}` : '/api/classes')
      if (!response.ok) {
        throw new Error('Lỗi khi tải danh sách lớp học')
      }
      return await response.json()
    } catch (error) {
      console.error(error)
      return []
    }
  },

  // Lấy chi tiết thông tin lớp học
  async getClassById(id) {
    try {
      const response = await fetch(`/api/classes/${id}`)
      if (!response.ok) {
        throw new Error(`Không tìm thấy lớp học #${id}`)
      }
      return await response.json()
    } catch (error) {
      console.error(error)
      return null
    }
  },
}
