import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authService } from '../../services/authService'
import { memberService } from '../../services/memberService'
import { bookingService } from '../../services/bookingService'
import { packageService } from '../../services/packageService'
import { formatVND, formatDate, lastUsableDate } from '../../utils/format'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import { revealById } from '../../utils/reveal'
import SidebarLayout from '../../components/common/SidebarLayout'
import { memberItems } from '../../components/common/navItems'
import { memberSection } from '../../components/common/memberSections'
import ConfirmModal from '../../components/common/ConfirmModal'
import ClassBrowser from '../../components/member/ClassBrowser'
import SlotRequests from '../../components/member/SlotRequests'
import PaymentsTab from '../../components/member/PaymentsTab'
import MemberOverview from '../../components/member/MemberOverview'
import PackagePlans from '../../components/member/PackagePlans'
import SubscriptionCard from '../../components/member/SubscriptionCard'
import PageHead from '../../components/member/PageHead'
import MemberProfile from '../../components/member/MemberProfile'
import { MyClassList } from '../../components/member/MyBookings'
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


const UPGRADE_ERROR = {
  'Final payment amount must be greater than zero!': 'Phần còn lại của gói hiện tại đã đủ trả mức này. Hãy chọn số tháng nhiều hơn.',
  'You already have a pending order!': 'Bạn đang có một đơn chờ thanh toán. Hãy thanh toán hoặc hủy đơn đó trước.',
  'Cannot upgrade while another package is scheduled!': 'Bạn đang có gói đã trả chờ bắt đầu. Hủy gói chờ trước khi nâng cấp.',
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
  const [schedules, setSchedules] = useState({})
  const [subscriptions, setSubscriptions] = useState([])
  const [evaluated, setEvaluated] = useState({})
  const paymentHandled = useRef(false)
  const [loading, setLoading] = useState(true)

  const [selectedMonths, setSelectedMonths] = useState({})
  const [packageQuotes, setPackageQuotes] = useState({})
  const [upgradeQuotes, setUpgradeQuotes] = useState({})
  const [subHistory, setSubHistory] = useState([])
  const [savedProfile, setSavedProfile] = useState(null)




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
    // Yêu cầu 1-1 đã duyệt đang chờ thanh toán: hỏi lại trạng thái từng yêu cầu
    checks.push(bookingService.getMyCoachRequests(token)
      .then((list) => Promise.allSettled(list.filter((r) => r.status === 'APPROVED').map((r) => bookingService.checkCoachRequestPayment(token, r.id))))
      .then((rs) => rs.find((r) => r.status === 'fulfilled' && r.value?.paymentStatus === 'SUCCESS')?.value || {}))
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
      const [subList, pkgList, regList, mySlots, me, scheduleRows, evalList] = await Promise.all([
        memberService.getMySubscriptions(token),
        packageService.getActivePackages(),
        bookingService.getMyClassRegistrations(token),
        bookingService.getMyCoachSlots(token),
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
          await memberService.subscribePackage(token, packageId, months)
          toast.success('Đăng ký gói thành công! Đơn chờ thanh toán đang ở khung phía trên.')
          await loadAllData()
          revealById('my-subs')
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
          await memberService.renewSubscription(token, packageId, months)
          toast.success('Đã tạo đơn. Hãy thanh toán đơn ở khung phía trên.')
          await loadAllData()
          revealById('my-subs')
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
          await memberService.upgradeSubscription(token, packageId, months)
          toast.success('Đã tạo đơn nâng cấp. Đơn chờ thanh toán đang ở khung phía trên.')
          await loadAllData()
          revealById('my-subs')
        } catch (err) {
          toast.error(UPGRADE_ERROR[err.message] || err.message || 'Nâng cấp gói thất bại')
        }
      },
    })
  }

  // Nâng cấp bằng phần chưa dùng: gói mới có hiệu lực ngay, không trả thêm, dùng đúng số ngày quy đổi
  const handleUpgradeWithCredit = (packageId, days) => {
    const pkg = packages.find((p) => p.id === packageId)
    const credit = upgradeQuotes[packageId]?.[0]?.credit
    const end = new Date()
    end.setDate(end.getDate() + days - 1)
    setConfirmModal({
      isOpen: true,
      title: 'Nâng Cấp Bằng Phần Chưa Dùng',
      message: `Bạn lên gói "${pkg?.name || ''}" ngay hôm nay bằng phần chưa dùng của gói hiện tại${credit ? ` (${formatVND(credit)})` : ''}. Bạn không phải trả thêm và dùng gói mới ${days} ngày, đến hết ${formatDate(end.toLocaleDateString('sv-SE'))}. Gói hiện tại chuyển sang "Đã nâng cấp".`,
      confirmText: 'Xác Nhận Nâng Cấp',
      type: 'primary',
      action: async () => {
        try {
          await memberService.upgradeWithCredit(token, packageId)
          toast.success('Đã nâng cấp gói.')
          await loadAllData()
          revealById('my-subs')
        } catch (err) {
          toast.error(err.message || 'Nâng cấp gói thất bại')
        }
      },
    })
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
        {activeTab !== 'overview' && activeTab !== 'subscription' && activeTab !== 'classes' && activeTab !== 'slots' && activeTab !== 'payments' && activeTab !== 'profile' && <div className={styles.pageHeader}>
          <div>
            <div className={styles.welcomeText}>Khu Vực Hội Viên</div>
            <h1 className={styles.pageTitle}>Xin chào, {user ? user.fullName : 'Hội viên'}</h1>
            <button type="button" className="btn-primary" onClick={() => navigate('/member/training')}>
              Hành trình tập luyện của tôi →
            </button>
          </div>
        </div>}


        {!loading && !subscription && activeTab === 'subscription' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Bắt đầu từ đây</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Bạn chưa có gói hội viên. Làm theo 3 bước để bắt đầu tập:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                ['1. Chọn gói hội viên', 'Gói quyết định bạn được đăng ký lớp nào và giảm bao nhiêu.', 'subscription'],
                ['2. Đăng ký một lớp', 'Chọn lớp theo môn bạn thích, thanh toán online.', 'classes'],
                ['3. Xem thời khóa biểu', 'Biết tuần này học buổi nào, phòng nào, coach nào.', 'overview'],
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
            {activeTab === 'overview' && <MemberOverview user={user} subscriptions={subscriptions} packages={packages} classRegistrations={classRegistrations} onGo={setActiveTab} />}

            {/* TAB 1: Gói tập & Gia hạn/Nâng cấp (Flow 1) */}
            {activeTab === 'subscription' && (
              <div className={styles.subPage}>
                <PageHead title="Gói tập của tôi" lead="Gói quyết định bạn được đăng ký lớp nào và giảm bao nhiêu học phí." />
                <section id="my-subs" className={styles.subList} style={{ scrollMarginTop: '5rem' }} aria-label="Gói của bạn">
                  {subscriptions.length === 0 && <p className="text-muted">Bạn chưa có gói hội viên nào đang hoạt động. Chọn một gói bên dưới để bắt đầu.</p>}
                  {subscriptions.map((sub) => (
                    <SubscriptionCard
                      key={sub.id}
                      sub={sub}
                      packages={packages}
                      busy={busy}
                      onPay={(s) => startOnlinePayment(() => memberService.createPaymentUrl(token, s.id), 'Không tạo được link thanh toán')}
                      onCheck={(s) => checkOnlinePayment(() => memberService.checkPaymentStatus(token, s.id), 'Thanh toán gói thành công!')}
                      onCancel={(s) => requestCancelSubscription(s.id)}
                    />
                  ))}
                </section>

                <PackagePlans
                    packages={packages}
                    quotes={packageQuotes}
                    selectedMonths={selectedMonths}
                    onSelectMonths={handleSelectMonths}
                    currentPackageId={subscriptions.find((x) => x.status === 'ACTIVE')?.packageId}
                    upgradeQuotes={upgradeQuotes}
                    getCreditUpgrade={(pkg) => {
                      const days = upgradeQuotes[pkg.id]?.[0]?.creditDays
                      if (days == null || subscriptions.some((x) => x.status === 'PENDING')) return null
                      return { days, onClick: () => handleUpgradeWithCredit(pkg.id, days) }
                    }}
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

                <SubscriptionHistory history={subHistory} />
              </div>
            )}

            {/* TAB 2: Lớp học thể thao đã tham gia (Flow 2) */}
            {activeTab === 'classes' && (
              <div className={styles.subPage}>
                <PageHead title="Lớp học" lead="Chọn môn, đăng ký lớp rồi thanh toán online hoặc tiền mặt tại quầy trước hạn." />
                <section id="my-classes" className={styles.subList} style={{ scrollMarginTop: '5rem' }} aria-labelledby="my-classes-title">
                  <h2 id="my-classes-title" className={styles.sectionTitle}>Lớp của bạn</h2>
                <MyClassList
                  registrations={classRegistrations}
                  schedules={schedules}
                  statusLabel={(reg) => registrationLabel(reg, evaluated[reg.id])}
                  isGood={(reg) => reg.status === 'REGISTERED' && reg.classStatus !== 'CANCELED'}
                  isStarted={(reg) => !!reg.classStartDate && reg.classStartDate <= new Date().toLocaleDateString('sv-SE')}
                  fmtDateTime={fmtDateTime}
                  busy={busy}
                  onPay={(reg) => startOnlinePayment(() => bookingService.payClassOnline(token, reg.id), 'Không tạo được link thanh toán')}
                  onCheck={(reg) => checkOnlinePayment(() => bookingService.checkClassPayment(token, reg.id), 'Thanh toán lớp thành công!')}
                  onCancel={(reg, started) => requestCancelClass(reg.id, reg.status === 'REGISTERED' && started)}
                />
                </section>
                <ClassBrowser onChanged={loadAllData} schedules={schedules} registeredIds={classRegistrations.filter((r) => ['PENDING_PAYMENT', 'REGISTERED', 'WAITLISTED'].includes(r.status)).map((r) => r.classId)} />
              </div>
            )}

            {/* TAB 3: Buổi 1-1: xin nhiều buổi, trả một lần, dời lịch */}
            {activeTab === 'slots' && (
              <SlotRequests
                oneOnOneDiscountPct={Number(subscriptions.find((x) => x.status === 'ACTIVE')?.benefits?.one_on_one_discount_pct) || 0}
                coachSlots={coachSlots}
                busy={busy}
                onPay={(req) => startOnlinePayment(() => bookingService.payCoachRequestOnline(token, req.id), 'Không tạo được link thanh toán')}
                onCheck={(req) => checkOnlinePayment(() => bookingService.checkCoachRequestPayment(token, req.id), 'Thanh toán các buổi 1-1 thành công!')}
                onChanged={loadAllData}
              />
            )}

            {activeTab === 'payments' && <PaymentsTab />}

            {activeTab === 'profile' && (
              <MemberProfile
                user={user}
                profileData={profileData}
                setProfileData={setProfileData}
                savedProfile={savedProfile}
                onSubmit={requestUpdateProfile}
                activeSubscription={subscriptions.find((x) => x.status === 'ACTIVE')}
                packages={packages}
              />
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
