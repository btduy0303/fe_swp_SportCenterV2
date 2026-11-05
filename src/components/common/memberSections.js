export const memberSections = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'subscription', label: 'Gói tập của tôi' },
  { id: 'classes', label: 'Lớp học' },
  { id: 'slots', label: 'Buổi 1-1' },
  { id: 'payments', label: 'Lịch sử thanh toán' },
  { id: 'profile', label: 'Hồ sơ cá nhân' },
]

export const memberSection = value => memberSections.some(section => section.id === value) ? value : 'overview'
