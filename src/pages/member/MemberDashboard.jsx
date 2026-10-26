import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { memberService } from '../../services/memberService'
import { bookingService } from '../../services/bookingService'
import { packageService } from '../../services/packageService'
import { formatVND } from '../../utils/format'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import ConfirmModal from '../../components/common/ConfirmModal'
import styles from '../../css/member/MemberDashboard.module.css'


export default function MemberDashboard() {
  const { user, token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('subscription')
  const [subscription, setSubscription] = useState(null)
  const [packages, setPackages] = useState([])
  const [classRegistrations, setClassRegistrations] = useState([])
  const [coachSlots, setCoachSlots] = useState([])
  const [myAssessments, setMyAssessments] = useState([])
  const [openAssessments, setOpenAssessments] = useState([])
  const [fitnessProgress, setFitnessProgress] = useState([])
  const [myVouchers, setMyVouchers] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedMonths, setSelectedMonths] = useState({})
  const [packageQuotes, setPackageQuotes] = useState({})


  const [voucherCodeInput, setVoucherCodeInput] = useState('')


  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    type: 'danger',
    action: null,
  })


  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    gender: 'MALE',
    weightKg: '',
    fitnessGoal: '',
  })


  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    loadAllData()
  }, [token])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [sub, pkgList, regList, mySlots, myAsm, openAsm, progress, vchList, me] = await Promise.all([
        memberService.getMySubscription(token),
        packageService.getActivePackages(),
        bookingService.getMyClassRegistrations(token),
        bookingService.getMyCoachSlots(token),
        bookingService.getMyAssessments(token),
        bookingService.getAssessmentSlots(token),
        bookingService.getMyFitnessProgress(token),
        memberService.getMyVouchers(token),
        authService.getMe(token),
      ])

      setSubscription(sub)
      setPackages(pkgList)
      setClassRegistrations(regList)
      setCoachSlots(mySlots)
      setMyAssessments(myAsm)
      setOpenAssessments(openAsm)
      setFitnessProgress(progress)
      setMyVouchers(vchList)


      const defaultMonths = {}
      const quotes = {}
      for (const p of pkgList) {
        defaultMonths[p.id] = 1
        quotes[p.id] = { totalAmount: p.monthlyPrice, longTermDiscountPct: 0 }
      }
      setSelectedMonths(defaultMonths)
      setPackageQuotes(quotes)

      if (me) {
        setProfileData({
          fullName: me.fullName || '',
          phone: me.phone || '',
          gender: me.gender || 'MALE',
          weightKg: me.weightKg || '',
          fitnessGoal: me.fitnessGoal || '',
        })
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Lỗi khi tải dữ liệu hội viên')
    } finally {
      setLoading(false)
    }
  }


  const handleSelectMonths = async (pkgId, months) => {
    setSelectedMonths((prev) => ({ ...prev, [pkgId]: months }))
    try {
      const quote = await packageService.getQuote(pkgId, months)
      if (quote) {
        setPackageQuotes((prev) => ({ ...prev, [pkgId]: quote }))
      }
    } catch (err) {
      console.error('Lỗi tính quote:', err)
    }
  }

  // Đăng ký mua gói tập mới (Flow 1)
  const handleBuyPackage = (packageId) => {
    const months = selectedMonths[packageId] || 1
    const pkg = packages.find((p) => p.id === packageId)
    const quote = packageQuotes[packageId]
    const priceText = quote ? formatVND(quote.totalAmount) : ''

    setConfirmModal({
      isOpen: true,
      title: 'Xác Nhận Đăng Ký Gói',
      message: `Bạn muốn đăng ký gói "${pkg?.name || ''}" trong thời hạn ${months} tháng với tổng thanh toán là ${priceText}?`,
      confirmText: 'Đăng Ký & Tạo Đơn',
      type: 'primary',
      action: async () => {
        try {
          await memberService.subscribePackage(token, packageId, months)
          toast.success('Đăng ký gói thành công! Hãy tiến hành thanh toán.')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Lỗi khi đăng ký gói')
        }
      },
    })
  }

  // Gia hạn gói hội viên (BR-PKG-09)
  const handleRenewPackage = (packageId) => {
    const months = selectedMonths[packageId] || 1
    setConfirmModal({
      isOpen: true,
      title: 'Gia Hạn Gói Hội Viên',
      message: `Gia hạn thêm ${months} tháng sẽ nối tiếp ngày hết hạn gói hiện tại của bạn. Bạn có muốn tiếp tục?`,
      confirmText: 'Xác Nhận Gia Hạn',
      type: 'primary',
      action: async () => {
        try {
          await memberService.renewSubscription(token, packageId, months)
          toast.success('Tạo đơn gia hạn gói thành công!')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Gia hạn gói thất bại')
        }
      },
    })
  }

  // Nâng cấp gói hội viên (BR-PKG-10)
  const handleUpgradePackage = (packageId) => {
    const months = selectedMonths[packageId] || 1
    setConfirmModal({
      isOpen: true,
      title: 'Nâng Cấp Gói Hội Viên',
      message: `Nâng cấp gói sẽ có hiệu lực ngay lập tức, khấu trừ giá trị còn lại của gói cũ theo ngày. Bạn có muốn tiếp tục?`,
      confirmText: 'Xác Nhận Nâng Cấp',
      type: 'primary',
      action: async () => {
        try {
          await memberService.upgradeSubscription(token, packageId, months)
          toast.success('Tạo đơn nâng cấp gói thành công!')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Nâng cấp gói thất bại')
        }
      },
    })
  }

  // Đổi mã voucher (BR-VCH-02)
  const handleRedeemVoucher = async (e) => {
    e.preventDefault()
    if (!voucherCodeInput.trim()) {
      toast.error('Vui lòng nhập mã voucher')
      return
    }
    try {
      await memberService.redeemVoucher(token, voucherCodeInput.trim())
      toast.success('Nhận voucher thành công!')
      setVoucherCodeInput('')
      const vchs = await memberService.getMyVouchers(token)
      setMyVouchers(vchs)
    } catch (err) {
      toast.error(err.message || 'Mã voucher không hợp lệ hoặc đã hết lượt')
    }
  }

  // Yêu cầu xác nhận hủy gói tập (đếm ngược 3s)
  const requestCancelSubscription = (subId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hủy Gói Tập',
      message: 'Bạn có chắc chắn muốn hủy gói tập hiện tại? Hành động này sẽ hủy kích hoạt các quyền lợi hội viên.',
      confirmText: 'Xác Nhận Hủy',
      type: 'danger',
      action: async () => {
        try {
          await memberService.cancelSubscription(token, subId)
          toast.success('Đã hủy gói tập thành công!')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Hủy gói tập thất bại')
        }
      },
    })
  }

  // Yêu cầu xác nhận hủy đăng ký lớp học (đếm ngược 3s) (BR-CAN-01)
  const requestCancelClass = (regId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hủy Đăng Ký Lớp',
      message: 'Hủy trước ngày khai giảng sẽ được hoàn lại 100% học phí. Từ ngày khai giảng không hoàn tiền.',
      confirmText: 'Hủy Đăng Ký',
      type: 'danger',
      action: async () => {
        try {
          await bookingService.cancelClassRegistration(token, regId)
          toast.success('Đã hủy đăng ký lớp học!')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Hủy lớp học thất bại')
        }
      },
    })
  }

  // Đặt lịch đánh giá thể lực (BR-ASM-01)
  const handleBookAssessment = (slotId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Đặt Lịch Đánh Giá Thể Lực',
      message: 'Bạn có muốn đặt lịch hẹn đo lường và đánh giá thể lực này với Huấn luyện viên? (Miễn phí nếu gói có quyền lợi)',
      confirmText: 'Xác Nhận Đặt',
      type: 'primary',
      action: async () => {
        try {
          await bookingService.bookAssessmentSlot(token, slotId)
          toast.success('Đặt lịch đánh giá thể lực thành công!')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Đặt lịch đánh giá thất bại')
        }
      },
    })
  }

  // Hủy lịch đánh giá thể lực
  const handleCancelAssessment = (slotId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hủy Lịch Đánh Giá',
      message: 'Bạn có chắc chắn muốn hủy lịch hẹn đánh giá này? Lượt của bạn sẽ được hoàn trả.',
      confirmText: 'Xác Nhận Hủy',
      type: 'danger',
      action: async () => {
        try {
          await bookingService.cancelAssessmentSlot(token, slotId)
          toast.success('Đã hủy lịch hẹn đánh giá!')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Hủy lịch đánh giá thất bại')
        }
      },
    })
  }

  // Yêu cầu xác nhận cập nhật hồ sơ cá nhân (đếm ngược 3s)
  const requestUpdateProfile = (e) => {
    e.preventDefault()
    setConfirmModal({
      isOpen: true,
      title: 'Cập Nhật Hồ Sơ',
      message: 'Bạn có chắc chắn muốn lưu lại các thay đổi thông tin cá nhân và thể trạng này?',
      confirmText: 'Lưu Thay Đổi',
      type: 'primary',
      action: async () => {
        try {
          await authService.updateMe(token, {
            fullName: profileData.fullName,
            phone: profileData.phone,
            gender: profileData.gender,
          })
          if (profileData.weightKg || profileData.fitnessGoal) {
            await authService.updateMemberProfile(token, {
              weightKg: profileData.weightKg ? parseFloat(profileData.weightKg) : null,
              fitnessGoal: profileData.fitnessGoal,
            })
          }
          toast.success('Cập nhật hồ sơ thành công!')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Cập nhật hồ sơ thất bại')
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
            <div className={styles.welcomeText}>Khu Vực Hội Viên</div>
            <h1 className={styles.pageTitle}>Xin chào, {user ? user.fullName : 'Hội viên'}</h1>
          </div>
        </div>

        {/* Thanh chuyển tab danh mục Flow 1 & Flow 2 */}
        <nav className={styles.tabNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'subscription' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            Gói Tập Của Tôi
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'classes' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            Lớp Học Đã Đăng Ký
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'slots' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('slots')}
          >
            Lịch Hẹn 1-1
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'assessments' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('assessments')}
          >
            Đánh Giá Thể Lực (BMI)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'vouchers' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('vouchers')}
          >
            Voucher Ưu Đãi
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Hồ Sơ Cá Nhân
          </button>
        </nav>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu hội viên...</p>
        ) : (
          <>
            {/* TAB 1: Gói tập & Gia hạn/Nâng cấp (Flow 1) */}
            {activeTab === 'subscription' && (
              <div>
                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Gói Hội Viên Đang Sử Dụng</h2>
                  {subscription ? (
                    <div className={styles.subCard}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: '700' }}>{subscription.packageName || 'Gói Tập'}</h3>
                          <span className={subscription.status === 'ACTIVE' ? styles.statusActive : styles.statusPending}>
                            {subscription.status}
                          </span>
                        </div>

                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Ngày bắt đầu:</span>
                          <span className={styles.metaValue}>{subscription.startDate || 'Chưa kích hoạt'}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Ngày hết hạn:</span>
                          <span className={styles.metaValue}>{subscription.endDate || 'Chưa kích hoạt'}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Giá thanh toán:</span>
                          <span className={styles.metaValue}>{formatVND(subscription.finalPrice || subscription.totalPrice)}</span>
                        </div>
                      </div>

                      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {subscription.status === 'ACTIVE' && (
                          <button
                            type="button"
                            className={styles.btnDanger}
                            onClick={() => requestCancelSubscription(subscription.id)}
                          >
                            Hủy Gói
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Bạn chưa có gói hội viên nào đang hoạt động.</p>
                  )}
                </div>

                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Danh Sách Gói Hội Viên & Lựa Chọn Số Tháng (BR-PKG-03)</h2>
                  <div className={styles.grid}>
                    {packages.map((pkg) => {
                      const curMonths = selectedMonths[pkg.id] || 1
                      const quote = packageQuotes[pkg.id]
                      const isCurrentActive = subscription?.status === 'ACTIVE' && subscription?.packageId === pkg.id

                      return (
                        <div key={pkg.id} className={styles.packageCard}>
                          <h3 className={styles.packageTitle}>{pkg.name}</h3>
                          <p className={styles.packageDesc}>{pkg.description || 'Gói tập chất lượng cao với đầy đủ tiện ích thể thao.'}</p>

                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Giảm học phí lớp:</span>
                            <span className={styles.metaValue}>{pkg.tuitionDiscountPct}%</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Giảm thuê HLV 1-1:</span>
                            <span className={styles.metaValue}>{pkg.oneOnOneDiscountPct}%</span>
                          </div>

                          {/* Chọn thời hạn tháng: 1, 3, 6, 12 tháng theo BR-PKG-03 */}
                          <div style={{ marginTop: '0.75rem' }}>
                            <span className={styles.metaLabel} style={{ fontSize: '0.8rem' }}>Thời hạn đăng ký:</span>
                            <div className={styles.monthSelector}>
                              {[1, 3, 6, 12].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  className={`${styles.monthBtn} ${curMonths === m ? styles.monthBtnActive : ''}`}
                                  onClick={() => handleSelectMonths(pkg.id, m)}
                                >
                                  {m}T
                                </button>
                              ))}
                            </div>
                          </div>

                          {quote?.longTermDiscountPct > 0 && (
                            <span className={styles.discountBadge}>
                              Ưu đãi giảm thêm {quote.longTermDiscountPct}% cho {curMonths} tháng
                            </span>
                          )}

                          <div className={styles.packagePrice} style={{ marginTop: '0.5rem' }}>
                            {formatVND(quote?.totalAmount || pkg.monthlyPrice * curMonths)}
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                              / {curMonths} tháng
                            </span>
                          </div>

                          {/* Nút hành động Mua mới / Gia hạn / Nâng cấp theo nghiệp vụ BR-PKG-09, BR-PKG-10 */}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexDirection: 'column' }}>
                            {isCurrentActive ? (
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => handleRenewPackage(pkg.id)}
                              >
                                Gia Hạn Gói ({curMonths} tháng)
                              </button>
                            ) : subscription?.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ background: '#8b5cf6' }}
                                onClick={() => handleUpgradePackage(pkg.id)}
                              >
                                Nâng Cấp Sang Gói Này
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => handleBuyPackage(pkg.id)}
                              >
                                Đăng Ký ({curMonths} tháng)
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Lớp học thể thao đã tham gia (Flow 2) */}
            {activeTab === 'classes' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Lớp Học Thể Thao Đã Đăng Ký</h2>
                {classRegistrations.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>Bạn chưa đăng ký lớp học nào.</p>
                ) : (
                  <div className={styles.grid}>
                    {classRegistrations.map((reg) => (
                      <div key={reg.id} className={styles.packageCard}>
                        <h3 className={styles.packageTitle}>{reg.className || `Lớp học #${reg.classId}`}</h3>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Trạng thái:</span>
                          <span className={reg.status === 'ENROLLED' ? styles.statusActive : styles.statusPending}>
                            {reg.status}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Học phí thực đóng:</span>
                          <span className={styles.metaValue}>{formatVND(reg.tuitionFeePaid || 0)}</span>
                        </div>

                        {reg.status === 'ENROLLED' && (
                          <button
                            type="button"
                            className={styles.btnDanger}
                            style={{ marginTop: '1rem', width: '100%' }}
                            onClick={() => requestCancelClass(reg.id)}
                          >
                            Hủy Đăng Ký (Hoàn tiền trước khai giảng)
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Lịch hẹn 1-1 (Flow 2) */}
            {activeTab === 'slots' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Lịch Hẹn Huấn Luyện Viên 1-1</h2>
                {coachSlots.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>Bạn chưa có buổi tập 1-1 nào đã đặt trước.</p>
                ) : (
                  <div className={styles.grid}>
                    {coachSlots.map((slot) => (
                      <div key={slot.id} className={styles.packageCard}>
                        <h3 className={styles.packageTitle}>Buổi Tập #{slot.id}</h3>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>HLV:</span>
                          <span className={styles.metaValue}>{slot.coachName || 'Huấn luyện viên'}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Khung giờ:</span>
                          <span className={styles.metaValue}>{slot.startTime} - {slot.endTime}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Trạng thái:</span>
                          <span className={styles.statusActive}>{slot.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Đánh giá thể lực & Chỉ số BMI (BR-ASM-01) */}
            {activeTab === 'assessments' && (
              <div>
                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Lịch Đánh Giá Sắp Tới Của Tôi</h2>
                  {myAssessments.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Bạn chưa có lịch hẹn đánh giá thể lực nào sắp tới.</p>
                  ) : (
                    <div className={styles.grid}>
                      {myAssessments.map((item) => (
                        <div key={item.id} className={styles.packageCard}>
                          <h3 className={styles.packageTitle}>Đánh Giá #{item.id}</h3>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Thời gian:</span>
                            <span className={styles.metaValue}>{item.startTime}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>HLV phụ trách:</span>
                            <span className={styles.metaValue}>{item.coachName || 'Chưa phân công'}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Trạng thái:</span>
                            <span className={styles.statusActive}>{item.status}</span>
                          </div>
                          <button
                            type="button"
                            className={styles.btnDanger}
                            style={{ marginTop: '1rem', width: '100%' }}
                            onClick={() => handleCancelAssessment(item.id)}
                          >
                            Hủy Lịch Hẹn
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Khung Giờ Đánh Giá Thể Lực Còn Trống</h2>
                  {openAssessments.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Hiện không có khung giờ đánh giá nào đang mở.</p>
                  ) : (
                    <div className={styles.grid}>
                      {openAssessments.map((slot) => (
                        <div key={slot.id} className={styles.packageCard}>
                          <h3 className={styles.packageTitle}>Khung #{slot.id}</h3>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Bắt đầu:</span>
                            <span className={styles.metaValue}>{slot.startTime}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>HLV:</span>
                            <span className={styles.metaValue}>{slot.coachName || 'Sắp xếp bởi trung tâm'}</span>
                          </div>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ marginTop: '1rem', width: '100%' }}
                            onClick={() => handleBookAssessment(slot.id)}
                          >
                            Đặt Lịch Đánh Giá
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Lịch Sử Đo Thể Lực & Chỉ Số BMI (BR-ASM-02)</h2>
                  {fitnessProgress.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Chưa có bản ghi kết quả đánh giá thể lực nào.</p>
                  ) : (
                    <div className={styles.tableContainer}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Ngày đo</th>
                            <th>Cân nặng (kg)</th>
                            <th>Chiều cao (cm)</th>
                            <th>BMI</th>
                            <th>Mỡ cơ thể (%)</th>
                            <th>Nhận xét HLV</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fitnessProgress.map((p, idx) => (
                            <tr key={idx}>
                              <td>{p.assessmentDate || p.createdAt || 'N/A'}</td>
                              <td>{p.weightKg || '-'}</td>
                              <td>{p.heightCm || '-'}</td>
                              <td style={{ fontWeight: '700', color: '#38bdf8' }}>{p.bmi || '-'}</td>
                              <td>{p.bodyFatPct ? `${p.bodyFatPct}%` : '-'}</td>
                              <td>{p.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}


            {activeTab === 'vouchers' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Mã Giảm Giá & Voucher Của Tôi</h2>

                <form onSubmit={handleRedeemVoucher} className={styles.redeemBox}>
                  <input
                    type="text"
                    placeholder="Nhập mã ưu đãi (Ví dụ: CHAOMUNG, TET2026...)"
                    className={styles.input}
                    style={{ flex: 1 }}
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                  />
                  <button type="submit" className="btn-primary">
                    Áp Dụng
                  </button>
                </form>

                {myVouchers.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>Bạn chưa có voucher nào trong ví cá nhân.</p>
                ) : (
                  <div className={styles.grid}>
                    {myVouchers.map((v) => (
                      <div key={v.id} className={styles.packageCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 className={styles.packageTitle} style={{ color: '#fbbf24' }}>{v.code || 'VOUCHER'}</h3>
                          <span className={styles.statusActive}>Khả dụng</span>
                        </div>
                        <p className={styles.packageDesc}>{v.description || 'Voucher ưu đãi từ trung tâm thể thao'}</p>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Mức giảm:</span>
                          <span className={styles.metaValue}>
                            {v.discountPct ? `${v.discountPct}%` : formatVND(v.discountAmount || 0)}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Hạn sử dụng:</span>
                          <span className={styles.metaValue}>{v.validUntil || 'Không thời hạn'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'profile' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Hồ Sơ & Thể Trạng Hội Viên</h2>
                <form onSubmit={requestUpdateProfile} className={styles.profileForm}>
                  <div className={styles.grid}>
                    <div className={styles.field}>
                      <label className={styles.metaLabel}>Họ và tên</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.metaLabel}>Số điện thoại</label>
                      <input
                        type="tel"
                        className={styles.input}
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.metaLabel}>Cân nặng (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        className={styles.input}
                        placeholder="Ví dụ: 68.5"
                        value={profileData.weightKg}
                        onChange={(e) => setProfileData({ ...profileData, weightKg: e.target.value })}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.metaLabel}>Mục tiêu luyện tập</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Tăng cơ, giảm mỡ, rèn thể lực..."
                        value={profileData.fitnessGoal}
                        onChange={(e) => setProfileData({ ...profileData, fitnessGoal: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ marginTop: '1.5rem' }}>
                    Lưu Thay Đổi
                  </button>
                </form>
              </div>
            )}
          </>
        )}
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
