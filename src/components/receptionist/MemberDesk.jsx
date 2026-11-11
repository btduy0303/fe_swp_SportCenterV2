import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { receptionistService } from '../../services/receptionistService'
import { classService } from '../../services/classService'
import { formatVND, formatDate, isSubscriptionPaymentExpired, lastUsableDate } from '../../utils/format'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import InvoiceSheet from '../common/InvoiceSheet'
import CounterQr from './CounterQr'
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../../utils/labels'
import styles from '../../css/receptionist/Reception.module.css'

const SUB_STATUS = { ACTIVE: 'Đang sử dụng', PENDING: 'Chờ thu tiền', SCHEDULED: 'Đã trả, chờ bắt đầu', EXPIRED: 'Đã hết hạn', UPGRADED: 'Đã nâng cấp', CANCELED: 'Đã hủy' }
const REG_STATUS = { PENDING_PAYMENT: 'Chờ thu tiền', REGISTERED: 'Đã đăng ký', WAITLISTED: 'Hàng chờ', CANCELED: 'Đã hủy', LEFT: 'Đã rời lớp' }
const REQ_STATUS = { PENDING: 'Chờ manager duyệt', APPROVED: 'Chờ thu tiền', PAID: 'Đã thanh toán', REJECTED: 'Bị từ chối', CANCELED: 'Đã hủy', EXPIRED: 'Hết hạn' }
const good = (s) => ['ACTIVE', 'REGISTERED', 'PAID', 'SCHEDULED'].includes(s)
const initial = (name = '') => name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() || '?'

