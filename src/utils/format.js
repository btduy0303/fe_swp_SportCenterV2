
export function formatVND(amount) {
  if (amount == null) return '0 đ'
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
}
