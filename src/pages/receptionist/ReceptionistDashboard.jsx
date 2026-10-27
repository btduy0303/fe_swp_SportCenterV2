import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { receptionistService } from '../../services/receptionistService'
import { packageService } from '../../services/packageService'
import { formatVND } from '../../utils/format'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import ConfirmModal from '../../components/common/ConfirmModal'
import MemberDesk from '../../components/receptionist/MemberDesk'
import styles from '../../css/manager/ManagerDashboard.module.css'


export default function ReceptionistDashboard() {
  const { user, token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [members, setMembers] = useState([])
  const [packages, setPackages] = useState([])
  const [searchKey, setSearchKey] = useState('')
  const [loading, setLoading] = useState(true)


  const [newMember, setNewMember] = useState({ fullName: '', email: '', phone: '', password: '' })


  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('')


  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    type: 'danger',
    action: null,
  })

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    loadData()
  }, [token])

  const loadData = async (keyword = '') => {
    setLoading(true)
    try {
      const [memberList, pkgList] = await Promise.all([
        receptionistService.searchMembers(token, keyword),
        packageService.getActivePackages(),
      ])
      setMembers(memberList)
      setPackages(pkgList)
      if (pkgList.length > 0 && !selectedPackageId) {
        setSelectedPackageId(pkgList[0].id)
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Lỗi khi tải dữ liệu lễ tân')
    } finally {
      setLoading(false)
    }
  }


  const handleSearch = (e) => {
    e.preventDefault()
    loadData(searchKey)
  }


  const handleRegisterMember = async (e) => {
    e.preventDefault()
    try {
      await receptionistService.registerMemberAtDesk(token, newMember)
      toast.success('Đăng ký tài khoản hội viên tại quầy thành công!')
      setNewMember({ fullName: '', email: '', phone: '', password: '' })
      loadData(searchKey)
    } catch (err) {
      toast.error(err.message || 'Lỗi khi đăng ký hội viên')
    }
  }


  const requestAssignPackage = (e) => {
    e.preventDefault()
    if (!selectedMemberId || !selectedPackageId) {
      toast.error('Vui lòng chọn hội viên và gói tập')
      return
    }

    const pkg = packages.find((p) => String(p.id) === String(selectedPackageId))
    const mem = members.find((m) => String(m.id) === String(selectedMemberId))

    setConfirmModal({
      isOpen: true,
      title: 'Xác Nhận Đăng Ký Gói Tại Quầy',
      message: `Bạn có chắc muốn đăng ký gói "${pkg?.name}" cho hội viên "${mem?.fullName || selectedMemberId}"?`,
      confirmText: 'Xác Nhận Đăng Ký',
      type: 'primary',
      action: async () => {
        try {
          await receptionistService.subscribeMemberPackage(token, selectedMemberId, selectedPackageId, 1)
          toast.success('Đã đăng ký gói thành công! Hội viên có thể thanh toán tại quầy.')
        } catch (err) {
          toast.error(err.message || 'Lỗi khi gán gói')
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
            <div className={styles.badge}>Bộ Phận Tiếp Đón & Lễ Tân</div>
            <h1 className={styles.pageTitle}>Quản Lý Khách Hàng Tại Quầy</h1>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Tạo Mới Hồ Sơ Hội Viên Trực Tiếp</h2>
          <form onSubmit={handleRegisterMember}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Họ và tên khách hàng</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  className={styles.input}
                  value={newMember.fullName}
                  onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email liên lạc</label>
                <input
                  type="email"
                  required
                  placeholder="khachhang@example.com"
                  className={styles.input}
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Số điện thoại</label>
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  className={styles.input}
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Mật khẩu khởi tạo</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  className={styles.input}
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">Tạo Tài Khoản Cho Khách</button>
          </form>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Đăng Ký Gói Tập & Thu Phí Tại Quầy</h2>
          <form onSubmit={requestAssignPackage}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Chọn Hội Viên</label>
                <select
                  className={styles.select}
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                  <option value="">-- Chọn hội viên cần gán gói --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.id} - {m.fullName} ({m.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Gói Hội Viên Đăng Ký</label>
                <select
                  className={styles.select}
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatVND(p.monthlyPrice)} / tháng
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary">Xác Nhận Đăng Ký (3s)</button>
          </form>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Tra Cứu Thông Tin Hội Viên</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Nhập tên hội viên..."
                className={styles.input}
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
              />
              <button type="submit" className="btn-secondary">Tìm Kiếm</button>
            </form>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Đang tra cứu danh sách hội viên...</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>ID</th>
                    <th className={styles.th}>Họ Tên</th>
                    <th className={styles.th}>Email</th>
                    <th className={styles.th}>Số Điện Thoại</th>
                    <th className={styles.th}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className={styles.row}>
                      <td className={styles.td}>#{m.id}</td>
                      <td className={styles.td}><strong>{m.fullName}</strong></td>
                      <td className={styles.td}>{m.email}</td>
                      <td className={styles.td}>{m.phone || 'Chưa cập nhật'}</td>
                      <td className={styles.td}>
                        <span className={m.active || m.isActive ? styles.statusActive : styles.statusInactive}>
                          {m.active || m.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Xử lý chi tiết cho hội viên đang chọn ở form gán gói phía trên */}
        <MemberDesk memberId={selectedMemberId} packages={packages} />
      </main>

      <Footer />

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