// Hộp xác thực email tại quầy: hội viên đọc mã 6 số trong hộp thư, lễ tân nhập vào đây
function VerifyBox({ member, onVerified }) {
  const { token } = useAuth()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return undefined
    const t = setTimeout(() => setWait((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await receptionistService.verifyMemberEmail(token, member.id, code.trim())
      toast.success('Đã xác thực email, hội viên có thể đăng ký gói và lớp')
      onVerified()
    } catch (err) {
      toast.error(err.message || 'Mã xác thực sai hoặc đã hết hạn')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    try {
      await receptionistService.resendMemberCode(token, member.id)
      toast.success(`Đã gửi lại mã tới ${member.email}`)
      setWait(60)
    } catch (err) {
      toast.error(err.message || 'Gửi lại mã thất bại')
    }
  }

  return (
    <form className={styles.verify} onSubmit={verify}>
      <p><b>Hội viên chưa xác thực email.</b> Mã 6 số đã gửi tới <b>{member.email}</b>. Nhờ hội viên đọc mã trong hộp thư rồi nhập vào đây.</p>
      <div className={styles.codeRow}>
        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required aria-label="Mã xác thực 6 số" placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        <button type="submit" className={styles.btn} disabled={busy || code.length !== 6}>Xác nhận mã</button>
        <button type="button" className={styles.btnOutline} disabled={wait > 0} onClick={resend}>{wait > 0 ? `Gửi lại sau ${wait}s` : 'Gửi lại mã'}</button>
      </div>
    </form>
  )
}

// Xử lý tại quầy cho một hội viên: khung "chờ thu tiền" ở trên cùng, bên dưới chia tab gói, lớp, buổi 1-1, thanh toán
export default function MemberDesk({ member, packages, onChanged, onBack }) {
  const { token } = useAuth()
  const toast = useToast()
  const memberId = member.id
  const verified = member.emailVerified !== false
  const pkgSelect = useRef(null)
  const [guard, busy] = useSingleFlight()
  const [tab, setTab] = useState('subs')
  const [subs, setSubs] = useState([])
  const [regs, setRegs] = useState([])
  const [requests, setRequests] = useState([])
  const [payments, setPayments] = useState([])
  const [openClasses, setOpenClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [pkgId, setPkgId] = useState('')
  const [months, setMonths] = useState(1)
  const [invoice, setInvoice] = useState(null)

  const load = useCallback(async () => {
    try {
      const [s, r, p, c, o] = await Promise.all([
        receptionistService.getMemberSubscriptions(token, memberId),
        receptionistService.getMemberClassRegistrations(token, memberId),
        receptionistService.getMemberPayments(token, memberId),
        classService.getOpenClasses(),
        receptionistService.getMemberCoachRequests(token, memberId),
      ])
      setSubs(s)
      setRegs(r)
      setPayments(p)
      setOpenClasses(c)
      setRequests(o)
    } catch (err) {
      toast.error(err.message || 'Không thể tải thông tin hội viên')
    }
  }, [token, memberId, toast])

  useEffect(() => {
    load()
  }, [load])

  // Chạy một thao tác rồi báo kết quả và tải lại
  const [qr, setQr] = useState(null) // khoản đang hiện mã QR
  const run = (action, okMsg, failMsg) => guard(async () => {
    try {
      await action()
      toast.success(okMsg)
      load()
    } catch (err) {
      toast.error(err.message || failMsg)
    }
  })

  const showInvoice = async (paymentId) => {
    try {
      setInvoice(await receptionistService.getInvoice(token, paymentId))
    } catch (err) {
      toast.error(err.message || 'Không thể tải hóa đơn')
    }
  }

  // Chưa chọn gói thì báo rõ và đưa con trỏ vào ô chọn gói, thay vì để nút mờ không nói gì
  const needPackage = () => {
    if (pkgId) return true
    toast.error('Hãy chọn gói trước')
    pkgSelect.current?.focus()
    return false
  }

  // Hủy khoản đã thu tiền thì tiền không tự trả lại: BE tạo một khoản chờ hoàn ở mục Hoàn tiền, nên báo rõ để lễ tân biết còn phải trả cho khách
  const refundNote = (amount) => `Hoàn ${formatVND(amount)} cho hội viên: khoản này đang chờ ở mục Hoàn tiền, trả tiền xong thì bấm xác nhận ở đó.`
  const cancelSub = (s) => guard(async () => {
    try {
      await receptionistService.cancelSubscription(token, memberId, s.id)
      toast.success(s.status === 'SCHEDULED' ? `Đã hủy gói. ${refundNote(s.totalAmount)}` : 'Đã hủy gói chưa thu tiền, không có khoản nào phải hoàn')
      load()
    } catch (err) {
      toast.error(err.message || 'Hủy gói thất bại')
    }
  })
  const cancelReg = (r) => guard(async () => {
    try {
      const res = await receptionistService.cancelClassRegistration(token, r.id)
      toast.success(Number(res?.refundAmount) > 0 ? `Đã hủy đăng ký lớp. ${refundNote(res.refundAmount)}` : r.status === 'PENDING_PAYMENT' ? 'Đã hủy đăng ký chưa thu tiền' : 'Đã hủy đăng ký lớp, lớp đã khai giảng nên không hoàn tiền')
      load()
    } catch (err) {
      toast.error(err.message || 'Hủy đăng ký thất bại')
    }
  })

  // Học phí lớp được giảm theo hạng gói đang dùng; BE trừ lúc thu tiền nên hiện số thực thu thay vì học phí gốc
  const tuitionPct = Number(subs.find((s) => s.status === 'ACTIVE')?.benefits?.tuition_discount_pct || 0)
  const payableOf = (tuition) => Number(tuition || 0) - Math.round((Number(tuition || 0) * tuitionPct) / 100)

  // Mọi khoản đang chờ lễ tân thu tiền mặt, gom lại một chỗ vì đây là việc làm nhiều nhất tại quầy
  const due = [
    ...subs.filter((s) => s.status === 'PENDING').map((s) => {
      const expired = isSubscriptionPaymentExpired(s)
      return {
        key: `s${s.id}`,
        label: `Gói ${s.packageName}, ${s.purchaseType === 'UPGRADE' ? 'nâng cấp 30 ngày' : `${s.months} tháng`}${expired ? ' (đã quá hạn 24h)' : ''}`,
        amount: s.totalAmount,
        qr: { kind: 'subscriptions', id: s.id },
        expired,
        pay: () => run(() => receptionistService.confirmCashPayment(token, s.id, memberId, s.totalAmount), 'Đã thu tiền mặt, gói đã được kích hoạt', 'Thu tiền thất bại'),
        cancelExpired: () => cancelSub(s),
      }
    }),
    ...regs.filter((r) => r.status === 'PENDING_PAYMENT').map((r) => ({
      key: `r${r.id}`, label: `Lớp ${r.className}${tuitionPct ? ` (đã giảm ${tuitionPct}% theo gói)` : ''}`, amount: payableOf(r.tuition), qr: { kind: 'class-registrations', id: r.id },
      pay: () => run(() => receptionistService.payClassRegistrationCash(token, r.id), 'Đã thu tiền mặt, hội viên đã vào lớp', 'Thu tiền thất bại'),
    })),
    ...requests.filter((r) => r.status === 'APPROVED').map((r) => ({
      key: `q${r.id}`, label: `Buổi 1-1 ${r.sportName} với ${r.coachName}, ${r.sessions} buổi`, amount: r.payableTotal || 0, qr: { kind: 'coach-requests', id: r.id },
      pay: () => run(() => receptionistService.payCoachRequestCash(token, r.id), 'Đã thu tiền mặt cho cả chuỗi buổi 1-1', 'Thu tiền thất bại'),
    })),
  ]
  const dueTotal = due.reduce((s, d) => s + Number(d.amount), 0)
  const active = subs.find((s) => s.status === 'ACTIVE')
  const hasActive = !!active
  const liveRegs = regs.filter((r) => ['REGISTERED', 'PENDING_PAYMENT', 'WAITLISTED'].includes(r.status))
  const lockHint = verified ? undefined : 'Cần xác thực email của hội viên trước'
  const tabs = [['subs', 'Gói hội viên', subs.length], ['classes', 'Lớp học', liveRegs.length], ['one', 'Buổi 1-1', requests.length], ['pay', 'Thanh toán', payments.length]]

  return (
    <div className={styles.desk}>
      <section className={`${styles.card} ${styles.who}`} aria-label="Hội viên đang chọn">
        <button type="button" className={styles.back} onClick={onBack}>← Danh sách</button>
        <span className={styles.avatar} aria-hidden="true">{initial(member.fullName)}</span>
        <div>
          <h2>{member.fullName}</h2>
          <p className={styles.meta}>{member.email}{member.phone ? ` · ${member.phone}` : ''}</p>
        </div>
        <span className={`${styles.tag} ${verified ? styles.ok : styles.warn}`}>{verified ? 'Email đã xác thực' : 'Chưa xác thực email'}</span>
        {!verified && <div style={{ flexBasis: '100%' }}><VerifyBox member={member} onVerified={onChanged} /></div>}
        <div className={styles.summaryRow}>
          <div><small>Gói hiện tại</small><b>{active ? active.packageName : 'Chưa có'}</b><em>{active ? `Dùng đến hết ${lastUsableDate(active.endDate)}` : 'Chưa có gói đang dùng'}</em></div>
          <div><small>Lớp đang học</small><b>{liveRegs.length}</b><em>{liveRegs.length ? 'Đã đăng ký hoặc chờ thu tiền' : 'Chưa đăng ký lớp nào'}</em></div>
          <div><small>Chờ thu tiền</small><b className={due.length ? styles.hot : ''}>{due.length ? formatVND(dueTotal) : '0 đ'}</b><em>{due.length ? `${due.length} khoản` : 'Không có khoản nào'}</em></div>
        </div>
      </section>

      {qr && (
        <CounterQr kind={qr.qr.kind} id={qr.qr.id} label={qr.label} amount={qr.amount}
          onPaid={() => { setQr(null); toast.success('Đã nhận tiền chuyển khoản'); load() }} onClose={() => setQr(null)} />
      )}

      {due.length > 0 && (
        <section className={`${styles.card} ${styles.due}`} aria-label="Chờ thu tiền">
          <h2>Chờ thu tiền ({due.length})</h2>
          {due.map((d) => (
            <div key={d.key} className={styles.dueRow}>
              <span>{d.label}</span>
              <span className={styles.amount}>{formatVND(d.amount)}</span>
              {d.expired ? (
                <button type="button" className={`${styles.btnDanger} ${styles.sm}`} disabled={busy} onClick={d.cancelExpired}>Hủy đơn quá hạn</button>
              ) : (
                <>
                  <button type="button" className={styles.btn} disabled={busy} onClick={d.pay}>Thu tiền mặt</button>
                  <button type="button" className={styles.btnOutline || styles.btn} disabled={busy} onClick={() => setQr(d)}>Thu bằng QR</button>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      <div className={styles.tabs} role="tablist" aria-label="Thông tin hội viên">
        {tabs.map(([id, label, count]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? styles.on : ''} onClick={() => setTab(id)}>{label}<em>{count}</em></button>
        ))}
      </div>

      {tab === 'subs' && (
        <section className={styles.card}>
          <div className={styles.form}>
            <select ref={pkgSelect} aria-label="Gói" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
              <option value="">Chọn gói muốn bán</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatVND(p.monthlyPrice)}/tháng</option>)}
            </select>
            <label className={styles.inline}><input type="number" min="1" max="12" aria-label="Số tháng" value={months} onChange={(e) => setMonths(Number(e.target.value))} /> tháng</label>
            {hasActive ? (
              <>
                <button type="button" className={styles.btn} disabled={busy || !verified} title={lockHint}
                  onClick={() => needPackage() && run(() => receptionistService.renewMemberPackage(token, memberId, Number(pkgId), months), 'Đã tạo đơn gia hạn, thu tiền mặt ở khung phía trên', 'Gia hạn thất bại')}>Gia hạn</button>
                <button type="button" className={styles.btnOutline} disabled={busy || !verified} title={lockHint}
                  onClick={() => needPackage() && run(() => receptionistService.upgradeMemberPackage(token, memberId, Number(pkgId), 1), 'Đã tạo đơn nâng cấp (30 ngày), thu tiền mặt ở khung phía trên', 'Nâng cấp thất bại')}>Nâng cấp (30 ngày)</button>
              </>
            ) : (
              <button type="button" className={styles.btn} disabled={busy || !verified} title={lockHint}
                onClick={() => needPackage() && run(() => receptionistService.subscribeMemberPackage(token, memberId, Number(pkgId), months), 'Đã tạo đơn đăng ký gói, thu tiền mặt ở khung phía trên để kích hoạt', 'Đăng ký gói thất bại')}>Đăng ký gói</button>
            )}
          </div>
          {hasActive && verified && <p className={styles.hint}>Nâng cấp áp dụng chu kỳ 30 ngày, chỉ trả phần chênh lệch giá (hội viên phải chưa sử dụng quyền lợi gói hiện tại).</p>}
          {!verified && <p className={styles.hint}>Cần xác thực email của hội viên trước khi bán gói.</p>}
          {subs.length === 0 ? <p className={styles.empty}>Hội viên chưa có gói nào.</p> : subs.map((s) => (
            <div key={s.id} className={styles.item}>
              <p><strong>{s.packageName}</strong> · {s.purchaseType === 'UPGRADE' ? 'nâng cấp 30 ngày' : `${s.months} tháng`}<span>{s.startDate ? `${formatDate(s.startDate)}, dùng đến hết ${lastUsableDate(s.endDate)}` : 'Ngày bắt đầu có sau khi thu tiền'}</span></p>
              <span className={`${styles.tag} ${good(s.status) ? styles.ok : s.status === 'PENDING' ? styles.warn : ''}`}>{SUB_STATUS[s.status] || s.status}</span>
              <span className={styles.amount}>{formatVND(s.totalAmount)}</span>
              <div className={styles.acts}>
                {(s.status === 'PENDING' || s.status === 'SCHEDULED') && <button type="button" className={`${styles.btnDanger} ${styles.sm}`} disabled={busy} onClick={() => cancelSub(s)}>Hủy</button>}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'classes' && (
        <section className={styles.card}>
          <div className={styles.form}>
            <select aria-label="Lớp" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Chọn lớp để đăng ký giúp</option>
              {openClasses.map((c) => <option key={c.id} value={c.id} disabled={c.seatsLeft <= 0}>{c.name} · {c.seatsLeft > 0 ? `còn ${c.seatsLeft} chỗ` : 'hết chỗ'} · {formatVND(c.tuition)}</option>)}
            </select>
            <button type="button" className={styles.btn} disabled={!classId || busy || !verified} title={lockHint}
              onClick={() => run(async () => { await receptionistService.registerClassForMember(token, memberId, Number(classId), true); setClassId('') }, 'Đã đăng ký lớp, thu tiền mặt ở khung phía trên để giữ chỗ', 'Đăng ký lớp thất bại')}>Đăng ký lớp</button>
          </div>
          {!verified && <p className={styles.hint}>Cần xác thực email của hội viên trước khi đăng ký lớp.</p>}
          {regs.length === 0 ? <p className={styles.empty}>Hội viên chưa đăng ký lớp nào.</p> : regs.map((r) => (
            <div key={r.id} className={styles.item}>
              <p><strong>{r.className}</strong></p>
              <span className={`${styles.tag} ${good(r.status) ? styles.ok : r.status === 'PENDING_PAYMENT' ? styles.warn : ''}`}>{REG_STATUS[r.status] || r.status}</span>
              <span className={styles.amount}>{formatVND(r.status === 'PENDING_PAYMENT' ? payableOf(r.tuition) : r.tuition || 0)}</span>
              <div className={styles.acts}>
                {['PENDING_PAYMENT', 'REGISTERED', 'WAITLISTED'].includes(r.status) && <button type="button" className={`${styles.btnDanger} ${styles.sm}`} disabled={busy} onClick={() => cancelReg(r)}>Hủy</button>}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'one' && (
        <section className={styles.card}>
          {requests.length === 0 ? <p className={styles.empty}>Hội viên chưa gửi yêu cầu buổi 1-1 nào.</p> : requests.map((r) => (
            <div key={r.id} className={styles.item}>
              <p><strong>{r.sportName}</strong> với {r.coachName}<span>{r.sessions} buổi, từ {new Date(`${r.firstDate}T00:00:00`).toLocaleDateString('vi-VN')}</span></p>
              <span className={`${styles.tag} ${r.status === 'PAID' ? styles.ok : r.status === 'APPROVED' ? styles.warn : ''}`}>{REQ_STATUS[r.status] || r.status}</span>
              <span className={styles.amount}>{formatVND(r.payableTotal || 0)}</span>
              <span />
            </div>
          ))}
        </section>
      )}

      {tab === 'pay' && (
        <section className={styles.card}>
          {payments.length === 0 ? <p className={styles.empty}>Chưa có giao dịch.</p> : payments.map((p) => (
            <div key={p.id} className={styles.item}>
              <p>{p.invoiceNumber || `#${p.id}`}<span>{p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : 'Chưa thanh toán'} · {PAYMENT_METHOD[p.paymentMethod] || p.paymentMethod}</span></p>
              <span className={`${styles.tag} ${p.paymentStatus === 'SUCCESS' ? styles.ok : ''}`}>{PAYMENT_STATUS[p.paymentStatus] || p.paymentStatus}</span>
              <span className={styles.amount}>{formatVND(p.amount)}</span>
              <div className={styles.acts}>
                {p.paymentStatus === 'SUCCESS' && <button type="button" className={`${styles.btnOutline} ${styles.sm}`} onClick={() => showInvoice(p.id)}>Xem hóa đơn</button>}
              </div>
            </div>
          ))}
          {invoice && <InvoiceSheet invoice={invoice} onClose={() => setInvoice(null)} buttonClass={styles.btnOutline} />}
        </section>
      )}
    </div>
  )
}
