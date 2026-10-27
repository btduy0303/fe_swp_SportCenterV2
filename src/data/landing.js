// Nội dung trình bày của trang chủ G6. Dữ liệu (môn, khung giờ, phòng, giá, voucher) lấy từ API của BE
// qua landingService; file này chỉ giữ phần giao diện (video, câu chữ) và hàm dựng dữ liệu từ API.

export const BRAND = 'G6'

// Video và mô tả ngắn theo tên môn trong sport_categories. Môn mới chưa có ở đây vẫn hiện, dùng mô tả từ DB
const SPORT_META = {
  'Bơi lội': { id: 'swim', video: '/media/swim.mp4' },
  'Yoga': { id: 'yoga', video: '/media/yoga.mp4' },
  'Bóng chuyền': { id: 'volley', video: '/media/volleyball.mp4' },
  'Cầu lông': { id: 'badminton', video: '/media/badminton.mp4' },
  'Thể lực': { id: 'fitness', video: '/media/fitness.mp4' },
  'Zumba': { id: 'zumba', video: '/media/zumba.mp4' },
  'Boxing': { id: 'boxing', video: '/media/boxing.mp4' },
}

// Câu chữ cho từng loại voucher; mức giảm và hạn dùng lấy từ system_settings
const VOUCHER_META = [
  { key: 'voucher.completion', name: 'Hoàn thành lớp', when: 'Tặng khi bạn học xong một lớp, dùng cho lớp kế tiếp' },
  { key: 'voucher.compensation', name: 'Bù lỗi trung tâm', when: 'Tặng khi buổi học bị hủy do trung tâm hoặc coach' },
  { key: 'voucher.early_renewal', name: 'Gia hạn sớm', when: 'Tặng khi gói sắp hết hạn mà bạn gia hạn sớm' },
  { key: 'voucher.winback', name: 'Quay lại', when: 'Tặng khi gói đã hết hạn một thời gian' },
]

const hhmm = (t) => String(t).slice(0, 5)
const toMin = (t) => Number(hhmm(t).slice(0, 2)) * 60 + Number(hhmm(t).slice(3, 5))
const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// Gộp dữ liệu API thành các mảng sẵn dùng cho từng section. Thiếu dữ liệu thì mảng rỗng, section tự ẩn
export function buildLanding({ categories = [], slots = [], rooms = [], settings = {} }, packages = []) {
  const sports = categories.map((c) => ({
    ...(SPORT_META[c.name] || {}),
    id: SPORT_META[c.name]?.id || `sport-${c.id}`,
    name: c.name,
    desc: c.description,
  }))

  const slotList = slots
    .filter((x) => x.active)
    .sort((a, b) => a.slotNo - b.slotNo)
    .map((x) => [hhmm(x.startTime), hhmm(x.endTime)])
  const slotMinutes = slotList.length ? toMin(slotList[0][1]) - toMin(slotList[0][0]) : 0
  const bufferMinutes = slotList.length > 1 ? toMin(slotList[1][0]) - toMin(slotList[0][1]) : 0

  const roomList = rooms
    .filter((r) => r.maintenanceStatus === 'AVAILABLE')
    .map((r) => ({ name: r.roomName, floor: r.floor, cap: r.capacity, note: r.description }))

  const discounts = (settings['pricing.duration_discounts'] || [])
    .slice()
    .sort((a, b) => a.min_months - b.min_months)
    .map((d) => ({
      range: d.min_months === d.max_months ? `${d.min_months} tháng` : `${d.min_months} – ${d.max_months} tháng`,
      pct: d.pct,
    }))

  const ranks = Object.entries(settings['coach.rank_prices'] || {})
    .map(([rank, price]) => ({ rank: rank.charAt(0) + rank.slice(1).toLowerCase(), price }))
    .sort((a, b) => a.price - b.price)

  const vouchers = VOUCHER_META.filter((m) => settings[m.key]?.kind === 'PERCENT').map((m) => {
    const v = settings[m.key]
    return {
      name: m.name,
      when: m.when,
      pct: v.value,
      on: v.applies_to === 'PACKAGE' ? 'Gói hội viên' : 'Học phí lớp',
      days: v.valid_days,
    }
  })

  const open = settings['center.open_minute']
  const close = settings['center.close_minute']
  const hours = open != null && close != null ? `${clock(open)} – ${clock(close)} mỗi ngày` : ''

  return {
    sports,
    slots: slotList,
    slotMinutes,
    bufferMinutes,
    rooms: roomList,
    discounts,
    maxDiscount: discounts.reduce((m, d) => Math.max(m, d.pct), 0),
    ranks,
    vouchers,
    hours,
    refundHours: settings['one_on_one.refund_before_hours'],
    holdMinutes: settings['payment.hold_minutes'],
    stats: [
      { value: sports.length, label: 'môn thể thao' },
      { value: roomList.length, label: 'phòng & khu tập' },
      { value: slotList.length, label: 'khung giờ học mỗi ngày' },
      { value: packages.length, label: 'hạng gói hội viên' },
    ].filter((x) => x.value > 0),
  }
}

export const STEPS = [
  { title: 'Tạo tài khoản', text: 'Đăng ký bằng email, nhập mã 6 số gửi qua hộp thư là dùng được ngay.' },
  { title: 'Chọn gói hội viên', text: 'Chọn hạng gói và số tháng. Mua càng dài càng được giảm.' },
  { title: 'Đặt lớp hoặc 1-1', text: 'Chọn lớp theo môn và khung giờ, hoặc đặt coach riêng. Thanh toán QR, chỗ được giữ {hold} phút.' },
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
