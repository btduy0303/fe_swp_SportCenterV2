import { formatDate } from './format'

export const PAYMENT_METHOD = { CASH: 'Tiền mặt', QR_GATEWAY: 'Thanh toán online' }

// Tên dòng doanh thu bằng tiếng Anh của BE bản cũ (BE mới đã trả tiếng Việt)
export const REVENUE_ITEM = { 'Class enrollment': 'Học phí lớp', 'One-on-one': 'Buổi 1-1' }

// Lý do hoàn tiền ghi bằng tiếng Anh trong dữ liệu cũ (BE mới đã ghi tiếng Việt); đổi sang tiếng Việt để người đọc hiểu
const REFUND_REASON = {
  'Package canceled before it started': 'Hủy gói trước ngày bắt đầu',
  'Package canceled': 'Hủy gói',
  'Registration canceled by member before class start': 'Hội viên tự hủy đăng ký lớp trước ngày khai giảng',
  'Registration canceled by receptionist before class start': 'Lễ tân hủy đăng ký lớp trước ngày khai giảng',
  '1-1 session no longer available when the payment arrived': 'Suất 1-1 không còn khi tiền về',
  'Seat no longer available when the payment arrived': 'Lớp hết chỗ khi tiền về',
}
const CENTER_CANCEL = 'Class canceled by the center: '

export const refundReasonVi = (r) => REFUND_REASON[r] || (r?.startsWith(CENTER_CANCEL) ? `Trung tâm hủy lớp: ${r.slice(CENTER_CANCEL.length)}` : r)

// Nhãn kỳ báo cáo: 2026-11-02 -> 02/11/2026, 2026-11 -> Tháng 11/2026, 2026-Q4 -> Quý 4/2026
export function periodLabel(label) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return formatDate(label)
  const month = /^(\d{4})-(\d{2})$/.exec(label)
  if (month) return `Tháng ${month[2]}/${month[1]}`
  const quarter = /^(\d{4})-?Q(\d)$/.exec(label)
  return quarter ? `Quý ${quarter[2]}/${quarter[1]}` : label
}

// 02/11 (hai chữ số, dấu gạch chéo) để mọi chỗ trong lịch viết cùng một kiểu
export const dayMonth = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

export const PAYMENT_STATUS = {
  SUCCESS: 'Thành công', PENDING: 'Chờ thanh toán', FAILED: 'Thất bại', EXPIRED: 'Hết hạn',
  CANCELED: 'Đã hủy', PENDING_REFUND: 'Chờ hoàn tiền', REFUNDED: 'Đã hoàn tiền',
}
