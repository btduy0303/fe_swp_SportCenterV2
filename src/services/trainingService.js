import { parseApiResponse } from './apiHelper'

export async function trainingRequest(token, path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`/api/${path}`, {
    method,
    signal,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  try {
    return await parseApiResponse(response, response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Không thể tải dữ liệu tập luyện')
  } catch (error) {
    error.status = response.status
    throw error
  }
}
