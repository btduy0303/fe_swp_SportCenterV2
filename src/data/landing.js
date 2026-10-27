// Nội dung tĩnh của trang chủ G6. Gói hội viên và lớp học lấy từ API, không để ở đây.
// Số liệu lấy từ seed DB của BE (system_settings, time_slots, facility_rooms).

export const BRAND = 'G6'

// CẦN ĐIỀN: địa chỉ và hotline của trung tâm
export const CONTACT = {
  address: 'CẦN ĐIỀN',
  hotline: 'CẦN ĐIỀN',
  hours: '06:00 – 22:00 mỗi ngày',
}

export const STATS = [
  { value: 7, label: 'môn thể thao' },
  { value: 8, label: 'phòng & khu tập' },
  { value: 8, label: 'khung giờ học mỗi ngày' },
  { value: 4, label: 'hạng gói hội viên' },
]

export const SPORTS = [
  { id: 'swim', video: '/media/swim.mp4', name: 'Bơi lội', desc: 'Bơi cơ bản, bơi nâng cao. Hồ bơi 25m.', course: 'Bơi cơ bản · Bơi nâng cao' },
  { id: 'yoga', video: '/media/yoga.mp4', name: 'Yoga', desc: 'Thư giãn, tăng độ linh hoạt. Phòng có gương.', course: 'Yoga cơ bản' },
  { id: 'volley', video: '/media/volleyball.mp4', name: 'Bóng chuyền', desc: 'Chuyền, đệm, phát bóng. Sân trong nhà.', course: 'Bóng chuyền cơ bản' },
  { id: 'badminton', video: '/media/badminton.mp4', name: 'Cầu lông', desc: 'Đánh đơn, đánh đôi, rèn phản xạ. Sân trong nhà.', course: 'Lớp theo trình độ' },
  { id: 'fitness', video: '/media/fitness.mp4', name: 'Thể lực', desc: 'Sức mạnh và thể lực tổng hợp, nhóm nhỏ.', course: 'Khu máy & tạ tự do' },
  { id: 'zumba', video: '/media/zumba.mp4', name: 'Zumba', desc: 'Nhảy theo nhạc, đốt calo, vui như một buổi tiệc.', course: 'Lớp theo trình độ' },
  { id: 'boxing', video: '/media/boxing.mp4', name: 'Boxing', desc: 'Boxing cơ bản và cardio. Có bao cát.', course: 'Phòng Boxing riêng' },
]

// system_settings: pricing.duration_discounts
export const DURATION_DISCOUNTS = [
  { range: '1 – 2 tháng', pct: 0 },
  { range: '3 – 5 tháng', pct: 8 },
  { range: '6 – 11 tháng', pct: 15 },
  { range: '12 tháng', pct: 25 },
]

// bảng time_slots (8 slot mặc định)
export const SLOTS = [
  ['06:00', '07:45'], ['08:00', '09:45'], ['10:00', '11:45'], ['12:00', '13:45'],
  ['14:00', '15:45'], ['16:00', '17:45'], ['18:00', '19:45'], ['20:00', '21:45'],
]

// system_settings: coach.rank_prices (buổi 1-1, 60 phút)
export const COACH_RANKS = [
  { rank: 'Coach', price: 250000 },
  { rank: 'Senior', price: 400000 },
  { rank: 'Master', price: 650000 },
]

// system_settings: voucher.*
export const VOUCHERS = [
  { name: 'Hoàn thành lớp', pct: 10, on: 'Học phí lớp', when: 'Tặng khi bạn học xong một lớp, dùng cho lớp kế tiếp', days: 60 },
  { name: 'Bù lỗi trung tâm', pct: 10, on: 'Học phí lớp', when: 'Tặng khi buổi học bị hủy do trung tâm hoặc coach', days: 30 },
  { name: 'Gia hạn sớm', pct: 5, on: 'Gói hội viên', when: 'Tặng khi gói sắp hết hạn mà bạn gia hạn sớm', days: 7 },
  { name: 'Quay lại', pct: 10, on: 'Gói hội viên', when: 'Tặng khi gói đã hết hạn một thời gian', days: 30 },
]

export const ROOMS = [
  { name: 'Hồ bơi A', floor: 'Tầng trệt', cap: 30, note: 'Hồ bơi 25m' },
  { name: 'Phòng Yoga 1', floor: 'Tầng 2', cap: 20, note: 'Có gương' },
  { name: 'Phòng Yoga 2', floor: 'Tầng 2', cap: 20, note: 'Dự phòng' },
  { name: 'Sân bóng chuyền', floor: 'Tầng 3', cap: 30, note: 'Sân trong nhà' },
  { name: 'Khu tập tự do', floor: 'Tầng 1', cap: 80, note: 'Máy và tạ tự do' },
  { name: 'Phòng thể lực 1', floor: 'Tầng 1', cap: 25, note: 'Nhóm nhỏ' },
  { name: 'Phòng thể lực 2', floor: 'Tầng 1', cap: 25, note: 'Nhóm nhỏ, dự phòng' },
  { name: 'Phòng Boxing', floor: 'Tầng 2', cap: 20, note: 'Có bao cát' },
]

export const STEPS = [
  { title: 'Tạo tài khoản', text: 'Đăng ký bằng email, bấm link xác thực trong hộp thư là dùng được ngay.' },
  { title: 'Chọn gói hội viên', text: 'Chọn hạng gói và số tháng. Mua càng dài càng được giảm, tối đa 25%.' },
  { title: 'Đặt lớp hoặc 1-1', text: 'Chọn lớp theo môn và khung giờ, hoặc đặt coach riêng. Thanh toán QR, chỗ được giữ 15 phút.' },
]

// Dòng quyền lợi hiển thị trên thẻ gói, dựng từ dữ liệu API
export function perksOf(p) {
  const perks = []
  if (p.earlyRegisterDays > 0) perks.push(`Đăng ký lớp sớm ${p.earlyRegisterDays} ngày`)
  if (p.tuitionDiscountPct > 0) perks.push(`Giảm ${p.tuitionDiscountPct}% học phí lớp`)
  if (p.oneOnOneDiscountPct > 0) perks.push(`Giảm ${p.oneOnOneDiscountPct}% buổi 1-1`)
  if (p.hasPersonalPlan) perks.push('Bài tập riêng từ coach')
  if (p.aiLevel === 'LIMITED') perks.push('Trợ lý AI (giới hạn lượt)')
  if (p.aiLevel === 'UNLIMITED') perks.push('Trợ lý AI không giới hạn')
  if (p.menuAiLevel === 'LIMITED') perks.push('Gợi ý thực đơn (giới hạn lượt)')
  if (p.menuAiLevel === 'UNLIMITED') perks.push('Gợi ý thực đơn không giới hạn')
  if (p.waitlistPriority > 0) perks.push(`Ưu tiên hàng chờ cấp ${p.waitlistPriority}`)
  if (p.birthdayGiftKind === 'PERCENT') perks.push(`Quà sinh nhật giảm ${Number(p.birthdayGiftValue)}%`)
  if (p.birthdayGiftKind === 'FREE_ONE_ON_ONE') perks.push('Sinh nhật tặng 1 buổi 1-1 miễn phí')
  return perks.length ? perks : ['Vào khu tập tự do']
}
