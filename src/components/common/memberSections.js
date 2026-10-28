export const memberSections = [
  { id: 'subscription', label: 'Gói tập của tôi' },
  { id: 'classes', label: 'Lớp học đã đăng ký' },
  { id: 'slots', label: 'Lịch hẹn 1-1' },
  { id: 'timetable', label: 'Thời khóa biểu' },
  { id: 'payments', label: 'Lịch sử thanh toán' },
  { id: 'vouchers', label: 'Voucher ưu đãi' },
  { id: 'profile', label: 'Hồ sơ cá nhân' },
]

export const memberSection = value => memberSections.some(section => section.id === value) ? value : 'subscription'
