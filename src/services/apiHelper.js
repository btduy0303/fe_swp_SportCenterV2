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

// Gọi API chung: tự gắn token, JSON body và query string (bỏ qua tham số rỗng)
export async function apiRequest(method, url, { token, body, query, errorMsg } = {}) {
  const params = new URLSearchParams(
    Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(params ? `${url}?${params}` : url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return await parseApiResponse(res, errorMsg)
}
