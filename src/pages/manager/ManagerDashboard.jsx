import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { scheduleService } from '../../services/scheduleService'
import { groupByClass } from '../../utils/schedule'
import ClassList from '../../components/manager/ClassList'
import SidebarLayout from '../../components/common/SidebarLayout'
import { managerItems } from '../../components/common/navItems'
import ReportsTab from '../../components/manager/ReportsTab'
import ClassOpsTab from '../../components/manager/ClassOpsTab'
import CreateClassPage from '../../components/manager/CreateClassPage'
import WeeklyScheduleTab from '../../components/manager/WeeklyScheduleTab'
import OverviewTab from '../../components/manager/OverviewTab'
import CoursesTab from '../../components/manager/CoursesTab'
import CoachSlotsTab from '../../components/manager/CoachSlotsTab'
import PackagesTab from '../../components/manager/PackagesTab'
import AccountsTab from '../../components/manager/AccountsTab'
import { categoryIcon } from '../../utils/sportIcon'
import ResourcesTab from '../../components/manager/ResourcesTab'
import RoomsTab from '../../components/manager/RoomsTab'
import RefundsTab from '../../components/manager/RefundsTab'
import ConfirmModal from '../../components/common/ConfirmModal'
import ReasonDialog from '../../components/common/ReasonDialog'
import styles from '../../css/manager/ManagerDashboard.module.css'
import ui from '../../css/manager/ManagerUi.module.css'

// Trung tâm chỉ dạy tối đa 7 môn, đủ rồi thì ẩn form thêm môn (chỉ chặn ở giao diện, backend không giới hạn)

const ROLE_VI ={ MANAGER: 'Quản lý', COACH: 'Huấn luyện viên', RECEPTIONIST: 'Lễ tân', MEMBER: 'Hội viên' }

// Tiêu đề và một dòng giải thích cho từng tab: [tiêu đề, mô tả]
const TAB_INFO = {
  overview: ['Tổng quan hôm nay', 'Doanh thu, hội viên mới và những việc cần xử lý ngay. Bấm vào một con số hoặc một việc để đi tới chỗ xử lý.'],
  weekly: ['Lịch tuần', 'Mọi buổi lớp và buổi 1-1 đã đặt trong tuần, xếp theo ngày. Dùng để biết phòng và coach nào đang bận lúc nào.'],
  courses: ['Khóa học', 'Khóa học nhóm mở thành lớp có lịch chung. Khóa kèm 1-1 để hội viên mua rồi tự chọn giờ học với coach.'],
  classes: ['Lớp học', 'Mọi lớp của trung tâm. Bấm "Tạo lớp mới" để tạo lớp trong một trang; bấm "Quản lý lớp" để xem buổi học, đổi coach, hủy buổi và xếp học bù.'],
  createClass: ['Tạo lớp mới', 'Điền 3 phần bên dưới. Tóm tắt bên phải cho biết số buổi và ngày học cuối trước khi bạn bấm tạo.'],
  coachslots: ['Lịch 1-1', 'Hội viên gửi yêu cầu xin nhiều buổi với một coach, bạn duyệt cả chuỗi hoặc từ chối. Buổi chỉ được tạo khi bạn duyệt; sự cố của buổi đã đặt xử lý ngay trong danh sách bên dưới.'],
  categories: ['Danh mục · Môn thể thao', 'Các môn trung tâm đang dạy. Khóa học và coach đều gắn với một môn.'],
  rooms: ['Danh mục · Phòng tập', 'Thêm, sửa phòng; chọn phòng đang sẵn sàng hay bảo trì và phòng được dạy môn nào.'],
  coaches: ['Danh mục · Coach', 'Hạng của coach, các môn coach được dạy, và ghi nhận coach nghỉ dài ngày.'],
  slots: ['Danh mục · Khung giờ', 'Trung tâm dùng 8 khung giờ cố định. Chỉ bật hoặc tắt từng khung; khung bị tắt sẽ không xếp lịch mới được.'],
  catalog: ['Danh mục', 'Những thứ trung tâm thiết lập một lần và ít khi đổi: môn, phòng, coach và khung giờ.'],
  packages: ['Gói hội viên', 'Các gói hội viên đang bán, giá và quyền lợi.'],
  reports: ['Báo cáo', 'Doanh thu theo ngày và thống kê hội viên để theo dõi hiệu quả trung tâm.'],
  refunds: ['Hoàn tiền', 'Các khoản hoàn tiền chờ duyệt. Khoản quá hạn nên xử lý trước.'],
  accounts: ['Tài khoản nhân sự', 'Tạo tài khoản cho coach, lễ tân; sửa tên, số điện thoại; khóa tài khoản khi cần.'],
}

