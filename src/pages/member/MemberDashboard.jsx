import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { memberService } from '../../services/memberService'
import { bookingService } from '../../services/bookingService'
import { packageService } from '../../services/packageService'
import { formatVND } from '../../utils/format'
import SidebarLayout from '../../components/common/SidebarLayout'
import { memberItems } from '../../components/common/navItems'
import { memberSection } from '../../components/common/memberSections'
import ConfirmModal from '../../components/common/ConfirmModal'
import ClassBrowser from '../../components/member/ClassBrowser'
import SlotBrowser from '../../components/member/SlotBrowser'
import PaymentsTab from '../../components/member/PaymentsTab'
import MemberTimetable from '../../components/member/MemberTimetable'
import WeeklySchedule from '../../components/common/WeeklySchedule'
import { scheduleService } from '../../services/scheduleService'
import { groupByClass } from '../../utils/schedule'
import styles from '../../css/member/MemberDashboard.module.css'


const REG_STATUS = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  REGISTERED: 'Đã đăng ký',
  WAITLISTED: 'Hàng chờ',
  CANCELED: 'Đã hủy',
  LEFT: 'Đã rời lớp',
}

const VOUCHER_SOURCE = {
  BIRTHDAY: 'Quà sinh nhật',
  WELCOME: 'Chào mừng',
  COMPLETION: 'Hoàn thành lớp',
  COMPENSATION: 'Bù lỗi trung tâm',
  CAMPAIGN: 'Mã khuyến mãi',
  EARLY_RENEWAL: 'Gia hạn sớm',
  WINBACK: 'Quay lại',
}

const VOUCHER_TARGET = { CLASS: 'học phí lớp', ONE_ON_ONE: 'buổi 1-1', PACKAGE: 'gói hội viên' }

// Nhãn trạng thái đăng ký kèm tiến trình của lớp (lớp sắp khai giảng, đang học, đã kết thúc, bị hủy)
function registrationLabel(reg, graded) {
  if (reg.status === 'REGISTERED') {
    if (reg.classStatus === 'COMPLETED') return graded ? 'Đã kết thúc · đã có xếp loại' : 'Đã kết thúc · chờ coach xếp loại'
    if (reg.classStatus === 'IN_PROGRESS') return 'Đang học'
    if (reg.classStatus === 'CANCELED') return 'Lớp đã bị hủy'
    return 'Đã đăng ký · chờ khai giảng'
  }
  return REG_STATUS[reg.status] || reg.status
}

const SUB_STATUS = { ACTIVE: 'Đang sử dụng', PENDING: 'Chờ thanh toán', SCHEDULED: 'Sẽ bắt đầu sau khi gói hiện tại hết hạn' }
const SUB_TYPE = { NEW: 'Đăng ký mới', RENEWAL: 'Gia hạn / chuyển gói', UPGRADE: 'Nâng cấp' }

const SLOT_STATUS = { HELD: 'Giữ chỗ, chờ thanh toán', BOOKED: 'Đã đặt', CANCELED: 'Đã hủy' }

