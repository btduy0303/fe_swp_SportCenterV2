// Dịch vụ lấy dữ liệu công khai cho trang chủ (không cần đăng nhập)
async function getJson(url, fallback) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Lỗi ${response.status} khi tải ${url}`)
    return await response.json()
  } catch (error) {
    console.error(error)
    return fallback
  }
}

export const landingService = {
  async getLandingData() {
    const [categories, slots, rooms, settings] = await Promise.all([
      getJson('/api/sport-categories', []),
      getJson('/api/time-slots', []),
      getJson('/api/rooms', []),
      getJson('/api/public/landing-settings', {}),
    ])
    return { categories, slots, rooms, settings }
  },
}
