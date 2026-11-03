import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { memberService } from '../../services/memberService'
import { bookingService } from '../../services/bookingService'
import { packageService } from '../../services/packageService'
import { formatVND, formatDate, lastUsableDate, subscriptionProgress } from '../../utils/format'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import SidebarLayout from '../../components/common/SidebarLayout'
import { memberItems } from '../../components/common/navItems'
import { memberSection } from '../../components/common/memberSections'
import ConfirmModal from '../../components/common/ConfirmModal'
import ClassBrowser from '../../components/member/ClassBrowser'
import SlotBrowser from '../../components/member/SlotBrowser'
import PaymentsTab from '../../components/member/PaymentsTab'
import MemberTimetable from '../../components/member/MemberTimetable'
import PackagePlans from '../../components/member/PackagePlans'
import PendingOrderSummary from '../../components/member/PendingOrderSummary'
import VoucherWallet from '../../components/member/VoucherWallet'
import { MyClassList, MySlotList } from '../../components/member/MyBookings'
import SubscriptionHistory from '../../components/member/SubscriptionHistory'
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

const UPGRADE_ERROR = {
  'Final payment amount must be greater than zero!': 'Phần còn lại của gói hiện tại đã đủ trả mức này. Hãy chọn số tháng nhiều hơn.',
  'You already have a pending order!': 'Bạn đang có một đơn chờ thanh toán. Hãy thanh toán hoặc hủy đơn đó trước.',
  'Cannot upgrade while another package is scheduled!': 'Bạn đang có gói đã trả chờ bắt đầu. Hủy gói chờ trước khi nâng cấp.',
}

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
  const [guard, busy] = useSingleFlight()
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
  const [upgradeQuotes, setUpgradeQuotes] = useState({})
  const [subHistory, setSubHistory] = useState([])
  const [savedProfile, setSavedProfile] = useState(null)


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
    gender: '',
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
      toast.error('Bạn đã hủy thanh toán và đơn đã được hủy. Muốn mua lại, hãy tạo đơn mới.')
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
      setSubHistory(await memberService.getSubscriptionHistory(token).catch(() => []))
      setPackageQuotes(quotes)

      // Gói cao hơn gói đang dùng: lấy báo giá nâng cấp (đã trừ phần còn lại của gói hiện tại)
      const activeNow = subList.find((x) => x.status === 'ACTIVE')
      const higher = activeNow ? pkgList.filter((p) => p.tierLevel > activeNow.tierLevel) : []
      const upgrades = await Promise.all(higher.map((p) => memberService.getUpgradeQuotes(token, p.id).catch(() => null)))
      setUpgradeQuotes(Object.fromEntries(higher.map((p, i) => [p.id, upgrades[i]]).filter(([, q]) => Array.isArray(q))))

      if (me) {
        const loaded = {
          fullName: me.fullName || '',
          phone: me.phone || '',
          gender: me.gender || '',
          dateOfBirth: me.dateOfBirth || '',
          heightCm: me.memberProfile?.heightCm ?? '',
          weightKg: me.memberProfile?.weightKg ?? '',
          fitnessGoal: me.memberProfile?.fitnessGoal || '',
        }
        setProfileData(loaded)
        setSavedProfile(loaded)
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
  // lower = đổi sang gói khác (thấp hơn, hoặc cao hơn nhưng không nâng cấp ngay): cũng là đơn gia hạn, bắt đầu khi gói hiện tại hết hạn
  const handleRenewPackage = (packageId, lower = false) => {
    const months = selectedMonths[packageId] || 1
    const pkg = packages.find((p) => p.id === packageId)
    setConfirmModal({
      isOpen: true,
      title: lower ? 'Đổi Gói Khi Hết Hạn' : 'Gia Hạn Gói Hội Viên',
      message: lower
        ? `Gói "${pkg?.name || ''}" ${months} tháng sẽ bắt đầu sau khi gói hiện tại hết hạn, bạn vẫn dùng gói hiện tại đến hết ngày. Sau khi tạo đơn, hãy thanh toán ngay bên trên. Tiếp tục?`
        : `Gia hạn thêm ${months} tháng sẽ nối tiếp ngày hết hạn gói hiện tại của bạn. Sau khi tạo đơn, hãy thanh toán ngay bên trên. Bạn có muốn tiếp tục?`,
      confirmText: lower ? 'Xác Nhận Đổi Gói' : 'Xác Nhận Gia Hạn',
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
    const pkg = packages.find((p) => p.id === packageId)
    const quote = upgradeQuotes[packageId]?.find((q) => q.months === months)
    setConfirmModal({
      isOpen: true,
      title: 'Nâng Cấp Gói Hội Viên',
      message: quote
        ? `Gói "${pkg?.name || ''}" ${months} tháng có hiệu lực từ hôm nay. Bạn thanh toán ${formatVND(quote.amountDue)}, đã trừ ${formatVND(quote.credit)} từ phần còn lại của gói hiện tại. Số tiền được tính theo ngày hôm nay. Tiếp tục?`
        : 'Gói mới có hiệu lực từ hôm nay, phần còn lại của gói hiện tại được trừ vào số tiền phải trả. Tiếp tục?',
      confirmText: 'Xác Nhận Nâng Cấp',
      type: 'primary',
      action: async () => {
        try {
          await memberService.upgradeSubscription(token, packageId, months, pkgVoucher[packageId])
          toast.success('Tạo đơn nâng cấp gói thành công!')
          loadAllData()
        } catch (err) {
          toast.error(UPGRADE_ERROR[err.message] || err.message || 'Nâng cấp gói thất bại')
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
  const startOnlinePayment = (createLink, failMsg) => guard(async () => {
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
  })

  // Hỏi PayOS xem đã thanh toán chưa, rồi tải lại dữ liệu
  const checkOnlinePayment = (check, okMsg) => guard(async () => {
    try {
      const payment = await check()
      if (payment.paymentStatus === 'SUCCESS') toast.success(okMsg)
      else toast.error('Chưa ghi nhận thanh toán, vui lòng thử lại sau ít phút')
      loadAllData()
    } catch (err) {
      toast.error(err.message || 'Kiểm tra thanh toán thất bại')
    }
  })

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
            gender: profileData.gender || null,
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


        {!loading && !subscription && activeTab === 'subscription' && (
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
                          <span className={styles.metaValue}>{sub.startDate ? formatDate(sub.startDate) : 'Sau khi thanh toán'}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Dùng đến hết:</span>
                          <span className={styles.metaValue}>{sub.endDate ? lastUsableDate(sub.endDate) : 'Sau khi thanh toán'}</span>
                        </div>
                        {sub.status === 'ACTIVE' && sub.startDate && sub.endDate && (() => {
                          const { percent, daysLeft } = subscriptionProgress(sub.startDate, sub.endDate)
                          return (
                            <div>
                              <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Tiến độ gói">
                                <div className={styles.progressFill} style={{ width: `${Math.max(2, percent)}%` }} />
                              </div>
                              <div className={styles.progressMeta}><span>Đã dùng {percent}%</span><strong>Còn {daysLeft} ngày</strong></div>
                            </div>
                          )
                        })()}
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Giá thanh toán:</span>
                          <span className={styles.metaValue}>{formatVND(sub.totalAmount)}</span>
                        </div>
                      </div>
                      {sub.status === 'PENDING' && <PendingOrderSummary sub={sub} pkg={packages.find((p) => p.id === sub.packageId)} />}
                      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {sub.status === 'PENDING' && (
                          <>
                            <button type="button" className={styles.btnPrimary}
                              disabled={busy} onClick={() => startOnlinePayment(() => memberService.createPaymentUrl(token, sub.id), 'Không tạo được link thanh toán')}>
                              Thanh Toán Online
                            </button>
                            <button type="button" className={styles.btnSecondary}
                              disabled={busy} onClick={() => checkOnlinePayment(() => memberService.checkPaymentStatus(token, sub.id), 'Thanh toán gói thành công!')}>
                              Tôi Đã Thanh Toán
                            </button>
                          </>
                        )}
                        {(sub.status === 'PENDING' || sub.status === 'SCHEDULED') && (
                          <button type="button" className={styles.btnDanger} onClick={() => requestCancelSubscription(sub.id)}>
                            {sub.status === 'SCHEDULED' ? 'Hủy và hoàn tiền' : 'Hủy Đơn'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <SubscriptionHistory history={subHistory} />
                </div>

                <div className={styles.card}>
                  <PackagePlans
                    packages={packages}
                    quotes={packageQuotes}
                    selectedMonths={selectedMonths}
                    onSelectMonths={handleSelectMonths}
                    currentPackageId={subscriptions.find((x) => x.status === 'ACTIVE')?.packageId}
                    upgradeQuotes={upgradeQuotes}
                    renderVoucher={(pkg) => (
                      <VoucherSelect
                        vouchers={myVouchers}
                        appliesTo="PACKAGE"
                        value={pkgVoucher[pkg.id]}
                        onChange={(id) => setPkgVoucher({ ...pkgVoucher, [pkg.id]: id })}
                      />
                    )}
                    getSecondaryAction={(pkg) => {
                      const activeSub = subscriptions.find((x) => x.status === 'ACTIVE')
                      const free = !subscriptions.some((x) => x.status === 'PENDING' || x.status === 'SCHEDULED')
                      if (!activeSub || pkg.tierLevel <= activeSub.tierLevel || !free) return null
                      return { label: `Đổi sang gói này khi hết hạn (dùng đến hết ${lastUsableDate(activeSub.endDate)})`, onClick: () => handleRenewPackage(pkg.id, true) }
                    }}
                    getAction={(pkg) => {
                      const months = selectedMonths[pkg.id] || 1
                      const activeSub = subscriptions.find((x) => x.status === 'ACTIVE')
                      if (subscriptions.some((x) => x.status === 'PENDING')) {
                        return { label: 'Hãy thanh toán đơn đang chờ trước', disabled: true }
                      }
                      if (activeSub?.packageId === pkg.id) {
                        return { label: `Gia hạn gói (${months} tháng)`, onClick: () => handleRenewPackage(pkg.id) }
                      }
                      if (activeSub && pkg.tierLevel > activeSub.tierLevel) {
                        const hasScheduled = subscriptions.some((x) => x.status === 'SCHEDULED')
                        const quote = upgradeQuotes[pkg.id]?.find((q) => q.months === months)
                        const blocked = hasScheduled || (quote && !quote.canUpgrade)
                        return {
                          label: hasScheduled ? 'Không nâng cấp khi đã có gói chờ' : 'Nâng cấp ngay',
                          disabled: blocked,
                          onClick: () => handleUpgradePackage(pkg.id),
                        }
                      }
                      if (activeSub) {
                        return { label: 'Chuyển xuống gói này khi hết hạn', secondary: true, onClick: () => handleRenewPackage(pkg.id, true) }
                      }
                      return { label: `Đăng ký (${months} tháng)`, onClick: () => handleBuyPackage(pkg.id) }
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Lớp học thể thao đã tham gia (Flow 2) */}
            {activeTab === 'classes' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Lớp Của Bạn</h2>
                <MyClassList
                  registrations={classRegistrations}
                  schedules={schedules}
                  statusLabel={(reg) => registrationLabel(reg, evaluated[reg.id])}
                  isGood={(reg) => reg.status === 'REGISTERED' && reg.classStatus !== 'CANCELED'}
                  isStarted={(reg) => !!reg.classStartDate && reg.classStartDate <= new Date().toLocaleDateString('sv-SE')}
                  fmtDateTime={fmtDateTime}
                  busy={busy}
                  renderVoucher={(reg) => (
                    <VoucherSelect
                      vouchers={myVouchers}
                      appliesTo="CLASS"
                      kind="CLASS"
                      targetId={reg.id}
                      value={payVoucher[`reg-${reg.id}`]}
                      onChange={(id) => setPayVoucher({ ...payVoucher, [`reg-${reg.id}`]: id })}
                    />
                  )}
                  onPay={(reg) => startOnlinePayment(() => bookingService.payClassOnline(token, reg.id, payVoucher[`reg-${reg.id}`]), 'Không tạo được link thanh toán')}
                  onCheck={(reg) => checkOnlinePayment(() => bookingService.checkClassPayment(token, reg.id), 'Thanh toán lớp thành công!')}
                  onCancel={(reg, started) => requestCancelClass(reg.id, reg.status === 'REGISTERED' && started)}
                />
              </div>
            )}

            {activeTab === 'classes' && <ClassBrowser onChanged={loadAllData} schedules={schedules} registeredIds={classRegistrations.filter((r) => ['PENDING_PAYMENT', 'REGISTERED', 'WAITLISTED'].includes(r.status)).map((r) => r.classId)} />}

            {/* TAB 3: Lịch hẹn 1-1 (Flow 2) */}
            {activeTab === 'slots' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Buổi 1-1 Đã Đặt</h2>
                <MySlotList
                  slots={coachSlots}
                  busy={busy}
                  renderVoucher={(slot) => (
                    <VoucherSelect
                      vouchers={myVouchers}
                      appliesTo="ONE_ON_ONE"
                      kind="ONE_ON_ONE"
                      targetId={slot.id}
                      value={payVoucher[`slot-${slot.id}`]}
                      onChange={(id) => setPayVoucher({ ...payVoucher, [`slot-${slot.id}`]: id })}
                    />
                  )}
                  onPay={(slot) => startOnlinePayment(() => bookingService.payCoachSlotOnline(token, slot.id, payVoucher[`slot-${slot.id}`]), 'Không tạo được link thanh toán')}
                  onCheck={(slot) => checkOnlinePayment(() => bookingService.checkCoachSlotPayment(token, slot.id), 'Thanh toán buổi 1-1 thành công!')}
                  onCancel={(slot) => requestCancelSlot(slot.id)}
                />
              </div>
            )}

            {activeTab === 'slots' && <SlotBrowser onChanged={loadAllData} />}

            {activeTab === 'payments' && <PaymentsTab />}

            {activeTab === 'timetable' && <MemberTimetable />}

            {activeTab === 'vouchers' && (
              <div className={styles.card}>
                <VoucherWallet
                  vouchers={myVouchers}
                  code={voucherCodeInput}
                  onCodeChange={setVoucherCodeInput}
                  onRedeem={handleRedeemVoucher}
                  sourceLabels={VOUCHER_SOURCE}
                  targetLabels={VOUCHER_TARGET}
                />
              </div>
            )}
            {activeTab === 'profile' && (
              <div className={styles.card}>
                <div className={styles.profileHead}>
                  <span className={styles.avatar} aria-hidden="true">{(profileData.fullName || user?.fullName || '?').trim().charAt(0).toUpperCase()}</span>
                  <div>
                    <h2 className={styles.cardTitle} style={{ margin: 0 }}>{profileData.fullName || 'Hồ sơ cá nhân'}</h2>
                    <p className="text-muted" style={{ margin: 0 }}>{user?.email}</p>
                  </div>
                </div>
                <p className={styles.profileGroup}>Thông tin cá nhân</p>
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
                        <option value="">Chưa chọn</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.metaLabel}>Ngày sinh</label>
                      <input
                        type="date"
                        min="1900-01-01"
                        max={new Date().toISOString().slice(0, 10)}
                        className={styles.input}
                        value={profileData.dateOfBirth}
                        onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                      />
                    </div>

                  </div>
                  <p className={styles.profileGroup}>Thể trạng và mục tiêu</p>
                  <div className={styles.grid}>
                    <div className={styles.field}>
                      <label className={styles.metaLabel}>Chiều cao (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="300"
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
                        min="1"
                        max="500"
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

                  <div className={styles.saveBar}>
                    {savedProfile && JSON.stringify(profileData) !== JSON.stringify(savedProfile) && <span>Bạn có thay đổi chưa lưu</span>}
                    {savedProfile && JSON.stringify(profileData) !== JSON.stringify(savedProfile) && <button type="button" className={styles.btnSecondary} onClick={() => setProfileData(savedProfile)}>Hủy</button>}
                    <button type="submit" className="btn-primary" disabled={!(savedProfile && JSON.stringify(profileData) !== JSON.stringify(savedProfile))}>Lưu Thay Đổi</button>
                  </div>
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
          if (action) guard(action)
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
    </SidebarLayout>
  )
}