// Ô chọn voucher dùng cho gói, lớp hoặc buổi 1-1 (chỉ hiện voucher đúng loại và còn dùng được)
function VoucherSelect({ vouchers, appliesTo, value, onChange, kind, targetId }) {
  const { token } = useAuth()
  const [preview, setPreview] = useState(null)

  // Xem trước giá sau ưu đãi khi chọn voucher cho lớp hoặc buổi 1-1
  useEffect(() => {
    setPreview(null)
    if (!kind || !value) return
    memberService.previewPricing(token, { kind, targetId, voucherId: value }).then(setPreview).catch(() => setPreview(null))
  }, [token, kind, targetId, value])

  const usable = vouchers.filter((v) => v.appliesTo === appliesTo && v.usable)
  if (usable.length === 0) {
    return (
      <p className="text-hint">
        Chưa có voucher dùng được cho mục này. Nhập mã ở tab "Voucher Ưu Đãi" để nhận thêm.
      </p>
    )
  }
  const label = (v) => {
    const off = v.kind === 'PERCENT' ? `giảm ${Number(v.value)}%` : v.kind === 'AMOUNT' ? `giảm ${formatVND(v.value)}` : 'miễn phí 1 buổi 1-1'
    return `${VOUCHER_SOURCE[v.source] || 'Voucher'}: ${off} (hạn ${new Date(v.expiresAt).toLocaleDateString('vi-VN')})`
  }
  return (
    <>
      <select className={styles.input} value={value || ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">Không dùng voucher</option>
        {usable.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
      </select>
      {preview && (
        <p style={{ fontSize: '0.9rem' }}>
          Giá gốc {formatVND(preview.listPrice)}, giảm {formatVND(preview.discountAmount)}: <strong>còn {formatVND(preview.total)}</strong>
        </p>
      )}
    </>
  )
}

export default function MemberDashboard() {
  const { user, token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [params, setParams] = useSearchParams()
  const activeTab = memberSection(params.get('tab') || location.state?.tab)
  const setActiveTab = tab => setParams({ tab }, { state: null })
  const role = user?.roleCode || (typeof user?.role === 'string' ? user.role : user?.role?.code)
  const [subscription, setSubscription] = useState(null)
  const [packages, setPackages] = useState([])
  const [classRegistrations, setClassRegistrations] = useState([])
  const [coachSlots, setCoachSlots] = useState([])
  const [myVouchers, setMyVouchers] = useState([])
  const [schedules, setSchedules] = useState({})
  const [subscriptions, setSubscriptions] = useState([])
  const [evaluated, setEvaluated] = useState({})
  const [pkgVoucher, setPkgVoucher] = useState({})
  const [payVoucher, setPayVoucher] = useState({})
  const paymentHandled = useRef(false)
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
    dateOfBirth: '',
    heightCm: '',
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

  // PayOS chuyển người dùng về /member?payment=return|cancel: báo kết quả và hỏi lại trạng thái các đơn đang chờ
  useEffect(() => {
    if (loading || paymentHandled.current) return
    const result = new URLSearchParams(window.location.search).get('payment')
    if (!result) return
    paymentHandled.current = true
    navigate('/member', { replace: true })

    if (result === 'cancel') {
      toast.error('Bạn đã hủy thanh toán. Đơn vẫn được giữ trong thời gian chờ, bạn có thể thanh toán lại.')
      return
    }
    const checks = []
    subscriptions.filter((x) => x.status === 'PENDING').forEach((x) => checks.push(memberService.checkPaymentStatus(token, x.id)))
    classRegistrations.filter((r) => r.status === 'PENDING_PAYMENT').forEach((r) => checks.push(bookingService.checkClassPayment(token, r.id)))
    coachSlots.filter((s) => s.status === 'HELD').forEach((s) => checks.push(bookingService.checkCoachSlotPayment(token, s.id)))
    Promise.allSettled(checks).then((rs) => {
      const paid = rs.some((r) => r.status === 'fulfilled' && r.value?.paymentStatus === 'SUCCESS')
      if (paid) toast.success('Thanh toán thành công!')
      else toast.error('Chưa ghi nhận thanh toán. Nếu bạn đã chuyển tiền, vui lòng đợi ít phút rồi bấm "Tôi đã thanh toán".')
      loadAllData()
    })
  }, [loading])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [subList, pkgList, regList, mySlots, vchList, me, scheduleRows, evalList] = await Promise.all([
        memberService.getMySubscriptions(token),
        packageService.getActivePackages(),
        bookingService.getMyClassRegistrations(token),
        bookingService.getMyCoachSlots(token),
        memberService.getMyVouchers(token),
        authService.getMe(token),
        scheduleService.getAll(token).catch(() => []),
        bookingService.getMyClassEvaluations(token).catch(() => []),
      ])

      setSubscriptions(subList)
      setSubscription(subList.find((x) => x.status === 'ACTIVE') || subList[0] || null)
      setEvaluated(Object.fromEntries(evalList.map((e) => [e.registrationId, true])))
      setPackages([...pkgList].sort((a, b) => a.tierLevel - b.tierLevel))
      setClassRegistrations(regList)
      setCoachSlots(mySlots)
      setMyVouchers(vchList)
      setSchedules(groupByClass(scheduleRows))


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
          dateOfBirth: me.dateOfBirth || '',
          heightCm: me.memberProfile?.heightCm ?? '',
          weightKg: me.memberProfile?.weightKg ?? '',
          fitnessGoal: me.memberProfile?.fitnessGoal || '',
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
          await memberService.subscribePackage(token, packageId, months, pkgVoucher[packageId])
          toast.success('Đăng ký gói thành công! Hãy tiến hành thanh toán.')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Lỗi khi đăng ký gói')
        }
      },
    })
  }

  // Gia hạn gói hội viên (BR-PKG-09)
  // lower = chuyển sang gói cấp thấp hơn: cũng là đơn gia hạn, bắt đầu khi gói hiện tại hết hạn
  const handleRenewPackage = (packageId, lower = false) => {
    const months = selectedMonths[packageId] || 1
    const pkg = packages.find((p) => p.id === packageId)
    setConfirmModal({
      isOpen: true,
      title: lower ? 'Chuyển Xuống Gói Thấp Hơn' : 'Gia Hạn Gói Hội Viên',
      message: lower
        ? `Gói "${pkg?.name || ''}" ${months} tháng sẽ bắt đầu sau khi gói hiện tại hết hạn, bạn vẫn dùng gói hiện tại đến hết ngày. Sau khi tạo đơn, hãy thanh toán ngay bên trên. Tiếp tục?`
        : `Gia hạn thêm ${months} tháng sẽ nối tiếp ngày hết hạn gói hiện tại của bạn. Sau khi tạo đơn, hãy thanh toán ngay bên trên. Bạn có muốn tiếp tục?`,
      confirmText: lower ? 'Xác Nhận Chuyển Gói' : 'Xác Nhận Gia Hạn',
      type: 'primary',
      action: async () => {
        try {
          await memberService.renewSubscription(token, packageId, months, pkgVoucher[packageId])
          toast.success('Đã tạo đơn. Hãy thanh toán đơn ở khung phía trên.')
          window.scrollTo({ top: 0, behavior: 'smooth' })
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
          await memberService.upgradeSubscription(token, packageId, months, pkgVoucher[packageId])
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
  // started = lớp đã khai giảng: hủy lúc này là rời lớp, không hoàn tiền (trừ vài buổi đầu nếu gói có quyền lợi)
  const requestCancelClass = (regId, started = false) => {
    setConfirmModal({
      isOpen: true,
      title: started ? 'Rời Lớp Đang Học' : 'Hủy Đăng Ký Lớp',
      message: started
        ? 'Lớp đã khai giảng nên rời lớp sẽ không được hoàn tiền, trừ khi gói của bạn cho hoàn nếu rời trong những buổi đầu. Bạn chắc chắn muốn rời lớp?'
        : 'Hủy trước ngày khai giảng sẽ được hoàn lại 100% học phí.',
      confirmText: started ? 'Rời Lớp' : 'Hủy Đăng Ký',
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

  // Thanh toán online qua PayOS: lấy link rồi chuyển sang trang thanh toán
  const startOnlinePayment = async (createLink, failMsg) => {
    try {
      const link = await createLink()
      if (link.checkoutUrl) {
        window.location.href = link.checkoutUrl
      } else {
        toast.error(failMsg)
      }
    } catch (err) {
      toast.error(err.message || failMsg)
    }
  }

  // Hỏi PayOS xem đã thanh toán chưa, rồi tải lại dữ liệu
  const checkOnlinePayment = async (check, okMsg) => {
    try {
      const payment = await check()
      if (payment.paymentStatus === 'SUCCESS') toast.success(okMsg)
      else toast.error('Chưa ghi nhận thanh toán, vui lòng thử lại sau ít phút')
      loadAllData()
    } catch (err) {
      toast.error(err.message || 'Kiểm tra thanh toán thất bại')
    }
  }

  // Hủy buổi 1-1 đã đặt
  const requestCancelSlot = (slotId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hủy Buổi 1-1',
      message: 'Hủy trước giờ học theo quy định sẽ được hoàn tiền. Bạn chắc chắn muốn hủy?',
      confirmText: 'Hủy Buổi',
      type: 'danger',
      action: async () => {
        try {
          await bookingService.cancelCoachSlot(token, slotId)
          toast.success('Đã hủy buổi 1-1')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Hủy buổi thất bại')
        }
      },
    })
  }

  const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '')

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
            dateOfBirth: profileData.dateOfBirth || null,
          })
          await authService.updateMemberProfile(token, {
            heightCm: profileData.heightCm !== '' ? parseFloat(profileData.heightCm) : null,
            weightKg: profileData.weightKg !== '' ? parseFloat(profileData.weightKg) : null,
            fitnessGoal: profileData.fitnessGoal,
          })
          toast.success('Cập nhật hồ sơ thành công!')
          loadAllData()
        } catch (err) {
          toast.error(err.message || 'Cập nhật hồ sơ thất bại')
        }
      },
    })
  }

  return (
    <SidebarLayout workspace="MEMBER WORKSPACE" caption="HỘI VIÊN" rootLabel="Không gian Hội viên" roleLabel="Hội viên" items={memberItems(false)} activeId={activeTab} onSelect={setActiveTab} profileTo="/member?tab=profile">
    <div className={styles.container}>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.welcomeText}>Khu Vực Hội Viên</div>
            <h1 className={styles.pageTitle}>Xin chào, {user ? user.fullName : 'Hội viên'}</h1>
            <button type="button" className="btn-primary" onClick={() => navigate('/member/training')}>
              Hành trình tập luyện của tôi →
            </button>
          </div>
        </div>


        {!loading && !subscription && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Bắt đầu từ đây</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Bạn chưa có gói hội viên. Làm theo 3 bước để bắt đầu tập:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                ['1. Chọn gói hội viên', 'Gói quyết định bạn được đăng ký lớp nào và giảm bao nhiêu.', 'subscription'],
                ['2. Đăng ký một lớp', 'Chọn lớp theo môn bạn thích, thanh toán online.', 'classes'],
                ['3. Xem thời khóa biểu', 'Biết tuần này học buổi nào, phòng nào, coach nào.', 'timetable'],
              ].map(([title, desc, tab]) => (
                <button key={tab} type="button" className={styles.card} style={{ textAlign: 'left', color: 'inherit', cursor: 'pointer', margin: 0 }} onClick={() => setActiveTab(tab)}>
                  <strong>{title}</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-muted">Đang tải dữ liệu hội viên...</p>
        ) : (
          <>
            {/* TAB 1: Gói tập & Gia hạn/Nâng cấp (Flow 1) */}
            {activeTab === 'subscription' && (
              <div>
                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Gói Hội Viên Đang Sử Dụng</h2>
                  {subscriptions.length === 0 && <p className="text-muted">Bạn chưa có gói hội viên nào đang hoạt động.</p>}
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className={styles.subCard}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: '700' }}>{sub.packageName || 'Gói Tập'}</h3>
                          <span className={sub.status === 'ACTIVE' ? styles.statusActive : styles.statusPending}>{SUB_STATUS[sub.status] || sub.status}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Loại đơn:</span>
                          <span className={styles.metaValue}>{SUB_TYPE[sub.purchaseType] || sub.purchaseType}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Ngày bắt đầu:</span>
                          <span className={styles.metaValue}>{sub.startDate || 'Sau khi thanh toán'}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Ngày hết hạn:</span>
                          <span className={styles.metaValue}>{sub.endDate || 'Sau khi thanh toán'}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Giá thanh toán:</span>
                          <span className={styles.metaValue}>{formatVND(sub.totalAmount)}</span>
                        </div>
                      </div>
                      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {sub.status === 'PENDING' && (
                          <>
                            <button type="button" className={styles.btnPrimary}
                              onClick={() => startOnlinePayment(() => memberService.createPaymentUrl(token, sub.id), 'Không tạo được link thanh toán')}>
                              Thanh Toán Online
                            </button>
                            <button type="button" className={styles.btnSecondary}
                              onClick={() => checkOnlinePayment(() => memberService.checkPaymentStatus(token, sub.id), 'Thanh toán gói thành công!')}>
                              Tôi Đã Thanh Toán
                            </button>
                          </>
                        )}
                        <button type="button" className={styles.btnDanger} onClick={() => requestCancelSubscription(sub.id)}>
                          {sub.status === 'SCHEDULED' ? 'Hủy Gói (hoàn tiền)' : 'Hủy Gói'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Danh Sách Gói Hội Viên & Lựa Chọn Số Tháng</h2>
                  <div className={styles.grid}>
                    {packages.map((pkg) => {
                      const curMonths = selectedMonths[pkg.id] || 1
                      const quote = packageQuotes[pkg.id]
                      const activeSub = subscriptions.find((x) => x.status === 'ACTIVE')
                      const hasPending = subscriptions.some((x) => x.status === 'PENDING')
                      const hasScheduled = subscriptions.some((x) => x.status === 'SCHEDULED')
                      const isCurrentActive = activeSub?.packageId === pkg.id
                      const isHigher = activeSub && pkg.tierLevel > activeSub.tierLevel

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

                          <div style={{ marginTop: '0.75rem' }}>
                            <VoucherSelect
                              vouchers={myVouchers}
                              appliesTo="PACKAGE"
                              value={pkgVoucher[pkg.id]}
                              onChange={(id) => setPkgVoucher({ ...pkgVoucher, [pkg.id]: id })}
                            />
                          </div>

                          {/* Nút hành động Mua mới / Gia hạn / Nâng cấp theo nghiệp vụ BR-PKG-09, BR-PKG-10 */}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexDirection: 'column' }}>
                            {hasPending ? (
                              <button type="button" className="btn-primary" disabled>Hãy thanh toán đơn đang chờ trước</button>
                            ) : isCurrentActive ? (
                              <button type="button" className="btn-primary" onClick={() => handleRenewPackage(pkg.id)}>
                                Gia Hạn Gói ({curMonths} tháng)
                              </button>
                            ) : activeSub && isHigher ? (
                              <button type="button" className="btn-primary" style={{ background: 'var(--info)' }} disabled={hasScheduled}
                                onClick={() => handleUpgradePackage(pkg.id)}>
                                {hasScheduled ? 'Không nâng cấp khi đã có gói chờ' : 'Nâng Cấp Sang Gói Này'}
                              </button>
                            ) : activeSub ? (
                              <button type="button" className="btn-secondary" onClick={() => handleRenewPackage(pkg.id, true)}>
                                Chuyển Xuống Gói Này Khi Hết Hạn
                              </button>
                            ) : (
                              <button type="button" className="btn-primary" onClick={() => handleBuyPackage(pkg.id)}>
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
                <h2 className={styles.cardTitle}>Lớp Của Bạn</h2>
                {classRegistrations.length === 0 ? (
                  <p className="text-muted">Bạn chưa đăng ký lớp học nào.</p>
                ) : (
                  <div className={styles.grid}>
                    {classRegistrations.map((reg) => {
                      const started = !!reg.classStartDate && reg.classStartDate <= new Date().toLocaleDateString('sv-SE')
                      return (
                      <div key={reg.id} className={styles.packageCard}>
                        <h3 className={styles.packageTitle}>{reg.className || 'Lớp học'}</h3>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Trạng thái:</span>
                          <span className={reg.status === 'REGISTERED' && reg.classStatus !== 'CANCELED' ? styles.statusActive : styles.statusPending}>
                            {registrationLabel(reg, evaluated[reg.id])}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Học phí:</span>
                          <span className={styles.metaValue}>{formatVND(reg.tuition || 0)}</span>
                        </div>
                        {(reg.status === 'REGISTERED' || reg.status === 'PENDING_PAYMENT') && <WeeklySchedule rows={schedules[reg.classId]} />}
                        {reg.status === 'PENDING_PAYMENT' && reg.holdExpiresAt && (
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Giữ chỗ đến:</span>
                            <span className={styles.metaValue}>{fmtDateTime(reg.holdExpiresAt)}</span>
                          </div>
                        )}
                        {reg.status === 'WAITLISTED' && reg.waitlistPosition && (
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Vị trí hàng chờ:</span>
                            <span className={styles.metaValue}>{reg.waitlistPosition}</span>
                          </div>
                        )}

                        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                          {reg.status === 'PENDING_PAYMENT' && (
                            <>
                              <VoucherSelect
                                vouchers={myVouchers}
                                appliesTo="CLASS"
                                kind="CLASS"
                                targetId={reg.id}
                                value={payVoucher[`reg-${reg.id}`]}
                                onChange={(id) => setPayVoucher({ ...payVoucher, [`reg-${reg.id}`]: id })}
                              />
                              <button
                                type="button"
                                className={styles.btnPrimary}
                                onClick={() => startOnlinePayment(() => bookingService.payClassOnline(token, reg.id, payVoucher[`reg-${reg.id}`]), 'Không tạo được link thanh toán')}
                              >
                                Thanh Toán Online
                              </button>
                              <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={() => checkOnlinePayment(() => bookingService.checkClassPayment(token, reg.id), 'Thanh toán lớp thành công!')}
                              >
                                Tôi Đã Thanh Toán
                              </button>
                            </>
                          )}
                          {(reg.status === 'PENDING_PAYMENT' || reg.status === 'WAITLISTED') && (
                            <button type="button" className={styles.btnDanger} onClick={() => requestCancelClass(reg.id)}>
                              Hủy Đăng Ký
                            </button>
                          )}
                          {reg.status === 'REGISTERED' && reg.classStatus !== 'COMPLETED' && reg.classStatus !== 'CANCELED' && (
                            <button type="button" className={styles.btnDanger} onClick={() => requestCancelClass(reg.id, started)}>
                              {started ? 'Rời Lớp (không hoàn tiền)' : 'Hủy Đăng Ký (hoàn 100% học phí)'}
                            </button>
                          )}
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'classes' && <ClassBrowser onChanged={loadAllData} />}

            {/* TAB 3: Lịch hẹn 1-1 (Flow 2) */}
            {activeTab === 'slots' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Buổi 1-1 Đã Đặt</h2>
                {coachSlots.length === 0 ? (
                  <p className="text-muted">Bạn chưa có buổi tập 1-1 nào đã đặt trước.</p>
                ) : (
                  <div className={styles.grid}>
                    {coachSlots.map((slot) => (
                      <div key={slot.id} className={styles.packageCard}>
                        <h3 className={styles.packageTitle}>Buổi 1-1 với {slot.coachName || 'huấn luyện viên'}</h3>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>HLV:</span>
                          <span className={styles.metaValue}>{slot.coachName || 'Huấn luyện viên'}</span>
                        </div>
                        {(slot.sportName || slot.roomName) && (
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Môn và phòng:</span>
                            <span className={styles.metaValue}>{[slot.sportName, slot.roomName && `${slot.roomName}${slot.floor ? ` · ${slot.floor}` : ''}`].filter(Boolean).join(' · ')}</span>
                          </div>
                        )}
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Khung giờ:</span>
                          <span className={styles.metaValue}>{fmtDateTime(slot.startAt)} - {fmtDateTime(slot.endAt)}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Giá:</span>
                          <span className={styles.metaValue}>{formatVND(slot.price || 0)}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Trạng thái:</span>
                          <span className={slot.status === 'BOOKED' ? styles.statusActive : styles.statusPending}>{SLOT_STATUS[slot.status] || slot.status}</span>
                        </div>
                        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                          {slot.status === 'HELD' && (
                            <>
                              <VoucherSelect
                                vouchers={myVouchers}
                                appliesTo="ONE_ON_ONE"
                                kind="ONE_ON_ONE"
                                targetId={slot.id}
                                value={payVoucher[`slot-${slot.id}`]}
                                onChange={(id) => setPayVoucher({ ...payVoucher, [`slot-${slot.id}`]: id })}
                              />
                              <button
                                type="button"
                                className={styles.btnPrimary}
                                onClick={() => startOnlinePayment(() => bookingService.payCoachSlotOnline(token, slot.id, payVoucher[`slot-${slot.id}`]), 'Không tạo được link thanh toán')}
                              >
                                Thanh Toán Online
                              </button>
                              <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={() => checkOnlinePayment(() => bookingService.checkCoachSlotPayment(token, slot.id), 'Thanh toán buổi 1-1 thành công!')}
                              >
                                Tôi Đã Thanh Toán
                              </button>
                            </>
                          )}
                          {(slot.status === 'HELD' || slot.status === 'BOOKED') && (
                            <button type="button" className={styles.btnDanger} onClick={() => requestCancelSlot(slot.id)}>
                              Hủy Buổi
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'slots' && <SlotBrowser onChanged={loadAllData} />}

            {activeTab === 'payments' && <PaymentsTab />}

            {activeTab === 'timetable' && <MemberTimetable />}

            {activeTab === 'vouchers' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Mã Giảm Giá & Voucher Của Tôi</h2>

                <form onSubmit={handleRedeemVoucher} className={styles.redeemBox}>
                  <input
                    type="text"
                    placeholder="Nhập mã ưu đãi (ví dụ: KHAIGIANG10)"
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
                  <p className="text-muted">Bạn chưa có voucher nào trong ví cá nhân.</p>
                ) : (
                  <div className={styles.grid}>
                    {myVouchers.map((v) => (
                      <div key={v.id} className={styles.packageCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 className={styles.packageTitle} style={{ color: 'var(--warning)' }}>{VOUCHER_SOURCE[v.source] || 'Voucher'}</h3>
                          <span className={v.usable ? styles.statusActive : styles.statusPending}>{v.usable ? 'Khả dụng' : 'Chưa dùng được'}</span>
                        </div>
                        <p className={styles.packageDesc}>Áp dụng cho: {VOUCHER_TARGET[v.appliesTo] || v.appliesTo}</p>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Mức giảm:</span>
                          <span className={styles.metaValue}>
                            {v.kind === 'PERCENT' && `${Number(v.value)}%`}
                            {v.kind === 'AMOUNT' && formatVND(v.value)}
                            {v.kind === 'FREE_ONE_ON_ONE' && 'Miễn phí 1 buổi 1-1'}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Hạn sử dụng:</span>
                          <span className={styles.metaValue}>{v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('vi-VN') : 'Không thời hạn'}</span>
                        </div>
                        {!v.usable && v.unusableReason && (
                          <p className="text-hint">{v.unusableReason}</p>
                        )}
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
                      <label className={styles.metaLabel}>Giới tính</label>
                      <select
                        className={styles.input}
                        value={profileData.gender}
                        onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                      >
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.metaLabel}>Ngày sinh</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={profileData.dateOfBirth}
                        onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.metaLabel}>Chiều cao (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        className={styles.input}
                        value={profileData.heightCm}
                        onChange={(e) => setProfileData({ ...profileData, heightCm: e.target.value })}
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
