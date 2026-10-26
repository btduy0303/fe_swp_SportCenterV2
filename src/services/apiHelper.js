// Hàm tiện ích phân tích dữ liệu JSON hoặc Text an toàn tránh lỗi Unexpected token JSON
export async function parseApiResponse(res, defaultErrorMsg = 'Thao tác không thành công') {
  const text = await res.text()
  let data = null

  if (text && text.trim() !== '') {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!res.ok) {
    const errorMsg = data?.message || (typeof data === 'string' ? data : defaultErrorMsg)
    throw new Error(errorMsg)
  }

  return data || {}
}