// Bảng điều khiển Quản Lý Trung Tâm (Manager) - Flow 1 & Flow 2
export default function ManagerDashboard() {
  const { user, token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [catalogTab, setCatalogTab] = useState('categories')
  const [classPerf, setClassPerf] = useState({})
  const [activeTab, setActiveTab] = useState('overview') // 'accounts' | 'packages' | 'rooms' | 'categories' | 'classes' | 'slots'
  // Mở đúng tab theo đường dẫn ?tab= (ví dụ bấm thông báo dẫn tới /manager?tab=coachslots)
  const [params, setParams] = useSearchParams()
  useEffect(() => { const t = params.get('tab'); if (t) setActiveTab(t) }, [params])
  const [accounts, setAccounts] = useState([])
  const [packages, setPackages] = useState([])
  const [categories, setCategories] = useState([])
  const [classes, setClasses] = useState([])
  const [classSchedules, setClassSchedules] = useState({})
  const [slotUse, setSlotUse] = useState({})
  const [opsClassId, setOpsClassId] = useState(null)
  // Đang ở trang tạo lớp: { courseId } (courseId có thể rỗng); null là đang xem danh sách lớp
  const [creating, setCreating] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal xác nhận 3 giây bắt buộc cho xóa / cập nhật
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    type: 'danger',
    action: null,
  })

  // State cho Modal Chỉnh Sửa Chung (Edit Modal)
  const [editModal, setEditModal] = useState({
    isOpen: false,
    type: null, // 'account' | 'package' | 'room' | 'category' | 'class'
    title: '',
    data: {},
  })

  // Form states cho tạo mới
  const [newAccount, setNewAccount] = useState({ fullName: '', email: '', phone: '', password: '', roleCode: 'COACH' })
  const [newCoachSports, setNewCoachSports] = useState([])
  const [newCategory, setNewCategory] = useState({ name: '', description: '' })

  const view = activeTab === 'catalog' ? catalogTab : activeTab
  const headerKey = activeTab === 'classes' && creating ? 'createClass' : view
  // Rời tab Lớp học thì đóng trang tạo lớp đang dở
  useEffect(() => { if (activeTab !== 'classes') { setCreating(null); setOpsClassId(null) } }, [activeTab])

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    loadData()
  }, [token, view])

  const loadData = async () => {
    setLoading(true)
    try {
      if (view === 'accounts') {
        const [data, cats] = await Promise.all([managerService.getAccounts(token), managerService.getCategories(token)])
        setAccounts(Array.isArray(data) ? data : data?.value || [])
        setCategories(Array.isArray(cats) ? cats : [])
      } else if (view === 'packages') {
        const data = await managerService.getAllPackages(token)
        setPackages(Array.isArray(data) ? data : data?.value || [])
      } else if (view === 'categories') {
        const data = await managerService.getAllCategories(token)
        setCategories(Array.isArray(data) ? data : data?.value || [])
      } else if (view === 'classes') {
        const [data, sch, perf] = await Promise.all([managerService.getClasses(token), scheduleService.getAll(token), managerService.getClassPerformance(token).catch(() => [])])
        setClasses(Array.isArray(data) ? data : data?.value || [])
        setClassPerf(Object.fromEntries((Array.isArray(perf) ? perf : []).map((p) => [p.classId, p])))
        setClassSchedules(groupByClass(sch))
      } else if (view === 'slots') {
        const [data, sch] = await Promise.all([managerService.getTimeSlots(token), scheduleService.getAll(token)])
        setTimeSlots(Array.isArray(data) ? data : data?.value || [])
        const use = {}
        for (const [slotId, n] of Object.entries(sch.reduce((m, r) => ({ ...m, [r.timeSlotId]: (m[r.timeSlotId] || new Set()).add(r.classId) }), {}))) use[slotId] = n.size
        setSlotUse(use)
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Lỗi khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  // --- 1. TÀI KHOẢN ---
  const handleCreateAccount = async (e) => {
    e.preventDefault()
    if (newAccount.roleCode === 'COACH' && newCoachSports.length === 0) {
      toast.error('Hãy chọn ít nhất một môn mà coach được dạy')
      return false
    }
    try {
      const created = await managerService.createAccount(token, newAccount)
      if (newAccount.roleCode === 'COACH') await managerService.setCoachSports(token, created.id, newCoachSports)
      toast.success('Tạo tài khoản nhân sự thành công!')
      setNewAccount({ fullName: '', email: '', phone: '', password: '', roleCode: 'COACH' })
      setNewCoachSports([])
      loadData()
      return true
    } catch (err) {
      toast.error(err.message || 'Lỗi khi tạo tài khoản')
      return false
    }
  }

  const openEditAccount = (acc) => {
    setEditModal({
      isOpen: true,
      type: 'account',
      title: `Chỉnh Sửa Tài Khoản #${acc.id}`,
      data: {
        id: acc.id,
        fullName: acc.fullName || '',
        phone: acc.phone || '',
        roleCode: acc.role || (acc.role && acc.role.code) || 'MEMBER',
      },
    })
  }

  // Xóa môn: hỏi BE trước để nói rõ là xóa hẳn (chưa từng dùng) hay chỉ ngừng sử dụng (đã có khóa, lớp, 1-1)
  const askDeleteCategory = async (c) => {
    try {
      const usage = await managerService.getCategoryUsage(token, c.id)
      const hard = usage.result === 'DELETED'
      setConfirmModal({
        isOpen: true,
        title: hard ? 'Xóa môn thể thao' : 'Ngừng sử dụng môn',
        message: hard
          ? `Môn "${c.name}" chưa có khóa học hay buổi 1-1 nào nên sẽ bị xóa hẳn.`
          : `Môn "${c.name}" đã có khóa học hoặc buổi 1-1 nên chỉ chuyển sang "Ngừng sử dụng", dữ liệu cũ vẫn giữ. Môn sẽ ẩn khỏi trang chủ, không mở khóa hay lớp mới và không nhận đăng ký mới; lớp đang học vẫn học tiếp.${usage.upcomingSessions > 0 ? ` Còn ${usage.upcomingSessions} buổi sắp tới của môn này vẫn diễn ra.` : ''}`,
        confirmText: hard ? 'Xóa hẳn' : 'Ngừng sử dụng',
        type: 'danger',
        action: async () => {
          try {
            await managerService.deleteCategory(token, c.id)
            toast.success(hard ? 'Đã xóa môn' : 'Đã ngừng sử dụng môn')
            loadData()
          } catch (err) {
            toast.error(err.message || 'Xóa môn thất bại')
          }
        },
      })
    } catch (err) {
      toast.error(err.message || 'Không thể kiểm tra môn')
    }
  }

  const restoreCategory = async (c) => {
    try {
      await managerService.restoreCategory(token, c.id)
      toast.success(`Đã dùng lại môn ${c.name}`)
      loadData()
    } catch (err) {
      toast.error(err.message || 'Dùng lại môn thất bại')
    }
  }

  const handleSaveEditAccount = () => {
    const editPayload = { ...editModal.data }
    setEditModal({ isOpen: false, type: null, title: '', data: {} })

    setConfirmModal({
      isOpen: true,
      title: 'Lưu Thông Tin Tài Khoản',
      message: `Xác nhận lưu thay đổi cho tài khoản "${editPayload.fullName}"?`,
      confirmText: 'Lưu Thay Đổi',
      type: 'primary',
      action: async () => {
        try {
          await managerService.updateAccount(token, editPayload.id, {
            fullName: editPayload.fullName,
            phone: editPayload.phone,
          })
          toast.success('Cập nhật tài khoản thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Cập nhật thất bại')
        }
      },
    })
  }

  const requestDeactivateAccount = (id, email) => {
    setConfirmModal({
      isOpen: true,
      title: 'Khóa Tài Khoản',
      message: `Bạn có chắc chắn muốn khóa tài khoản "${email}"? Người dùng này sẽ không thể đăng nhập vào hệ thống.`,
      confirmText: 'Khóa Tài Khoản',
      type: 'danger',
      action: async () => {
        try {
          await managerService.deactivateAccount(token, id)
          toast.success('Đã khóa tài khoản thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Khóa tài khoản thất bại')
        }
      },
    })
  }

  const requestActivateAccount = (id, email) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kích Hoạt Tài Khoản',
      message: `Bạn có chắc chắn muốn kích hoạt lại tài khoản "${email}"?`,
      confirmText: 'Kích Hoạt',
      type: 'primary',
      action: async () => {
        try {
          await managerService.activateAccount(token, id)
          toast.success('Kích hoạt tài khoản thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Kích hoạt thất bại')
        }
      },
    })
  }

  // --- 2. GÓI HỘI VIÊN ---
  const openEditPackage = (pkg) => {
    setEditModal({
      isOpen: true,
      type: 'package',
      title: `Chỉnh Sửa Gói "${pkg.name}"`,
      data: {
        id: pkg.id,
        name: pkg.name || '',
        description: pkg.description || '',
        tierLevel: pkg.tierLevel || 1,
        monthlyPrice: pkg.monthlyPrice || 0,
        tuitionDiscountPct: pkg.tuitionDiscountPct || 0,
        oneOnOneDiscountPct: pkg.oneOnOneDiscountPct || 0,
      },
    })
  }

  const handleSaveEditPackage = () => {
    const editPayload = { ...editModal.data }
    setEditModal({ isOpen: false, type: null, title: '', data: {} })

    setConfirmModal({
      isOpen: true,
      title: 'Cập Nhật Gói Hội Viên',
      message: `Xác nhận lưu thay đổi cho gói hội viên "${editPayload.name}"?`,
      confirmText: 'Lưu Gói',
      type: 'primary',
      action: async () => {
        try {
          await managerService.updatePackage(token, editPayload.id, {
            name: editPayload.name,
            description: editPayload.description,
            tierLevel: Number(editPayload.tierLevel),
            monthlyPrice: Number(editPayload.monthlyPrice),
            tuitionDiscountPct: Number(editPayload.tuitionDiscountPct),
            oneOnOneDiscountPct: Number(editPayload.oneOnOneDiscountPct),
          })
          toast.success('Cập nhật gói hội viên thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Cập nhật gói thất bại')
        }
      },
    })
  }

  // --- 4. MÔN THỂ THAO ---
  const handleCreateCategory = async (e) => {
    e.preventDefault()
    try {
      await managerService.createCategory(token, newCategory)
      toast.success('Thêm môn thể thao thành công!')
      setNewCategory({ name: '', description: '' })
      loadData()
    } catch (err) {
      toast.error(err.message || 'Lỗi khi tạo môn thể thao')
    }
  }

  const openEditCategory = (c) => {
    setEditModal({
      isOpen: true,
      type: 'category',
      title: `Chỉnh Sửa Môn "${c.name}"`,
      data: {
        id: c.id,
        name: c.name || '',
        description: c.description || '',
      },
    })
  }

  const handleSaveEditCategory = () => {
    const editPayload = { ...editModal.data }
    setEditModal({ isOpen: false, type: null, title: '', data: {} })

    setConfirmModal({
      isOpen: true,
      title: 'Cập Nhật Môn Thể Thao',
      message: `Xác nhận lưu thay đổi cho môn "${editPayload.name}"?`,
      confirmText: 'Lưu Thay Đổi',
      type: 'primary',
      action: async () => {
        try {
          await managerService.updateCategory(token, editPayload.id, {
            name: editPayload.name,
            description: editPayload.description,
          })
          toast.success('Cập nhật môn thể thao thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Cập nhật môn thất bại')
        }
      },
    })
  }

  // --- 5. LỚP HỌC ---
  const openEditClass = (cls) => {
    setEditModal({
      isOpen: true,
      type: 'class',
      title: `Chỉnh Sửa Lớp "${cls.name}"`,
      data: {
        id: cls.id,
        name: cls.name || '',
        coachId: cls.coachId,
        maxCapacity: cls.maxCapacity || 20,
        tuition: cls.tuition || 0,
        startDate: cls.startDate || '',
        registrationOpensOn: cls.registrationOpensOn || '',
        description: cls.description || '',
      },
    })
  }

  const handleSaveEditClass = () => {
    const editPayload = { ...editModal.data }
    setEditModal({ isOpen: false, type: null, title: '', data: {} })

    setConfirmModal({
      isOpen: true,
      title: 'Cập Nhật Lớp Học',
      message: `Xác nhận lưu thông tin lớp "${editPayload.name}"?`,
      confirmText: 'Lưu Lớp Học',
      type: 'primary',
      action: async () => {
        try {
          await managerService.updateClass(token, editPayload.id, {
            name: editPayload.name,
            coachId: Number(editPayload.coachId),
            maxCapacity: Number(editPayload.maxCapacity),
            tuition: Number(editPayload.tuition),
            startDate: editPayload.startDate,
            registrationOpensOn: editPayload.registrationOpensOn || null,
            description: editPayload.description,
          })
          toast.success('Cập nhật lớp học thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Cập nhật lớp học thất bại')
        }
      },
    })
  }

  // Hủy lớp: nói rõ hậu quả và bắt nhập lý do trước khi làm (không hoàn tác được)
  const [cancelTarget, setCancelTarget] = useState(null)
  const requestCancelClass = (id, name) => {
    const cls = classes.find((c) => c.id === id)
    setCancelTarget({ id, name, inProgress: cls?.status === 'IN_PROGRESS', students: classPerf[id]?.reservedSeats ?? 0 })
  }
  const cancelMessage = (t) => `Bạn sắp hủy lớp "${t.name}"${t.students ? ` đang có ${t.students} học viên` : ''}. `
    + 'Các buổi chưa diễn ra bị hủy và học viên nhận thông báo. '
    + (t.inProgress
      ? 'Lớp đã khai giảng nên học phí chỉ hoàn theo số buổi chưa học.'
      : 'Lớp chưa khai giảng nên học viên đã đóng tiền được hoàn đủ học phí.')
    + ' Việc này không thể hoàn tác.'
  const confirmCancelClass = async (reason) => {
    const { id } = cancelTarget
    setCancelTarget(null)
    try {
      await managerService.cancelClass(token, id, reason)
      toast.success('Đã hủy lớp học')
      loadData()
    } catch (err) {
      toast.error(err.message || 'Hủy lớp học thất bại')
    }
  }

  // --- 6. KHUNG GIỜ ---
  const handleToggleSlot = (slot) => {
    const nextActive = !slot.active
    setConfirmModal({
      isOpen: true,
      title: nextActive ? 'Kích Hoạt Khung Giờ' : 'Tạm Khóa Khung Giờ',
      message: nextActive
        ? `Bật lại Khung ${slot.slotNo} (${String(slot.startTime).slice(0, 5)} - ${String(slot.endTime).slice(0, 5)}) để xếp lịch lớp và nhận yêu cầu 1-1 vào khung này?`
        : `Khóa Khung ${slot.slotNo} (${String(slot.startTime).slice(0, 5)} - ${String(slot.endTime).slice(0, 5)}). Đang có ${slotUse[slot.id] || 0} lớp học khung này: các lớp đó vẫn học bình thường, chỉ không xếp thêm lớp hay buổi 1-1 mới vào khung này được nữa.`,
      confirmText: nextActive ? 'Kích Hoạt' : 'Tạm Khóa',
      type: nextActive ? 'primary' : 'danger',
      action: async () => {
        try {
          await managerService.toggleTimeSlot(token, slot.id, nextActive)
          toast.success(`Đã ${nextActive ? 'kích hoạt' : 'tạm khóa'} khung ${slot.slotNo} thành công!`)
          loadData()
        } catch (err) {
          toast.error(err.message || 'Thay đổi trạng thái khung giờ thất bại')
        }
      },
    })
  }

  return (
    <SidebarLayout workspace="MANAGER WORKSPACE" caption="QUẢN TRỊ" rootLabel="Không gian Quản lý" roleLabel="Quản lý" items={managerItems} activeId={activeTab} onSelect={(id) => { setActiveTab(id); if (params.toString()) setParams({}) }}>
    <div className={styles.container}>

      <main className={styles.main}>
        {/* Tổng quan tự có tiêu đề lớn trong phần mở đầu nên không cần tiêu đề trang */}
        {activeTab !== 'overview' && (
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>{TAB_INFO[headerKey]?.[0]}</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', maxWidth: 760 }}>{TAB_INFO[headerKey]?.[1]}</p>
            </div>
          </div>
        )}


        {loading ? (
          <p className="text-muted">Đang tải danh mục quản lý...</p>
        ) : (
          <>
            {activeTab === 'catalog' && (
              <div className={ui.chips} role="group" aria-label="Danh mục">
                {[['categories', 'Môn thể thao'], ['rooms', 'Phòng tập'], ['coaches', 'Coach'], ['slots', 'Khung giờ']].map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={catalogTab === id} className={catalogTab === id ? ui.on : ''} onClick={() => setCatalogTab(id)}>{label}</button>
                ))}
              </div>
            )}
            {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
            {activeTab === 'courses' && <CoursesTab onCreateClass={(courseId) => { setCreating({ courseId }); setActiveTab('classes') }} />}
            {activeTab === 'coachslots' && <CoachSlotsTab />}
            {activeTab === 'packages' && <PackagesTab packages={packages} onDone={loadData} onEdit={openEditPackage} />}
            {activeTab === 'weekly' && <WeeklyScheduleTab />}
            {view === 'coaches' && <ResourcesTab onOpenClass={(id) => { setOpsClassId(id); setActiveTab('classes') }} />}
            {activeTab === 'reports' && <ReportsTab />}
            {activeTab === 'refunds' && <RefundsTab />}

            {/* 1. QUẢN LÝ TÀI KHOẢN */}
            {activeTab === 'accounts' && (
              <AccountsTab
                accounts={accounts}
                categories={categories}
                form={newAccount}
                setForm={setNewAccount}
                coachSports={newCoachSports}
                setCoachSports={setNewCoachSports}
                onCreate={handleCreateAccount}
                onEdit={openEditAccount}
                onDeactivate={requestDeactivateAccount}
                onActivate={requestActivateAccount}
              />
            )}

            {view === 'rooms' && <RoomsTab />}

            {/* 4. QUẢN LÝ MÔN THỂ THAO */}
            {view === 'categories' && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Danh Mục Môn Thể Thao</h2>
                </div>

                <div className={styles.formBox}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Thêm Môn Thể Thao Mới</h3>
                  <form onSubmit={handleCreateCategory}>
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label className={styles.label}>Tên môn thể thao</label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Bơi Lội, Yoga, Pilates..."
                          className={styles.input}
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Mô tả tóm tắt</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Thông tin giới thiệu về môn thể thao..."
                          value={newCategory.description}
                          onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary">Thêm Môn Thể Thao</button>
                  </form>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Tên Môn</th>
                        <th className={styles.th}>Mô Tả</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id} className={styles.row}>
                          <td className={styles.td}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
                              {React.createElement(categoryIcon(c.name), { size: 18, color: 'var(--accent-blue)', 'aria-hidden': true })}{c.name}
                            </span>
                          </td>
                          <td className={styles.td}>{c.archived ? <span className={styles.hint}>Ngừng sử dụng · </span> : null}{c.description || 'Chưa cập nhật'}</td>
                          <td className={styles.td}>
                            <div className={styles.actions}>
                              {c.archived ? (
                                <button type="button" className={styles.btnEdit} onClick={() => restoreCategory(c)}>Dùng lại</button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className={styles.btnEdit}
                                    onClick={() => openEditCategory(c)}
                                  >
                                    Sửa
                                  </button>
                                  <button type="button" className={styles.btnDanger} onClick={() => askDeleteCategory(c)}>Xóa</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. QUẢN LÝ LỚP HỌC (SPORT CLASSES) */}
            {activeTab === 'classes' && creating && (
              <CreateClassPage
                initialCourseId={creating.courseId}
                onCancel={() => setCreating(null)}
                onDone={(id) => { setCreating(null); setOpsClassId(id); loadData(); window.scrollTo({ top: 0 }) }}
              />
            )}
            {activeTab === 'classes' && !creating && !opsClassId && (
              <ClassList
                classes={classes}
                schedules={classSchedules}
                performance={classPerf}
                selectedId={opsClassId}
                onOperate={(id) => { setOpsClassId(id); window.scrollTo({ top: 0 }) }}
                onEdit={openEditClass}
                onCancel={requestCancelClass}
                onAdd={() => setCreating({ courseId: null })}
              />
            )}
            {/* Vận hành lớp đang chọn: xếp lịch, sinh buổi, mở đăng ký, đổi coach, hủy buổi và học bù */}
            {activeTab === 'classes' && !creating && opsClassId && (
              <div id="class-ops">
                <ClassOpsTab key={opsClassId} hideList initialClassId={opsClassId} onBack={() => { setOpsClassId(null); loadData() }} />
              </div>
            )}

            {/* 6. QUẢN LÝ KHUNG GIỜ (TIME SLOTS) */}
            {view === 'slots' && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>8 Khung Giờ Cố Định</h2>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Khung</th>
                        <th className={styles.th}>Bắt Đầu</th>
                        <th className={styles.th}>Kết Thúc</th>
                        <th className={styles.th}>Lớp đang dùng</th>
                        <th className={styles.th}>Trạng Thái</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((ts) => (
                        <tr key={ts.id} className={styles.row}>
                          <td className={styles.td}><strong>Khung {ts.slotNo}</strong></td>
                          <td className={styles.td}>{String(ts.startTime).slice(0, 5)}</td>
                          <td className={styles.td}>{String(ts.endTime).slice(0, 5)}</td>
                          <td className={styles.td}>{slotUse[ts.id] || 0} lớp</td>
                          <td className={styles.td}>
                            <span className={ts.active ? styles.statusActive : styles.statusInactive}>
                              {ts.active ? 'Đang bật' : 'Đang khóa'}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <button
                              type="button"
                              className={ts.active ? styles.btnDanger : styles.btnAction}
                              onClick={() => handleToggleSlot(ts)}
                            >
                              {ts.active ? 'Khóa khung' : 'Bật lại'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>


      {/* MODAL CHỈNH SỬA THÔNG TIN CHUNG */}
      {editModal.isOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editModal.title}</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setEditModal({ isOpen: false, type: null, title: '', data: {} })}
              >
                ×
              </button>
            </div>

            {/* Form chỉnh sửa Tài Khoản */}
            {editModal.type === 'account' && (
              <div className={styles.modalForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Họ và tên</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editModal.data.fullName}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, fullName: e.target.value } })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Số điện thoại</label>
                  <input
                    type="tel"
                    className={styles.input}
                    value={editModal.data.phone}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, phone: e.target.value } })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Vai trò (chọn lúc tạo, không đổi được)</label>
                  <input className={styles.input} disabled value={ROLE_VI[editModal.data.roleCode] || editModal.data.roleCode} />
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditModal({ isOpen: false, type: null, title: '', data: {} })}
                  >
                    Hủy
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSaveEditAccount}>
                    Lưu Thay Đổi
                  </button>
                </div>
              </div>
            )}

            {/* Form chỉnh sửa Gói Tập */}
            {editModal.type === 'package' && (
              <div className={styles.modalForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Tên gói hội viên</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editModal.data.name}
                    readOnly
                    aria-readonly="true"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Giá gói mỗi tháng (VNĐ)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={editModal.data.monthlyPrice}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, monthlyPrice: e.target.value } })}
                  />
                </div>
                <div className={styles.modalGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Ưu đãi học phí lớp (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className={styles.input}
                      value={editModal.data.tuitionDiscountPct}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, tuitionDiscountPct: e.target.value } })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Ưu đãi thuê HLV 1-1 (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className={styles.input}
                      value={editModal.data.oneOnOneDiscountPct}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, oneOnOneDiscountPct: e.target.value } })}
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Mô tả quyền lợi</label>
                  <textarea
                    rows="3"
                    className={styles.textarea}
                    value={editModal.data.description}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, description: e.target.value } })}
                  />
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditModal({ isOpen: false, type: null, title: '', data: {} })}
                  >
                    Hủy
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSaveEditPackage}>
                    Lưu Gói
                  </button>
                </div>
              </div>
            )}

            {/* Form chỉnh sửa Môn Thể Thao */}
            {editModal.type === 'category' && (
              <div className={styles.modalForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Tên môn thể thao</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editModal.data.name}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Mô tả tóm tắt</label>
                  <textarea
                    rows="3"
                    className={styles.textarea}
                    value={editModal.data.description}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, description: e.target.value } })}
                  />
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditModal({ isOpen: false, type: null, title: '', data: {} })}
                  >
                    Hủy
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSaveEditCategory}>
                    Lưu Môn
                  </button>
                </div>
              </div>
            )}

            {/* Form chỉnh sửa Lớp Học */}
            {editModal.type === 'class' && (
              <div className={styles.modalForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Tên lớp học</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editModal.data.name}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })}
                  />
                </div>
                <div className={styles.modalGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Sĩ số tối đa (Người)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={editModal.data.maxCapacity}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, maxCapacity: e.target.value } })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Học phí (VNĐ)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={editModal.data.tuition}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, tuition: e.target.value } })}
                    />
                  </div>
                </div>
                <div className={styles.modalGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Ngày khai giảng</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={editModal.data.startDate}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, startDate: e.target.value } })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Tự mở đăng ký vào ngày (không bắt buộc)</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={editModal.data.registrationOpensOn}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, registrationOpensOn: e.target.value } })}
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Mô tả lớp học</label>
                  <textarea
                    rows="3"
                    className={styles.textarea}
                    value={editModal.data.description}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, description: e.target.value } })}
                  />
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditModal({ isOpen: false, type: null, title: '', data: {} })}
                  >
                    Hủy
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSaveEditClass}>
                    Lưu Lớp Học
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal xác nhận 3 giây an toàn */}
      <ReasonDialog isOpen={!!cancelTarget} title="Hủy lớp học" message={cancelTarget ? cancelMessage(cancelTarget) : ''}
        label="Lý do hủy lớp (học viên sẽ thấy)" minLength={5} confirmText="Hủy lớp" onConfirm={confirmCancelClass} onCancel={() => setCancelTarget(null)} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={() => {
          const action = confirmModal.action
          setConfirmModal({ ...confirmModal, isOpen: false })
          if (action) action()
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
    </SidebarLayout>
  )
}
