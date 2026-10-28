import {
  LayoutDashboard, Users, Package, DoorOpen, Tags, GraduationCap, Clock3, BookOpen, Settings2, Building2,
  ChartNoAxesCombined, Undo2, Ticket, CreditCard, CalendarDays, Receipt, UserRound, Activity, HandCoins, ClipboardList,
} from 'lucide-react'
import { memberSections } from './memberSections'

// Mục thanh điều hướng của manager: id trùng với activeTab trong ManagerDashboard
// group: tiêu đề nhóm, hiện một lần trước mục đầu tiên của nhóm
export const managerItems = [
  { id: 'overview', label: 'Tổng quan', Icon: LayoutDashboard, group: 'Hôm nay' },
  { id: 'weekly', label: 'Lịch tuần', Icon: CalendarDays },
  { id: 'courses', label: 'Khóa học', Icon: BookOpen, group: 'Mở và vận hành lớp' },
  { id: 'classes', label: 'Lớp học', Icon: GraduationCap },
  { id: 'classops', label: 'Vận hành lớp', Icon: Settings2 },
  { id: 'categories', label: 'Môn thể thao', Icon: Tags, group: 'Danh mục' },
  { id: 'rooms', label: 'Phòng tập', Icon: DoorOpen },
  { id: 'coaches', label: 'Coach', Icon: Building2 },
  { id: 'slots', label: 'Khung giờ', Icon: Clock3 },
  { id: 'packages', label: 'Gói hội viên', Icon: Package },
  { id: 'vouchers', label: 'Voucher', Icon: Ticket },
  { id: 'reports', label: 'Báo cáo', Icon: ChartNoAxesCombined, group: 'Tài chính và nhân sự' },
  { id: 'refunds', label: 'Hoàn tiền', Icon: Undo2 },
  { id: 'accounts', label: 'Tài khoản nhân sự', Icon: Users },
]

export const receptionItems = [
  { id: 'desk', label: 'Hội viên tại quầy', Icon: ClipboardList },
  { id: 'refunds', label: 'Hoàn tiền', Icon: HandCoins },
]

const memberIcons = { subscription: CreditCard, classes: GraduationCap, slots: Clock3, timetable: CalendarDays, payments: Receipt, vouchers: Ticket, profile: UserRound }

// Mục của hội viên: các mục trong trang hội viên và trang tập luyện. withLinks=true thì mỗi mục là liên kết (dùng ở trang khác)
export const memberItems = (withLinks) => [
  ...memberSections.map((s) => ({ id: s.id, label: s.label, Icon: memberIcons[s.id] || UserRound, ...(withLinks ? { to: `/member?tab=${s.id}` } : {}) })),
  { id: 'training', label: 'Hành trình tập luyện', Icon: Activity, to: '/member/training' },
]
