import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import ConfirmModal from '../../components/common/ConfirmModal'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Bảng điều khiển Quản Lý Trung Tâm (Manager) - Flow 1 & Flow 2
export default function ManagerDashboard() {
  const { user, token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('accounts') // 'accounts' | 'packages' | 'rooms' | 'categories' | 'classes' | 'slots'
  const [accounts, setAccounts] = useState([])
  const [packages, setPackages] = useState([])
  const [rooms, setRooms] = useState([])
  const [categories, setCategories] = useState([])
  const [classes, setClasses] = useState([])
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
  const [newRoom, setNewRoom] = useState({ roomName: '', floor: 'Tầng 1', capacity: 20, description: '' })
  const [newCategory, setNewCategory] = useState({ name: '', description: '' })

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    loadData()
  }, [token, activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'accounts') {
        const data = await managerService.getAccounts(token)
        setAccounts(Array.isArray(data) ? data : data?.value || [])
      } else if (activeTab === 'packages') {
        const data = await managerService.getAllPackages(token)
        setPackages(Array.isArray(data) ? data : data?.value || [])
      } else if (activeTab === 'rooms') {
        const data = await managerService.getRooms(token)
        setRooms(Array.isArray(data) ? data : data?.value || [])
      } else if (activeTab === 'categories') {
        const data = await managerService.getCategories(token)
        setCategories(Array.isArray(data) ? data : data?.value || [])
      } else if (activeTab === 'classes') {
        const data = await managerService.getClasses(token)
        setClasses(Array.isArray(data) ? data : data?.value || [])
      } else if (activeTab === 'slots') {
        const data = await managerService.getTimeSlots(token)
        setTimeSlots(Array.isArray(data) ? data : data?.value || [])
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
    try {
      await managerService.createAccount(token, newAccount)
      toast.success('Tạo tài khoản nhân sự thành công!')
      setNewAccount({ fullName: '', email: '', phone: '', password: '', roleCode: 'COACH' })
      loadData()
    } catch (err) {
      toast.error(err.message || 'Lỗi khi tạo tài khoản')
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
            roleCode: editPayload.roleCode,
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

  // --- 3. PHÒNG TẬP ---
  const handleCreateRoom = async (e) => {
    e.preventDefault()
    try {
      await managerService.createRoom(token, {
        roomName: newRoom.roomName,
        floor: newRoom.floor || 'Tầng 1',
        capacity: parseInt(newRoom.capacity, 10),
        description: newRoom.description || '',
      })
      toast.success('Thêm phòng tập thành công!')
      setNewRoom({ roomName: '', floor: 'Tầng 1', capacity: 20, description: '' })
      loadData()
    } catch (err) {
      toast.error(err.message || 'Lỗi khi tạo phòng')
    }
  }

  const openEditRoom = (r) => {
    setEditModal({
      isOpen: true,
      type: 'room',
      title: `Chỉnh Sửa Phòng "${r.roomName}"`,
      data: {
        id: r.id,
        roomName: r.roomName || '',
        floor: r.floor || 'Tầng 1',
        capacity: r.capacity || 20,
        description: r.description || '',
      },
    })
  }

  const handleSaveEditRoom = () => {
    const editPayload = { ...editModal.data }
    setEditModal({ isOpen: false, type: null, title: '', data: {} })

    setConfirmModal({
      isOpen: true,
      title: 'Cập Nhật Phòng Tập',
      message: `Xác nhận lưu thay đổi cho phòng "${editPayload.roomName}"?`,
      confirmText: 'Lưu Thay Đổi',
      type: 'primary',
      action: async () => {
        try {
          await managerService.updateRoom(token, editPayload.id, {
            roomName: editPayload.roomName,
            floor: editPayload.floor,
            capacity: parseInt(editPayload.capacity, 10),
            description: editPayload.description,
          })
          toast.success('Cập nhật phòng tập thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Cập nhật phòng thất bại')
        }
      },
    })
  }

  const requestDeleteRoom = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Phòng Tập',
      message: `Bạn có chắc chắn muốn xóa phòng tập "${name}"? Các lớp học đặt tại phòng này sẽ bị ảnh hưởng.`,
      confirmText: 'Xóa Phòng',
      type: 'danger',
      action: async () => {
        try {
          await managerService.deleteRoom(token, id)
          toast.success('Đã xóa phòng tập thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Xóa phòng thất bại')
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

  const requestDeleteCategory = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Môn Thể Thao',
      message: `Bạn có chắc chắn muốn xóa môn "${name}" khỏi hệ thống?`,
      confirmText: 'Xóa Môn',
      type: 'danger',
      action: async () => {
        try {
          await managerService.deleteCategory(token, id)
          toast.success('Đã xóa môn thể thao thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Xóa môn thể thao thất bại')
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
            registrationOpensOn: editPayload.registrationOpensOn,
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

  const requestCancelClass = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hủy Lớp Học',
      message: `Bạn có chắc chắn muốn hủy lớp "${name}"? Hệ thống sẽ tự động hủy lịch các buổi sắp tới và hoàn tiền cho học viên.`,
      confirmText: 'Hủy Lớp Ngay',
      type: 'danger',
      action: async () => {
        try {
          await managerService.cancelClass(token, id, 'Hủy bởi Quản lý trung tâm')
          toast.success('Đã hủy lớp học thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Hủy lớp học thất bại')
        }
      },
    })
  }

  // --- 6. KHUNG GIỜ ---
  const handleToggleSlot = (slot) => {
    const nextActive = !slot.isActive
    setConfirmModal({
      isOpen: true,
      title: nextActive ? 'Kích Hoạt Khung Giờ' : 'Tạm Khóa Khung Giờ',
      message: `Bạn có chắc chắn muốn ${nextActive ? 'kích hoạt' : 'tạm khóa'} Slot ${slot.slotNo} (${slot.startTime} - ${slot.endTime})?`,
      confirmText: nextActive ? 'Kích Hoạt' : 'Tạm Khóa',
      type: nextActive ? 'primary' : 'danger',
      action: async () => {
        try {
          await managerService.toggleTimeSlot(token, slot.id, nextActive)
          toast.success(`Đã ${nextActive ? 'kích hoạt' : 'tạm khóa'} Slot ${slot.slotNo} thành công!`)
          loadData()
        } catch (err) {
          toast.error(err.message || 'Thay đổi trạng thái khung giờ thất bại')
        }
      },
    })
  }

  return (
    <div className={styles.container}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.badge}>Ban Quản Lý Trung Tâm</div>
            <h1 className={styles.pageTitle}>Bảng Quản Trị Hệ Thống</h1>
          </div>
        </div>

        {/* Tab điều hướng tính năng quản lý */}
        <nav className={styles.tabNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'accounts' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            Tài Khoản Nhân Sự
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'packages' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('packages')}
          >
            Gói Hội Viên
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'rooms' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            Phòng Tập
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'categories' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Môn Thể Thao
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'classes' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            Lớp Học
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'slots' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('slots')}
          >
            Khung Giờ (Time Slots)
          </button>
        </nav>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Đang tải danh mục quản lý...</p>
        ) : (
          <>
            {/* 1. QUẢN LÝ TÀI KHOẢN */}
            {activeTab === 'accounts' && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Danh Sách Tài Khoản Hệ Thống</h2>
                </div>

                <div className={styles.formBox}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Tạo Mới Tài Khoản Nhân Viên / HLV</h3>
                  <form onSubmit={handleCreateAccount}>
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label className={styles.label}>Họ và tên</label>
                        <input
                          type="text"
                          required
                          className={styles.input}
                          value={newAccount.fullName}
                          onChange={(e) => setNewAccount({ ...newAccount, fullName: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Email</label>
                        <input
                          type="email"
                          required
                          className={styles.input}
                          value={newAccount.email}
                          onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Số điện thoại</label>
                        <input
                          type="tel"
                          required
                          className={styles.input}
                          value={newAccount.phone}
                          onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Mật khẩu</label>
                        <input
                          type="password"
                          required
                          className={styles.input}
                          value={newAccount.password}
                          onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Vai trò (Role)</label>
                        <select
                          className={styles.select}
                          value={newAccount.roleCode}
                          onChange={(e) => setNewAccount({ ...newAccount, roleCode: e.target.value })}
                        >
                          <option value="COACH">Huấn Luyện Viên (COACH)</option>
                          <option value="RECEPTIONIST">Nhân Viên Lễ Tân (RECEPTIONIST)</option>
                          <option value="MANAGER">Quản Lý (MANAGER)</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="btn-primary">Tạo Tài Khoản</button>
                  </form>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>ID</th>
                        <th className={styles.th}>Họ Tên</th>
                        <th className={styles.th}>Email</th>
                        <th className={styles.th}>Vai Trò</th>
                        <th className={styles.th}>Trạng Thái</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((acc) => {
                        const isAccountActive = acc.active !== undefined ? acc.active : acc.isActive
                        const isManager = acc.role === 'MANAGER' || (acc.role && acc.role.code === 'MANAGER')
                        return (
                          <tr key={acc.id} className={styles.row}>
                            <td className={styles.td}>#{acc.id}</td>
                            <td className={styles.td}><strong>{acc.fullName}</strong></td>
                            <td className={styles.td}>{acc.email}</td>
                            <td className={styles.td}>{acc.role || (acc.role && acc.role.code)}</td>
                            <td className={styles.td}>
                              <span className={isAccountActive ? styles.statusActive : styles.statusInactive}>
                                {isAccountActive ? 'Hoạt động' : 'Đã khóa'}
                              </span>
                            </td>
                            <td className={styles.td}>
                              <div className={styles.actions}>
                                <button
                                  type="button"
                                  className={styles.btnEdit}
                                  onClick={() => openEditAccount(acc)}
                                >
                                  Sửa
                                </button>
                                {isManager ? (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Cố định</span>
                                ) : isAccountActive ? (
                                  <button
                                    type="button"
                                    className={styles.btnDanger}
                                    onClick={() => requestDeactivateAccount(acc.id, acc.email)}
                                  >
                                    Khóa
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.btnAction}
                                    onClick={() => requestActivateAccount(acc.id, acc.email)}
                                  >
                                    Kích hoạt
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. QUẢN LÝ GÓI HỘI VIÊN */}
            {activeTab === 'packages' && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Quản Lý Bảng Gói Hội Viên</h2>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Mã</th>
                        <th className={styles.th}>Tên Gói</th>
                        <th className={styles.th}>Hạng (Tier)</th>
                        <th className={styles.th}>Giá Tháng</th>
                        <th className={styles.th}>Ưu Đãi Lớp</th>
                        <th className={styles.th}>Ưu Đãi 1-1</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packages.map((pkg) => (
                        <tr key={pkg.id} className={styles.row}>
                          <td className={styles.td}><code>{pkg.code}</code></td>
                          <td className={styles.td}><strong>{pkg.name}</strong></td>
                          <td className={styles.td}>Cấp {pkg.tierLevel}</td>
                          <td className={styles.td}>{formatVND(pkg.monthlyPrice)}</td>
                          <td className={styles.td}>{pkg.tuitionDiscountPct}%</td>
                          <td className={styles.td}>{pkg.oneOnOneDiscountPct}%</td>
                          <td className={styles.td}>
                            <button
                              type="button"
                              className={styles.btnEdit}
                              onClick={() => openEditPackage(pkg)}
                            >
                              Sửa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. QUẢN LÝ PHÒNG TẬP */}
            {activeTab === 'rooms' && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Danh Sách Phòng Tập (Facility Rooms)</h2>
                </div>

                <div className={styles.formBox}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Thêm Phòng Tập Mới</h3>
                  <form onSubmit={handleCreateRoom}>
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label className={styles.label}>Tên phòng</label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Phòng Yoga 01"
                          className={styles.input}
                          value={newRoom.roomName}
                          onChange={(e) => setNewRoom({ ...newRoom, roomName: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Tầng</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Tầng 1, Tầng 2"
                          className={styles.input}
                          value={newRoom.floor}
                          onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Sức chứa tối đa (Người)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className={styles.input}
                          value={newRoom.capacity}
                          onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Mô tả phòng</label>
                        <input
                          type="text"
                          placeholder="Thông tin trang thiết bị phòng..."
                          className={styles.input}
                          value={newRoom.description}
                          onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary">Thêm Phòng</button>
                  </form>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>ID</th>
                        <th className={styles.th}>Tên Phòng</th>
                        <th className={styles.th}>Tầng</th>
                        <th className={styles.th}>Sức Chứa</th>
                        <th className={styles.th}>Trạng Thái</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((r) => (
                        <tr key={r.id} className={styles.row}>
                          <td className={styles.td}>#{r.id}</td>
                          <td className={styles.td}><strong>{r.roomName}</strong></td>
                          <td className={styles.td}>{r.floor || 'Tầng 1'}</td>
                          <td className={styles.td}>{r.capacity} người</td>
                          <td className={styles.td}>
                            <span className={styles.statusActive}>{r.maintenanceStatus || 'AVAILABLE'}</span>
                          </td>
                          <td className={styles.td}>
                            <div className={styles.actions}>
                              <button
                                type="button"
                                className={styles.btnEdit}
                                onClick={() => openEditRoom(r)}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={() => requestDeleteRoom(r.id, r.roomName)}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. QUẢN LÝ MÔN THỂ THAO */}
            {activeTab === 'categories' && (
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
                        <th className={styles.th}>ID</th>
                        <th className={styles.th}>Tên Môn</th>
                        <th className={styles.th}>Mô Tả</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id} className={styles.row}>
                          <td className={styles.td}>#{c.id}</td>
                          <td className={styles.td}><strong>{c.name}</strong></td>
                          <td className={styles.td}>{c.description || 'Chưa cập nhật'}</td>
                          <td className={styles.td}>
                            <div className={styles.actions}>
                              <button
                                type="button"
                                className={styles.btnEdit}
                                onClick={() => openEditCategory(c)}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={() => requestDeleteCategory(c.id, c.name)}
                              >
                                Xóa
                              </button>
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
            {activeTab === 'classes' && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Danh Sách Lớp Học Thể Thao Đã Mở</h2>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Mã Lớp</th>
                        <th className={styles.th}>Tên Lớp</th>
                        <th className={styles.th}>Môn Thể Thao</th>
                        <th className={styles.th}>Học Phí</th>
                        <th className={styles.th}>Sĩ Số</th>
                        <th className={styles.th}>Trạng Thái</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((cls) => (
                        <tr key={cls.id} className={styles.row}>
                          <td className={styles.td}><code>{cls.code || `#${cls.id}`}</code></td>
                          <td className={styles.td}><strong>{cls.name}</strong></td>
                          <td className={styles.td}>{cls.categoryName || 'Chung'}</td>
                          <td className={styles.td}>{formatVND(cls.tuition)}</td>
                          <td className={styles.td}>{cls.enrolledCount || 0} / {cls.maxCapacity || 20}</td>
                          <td className={styles.td}>
                            <span className={cls.status === 'OPEN' ? styles.statusActive : styles.statusInactive}>
                              {cls.status}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <div className={styles.actions}>
                              <button
                                type="button"
                                className={styles.btnEdit}
                                onClick={() => openEditClass(cls)}
                              >
                                Sửa
                              </button>
                              {cls.status !== 'CANCELED' && (
                                <button
                                  type="button"
                                  className={styles.btnDanger}
                                  onClick={() => requestCancelClass(cls.id, cls.name)}
                                >
                                  Hủy Lớp
                                </button>
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

            {/* 6. QUẢN LÝ KHUNG GIỜ (TIME SLOTS) */}
            {activeTab === 'slots' && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Khung Giờ Cố Định (8 Tiết Chuẩn)</h2>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Slot</th>
                        <th className={styles.th}>Bắt Đầu</th>
                        <th className={styles.th}>Kết Thúc</th>
                        <th className={styles.th}>Trạng Thái</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((ts) => (
                        <tr key={ts.id} className={styles.row}>
                          <td className={styles.td}><strong>Slot {ts.slotNo}</strong></td>
                          <td className={styles.td}>{ts.startTime}</td>
                          <td className={styles.td}>{ts.endTime}</td>
                          <td className={styles.td}>
                            <span className={ts.isActive ? styles.statusActive : styles.statusInactive}>
                              {ts.isActive ? 'Đang kích hoạt' : 'Tạm khóa'}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <button
                              type="button"
                              className={ts.isActive ? styles.btnDanger : styles.btnAction}
                              onClick={() => handleToggleSlot(ts)}
                            >
                              {ts.isActive ? 'Khóa Slot' : 'Kích Hoạt'}
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

      <Footer />

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
                  <label className={styles.label}>Vai trò</label>
                  <select
                    className={styles.select}
                    value={editModal.data.roleCode}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, roleCode: e.target.value } })}
                  >
                    <option value="MEMBER">Hội viên (MEMBER)</option>
                    <option value="COACH">Huấn luyện viên (COACH)</option>
                    <option value="RECEPTIONIST">Nhân viên lễ tân (RECEPTIONIST)</option>
                  </select>
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
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })}
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

            {/* Form chỉnh sửa Phòng Tập */}
            {editModal.type === 'room' && (
              <div className={styles.modalForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Tên phòng tập</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={editModal.data.roomName}
                    onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, roomName: e.target.value } })}
                  />
                </div>
                <div className={styles.modalGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Vị trí tầng</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={editModal.data.floor}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, floor: e.target.value } })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Sức chứa tối đa (Người)</label>
                    <input
                      type="number"
                      min="1"
                      className={styles.input}
                      value={editModal.data.capacity}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, capacity: e.target.value } })}
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Mô tả tiện ích phòng</label>
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
                  <button type="button" className="btn-primary" onClick={handleSaveEditRoom}>
                    Lưu Phòng
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
                    <label className={styles.label}>Ngày mở đăng ký</label>
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
  )
}
