
export function formatVND(amount) {
  if (amount == null) return '0 đ'
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
}

const parseIso = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) }
const DAY_MS = 86400000

// 2026-11-03 -> 03/11/2026
export function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Ngày hết hạn của gói là ngày đầu tiên KHÔNG còn dùng được; ngày dùng cuối cùng là trước đó 1 ngày
export function lastUsableDate(endIso) {
  return endIso ? formatDate(new Date(parseIso(endIso) - DAY_MS).toISOString()) : ''
}

// Tiến độ gói: phần trăm đã dùng và số ngày còn lại tính từ hôm nay (giờ máy)
export function subscriptionProgress(startIso, endIso, today = new Date()) {
  if (!startIso || !endIso) return { percent: 0, daysLeft: 0 }
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const start = parseIso(startIso)
  const end = parseIso(endIso)
  const percent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
  return { percent, daysLeft: Math.max(0, Math.round((end - now) / DAY_MS)) }
}

// Hạn thanh toán đơn gói: ưu tiên paymentExpiresAt / cashPaymentDeadline; đơn thiếu cột thì tính createdAt + 24 giờ như BE
export function subscriptionDeadline(sub) {
  if (!sub) return null
  if (sub.paymentExpiresAt) return sub.paymentExpiresAt
  if (sub.cashPaymentDeadline) return sub.cashPaymentDeadline
  if (!sub.createdAt) return null
  const ms = new Date(sub.createdAt).getTime()
  return Number.isNaN(ms) ? null : new Date(ms + DAY_MS).toISOString()
}

export function isSubscriptionPaymentExpired(sub, nowMs = Date.now()) {
  if (!sub || sub.status !== 'PENDING') return false
  const deadline = subscriptionDeadline(sub)
  if (!deadline) return false
  const ms = new Date(deadline).getTime()
  return !Number.isNaN(ms) && ms <= nowMs
}
