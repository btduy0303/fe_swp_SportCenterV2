import {
  LayoutDashboard, Users, Package, DoorOpen, Tags, GraduationCap, Clock3, BookOpen, Building2,
  ChartNoAxesCombined, Undo2, CreditCard, CalendarDays, Receipt, UserRound, Activity, HandCoins, ClipboardList, LifeBuoy,
} from 'lucide-react'
import { memberSections } from './memberSections'

// Mục thanh điều hướng của manager: id trùng với activeTab trong ManagerDashboard
// group: tiêu đề nhóm, hiện một lần trước mục đầu tiên của nhóm
export const managerItems = [
  { id: 'overview', label: 'Tổng quan', Icon: LayoutDashboard, group: 'Hôm nay' },
  { id: 'classes', label: 'Lớp học', Icon: GraduationCap, group: 'Đào tạo' },
  { id: 'courses', label: 'Khóa học', Icon: BookOpen },
  { id: 'weekly', label: 'Lịch tuần', Icon: CalendarDays },
  { id: 'coachslots', label: 'Lịch 1-1', Icon: UserRound },
  { id: 'packages', label: 'Gói hội viên', Icon: Package, group: 'Hội viên và tiền' },
  { id: 'reports', label: 'Báo cáo doanh thu', Icon: ChartNoAxesCombined },
  { id: 'refunds', label: 'Hoàn tiền', Icon: Undo2 },
  { id: 'catalog', label: 'Danh mục', Icon: Tags, group: 'Thiết lập' },
  { id: 'accounts', label: 'Tài khoản nhân sự', Icon: Users },
]

export const receptionItems = [
  { id: 'desk', label: 'Hội viên tại quầy', Icon: ClipboardList },
  { id: 'attendance', label: 'Ra vào trung tâm', Icon: DoorOpen },
  { id: 'support', label: 'Yêu cầu hỗ trợ', Icon: LifeBuoy },
  { id: 'refunds', label: 'Hoàn tiền', Icon: HandCoins },
]

const memberIcons = { overview: LayoutDashboard, subscription: CreditCard, classes: GraduationCap, slots: Clock3, payments: Receipt, profile: UserRound }

// Mục của hội viên: các mục trong trang hội viên và trang tập luyện. withLinks=true thì mỗi mục là liên kết (dùng ở trang khác)
export const memberItems = (withLinks) => [
  ...memberSections.map((s) => ({ id: s.id, label: s.label, Icon: memberIcons[s.id] || UserRound, ...(withLinks ? { to: `/member?tab=${s.id}` } : {}) })),
  { id: 'training', label: 'Hành trình tập luyện', Icon: Activity, to: '/member/training' },
]
