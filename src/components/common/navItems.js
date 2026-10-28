import {
  LayoutDashboard, Users, Package, DoorOpen, Tags, GraduationCap, Clock3, BookOpen, Settings2, Building2,
  ChartNoAxesCombined, Undo2, Ticket, CreditCard, CalendarDays, Receipt, UserRound, Activity, HandCoins, ClipboardList,
} from 'lucide-react'
import { memberSections } from './memberSections'

// Mục thanh điều hướng của manager: id trùng với activeTab trong ManagerDashboard
export const managerItems = [
  { id: 'overview', label: 'Tổng quan', Icon: LayoutDashboard },
  { id: 'accounts', label: 'Tài khoản nhân sự', Icon: Users },
  { id: 'packages', label: 'Gói hội viên', Icon: Package },
  { id: 'rooms', label: 'Phòng tập', Icon: DoorOpen },
  { id: 'categories', label: 'Môn thể thao', Icon: Tags },
  { id: 'classes', label: 'Lớp học', Icon: GraduationCap },
  { id: 'slots', label: 'Khung giờ', Icon: Clock3 },
  { id: 'courses', label: 'Khóa học', Icon: BookOpen },
  { id: 'classops', label: 'Vận hành lớp', Icon: Settings2 },
  { id: 'resources', label: 'Phòng & Coach', Icon: Building2 },
  { id: 'reports', label: 'Báo cáo', Icon: ChartNoAxesCombined },
  { id: 'refunds', label: 'Hoàn tiền', Icon: Undo2 },
  { id: 'vouchers', label: 'Voucher', Icon: Ticket },
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
