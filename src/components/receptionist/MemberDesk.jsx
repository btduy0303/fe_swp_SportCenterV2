import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { receptionistService } from '../../services/receptionistService'
import { classService } from '../../services/classService'
import { formatVND } from '../../utils/format'
import styles from '../../css/manager/ManagerDashboard.module.css'

const REG_STATUS = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  REGISTERED: 'Đã đăng ký',
  WAITLISTED: 'Hàng chờ',
  CANCELED: 'Đã hủy',
  LEFT: 'Đã rời lớp',
}

// Xử lý tại quầy cho một hội viên: gói, lớp, thu tiền mặt, voucher, lịch sử thanh toán và hóa đơn
export default function MemberDesk({ memberId, packages }) {
  const { token } = useAuth()
  const toast = useToast()
  const [subs, setSubs] = useState([])
  const [regs, setRegs] = useState([])
  const [payments, setPayments] = useState([])
  const [vouchers, setVouchers] = useState([])
  const [openClasses, setOpenClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [pkgId, setPkgId] = useState('')
  const [months, setMonths] = useState(1)
  const [invoice, setInvoice] = useState(null)

  const load = useCallback(async () => {
    if (!memberId) return
    try {
      const [s, r, p, v, c] = await Promise.all([
        receptionistService.getMemberSubscriptions(token, memberId),
        receptionistService.getMemberClassRegistrations(token, memberId),
        receptionistService.getMemberPayments(token, memberId),
        receptionistService.getMemberVouchers(token, memberId),
        classService.getOpenClasses(),
      ])
      setSubs(s)
      setRegs(r)
      setPayments(p)
      setVouchers(v.vouchers || [])
      setOpenClasses(c)
    } catch (err) {
      toast.error(err.message || 'Không thể tải thông tin hội viên')
    }
  }, [token, memberId, toast])

  useEffect(() => {
    setInvoice(null)
    load()
  }, [load])

  // Chạy một thao tác rồi báo kết quả và tải lại
  const run = async (action, okMsg, failMsg) => {
    try {
      await action()
      toast.success(okMsg)
      load()
    } catch (err) {
      toast.error(err.message || failMsg)
    }
  }

  const showInvoice = async (paymentId) => {
    try {
      setInvoice(await receptionistService.getInvoice(token, paymentId))
    } catch (err) {
      toast.error(err.message || 'Không thể tải hóa đơn')
    }
  }

  if (!memberId) return null

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Gói Của Hội Viên</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <select className={styles.select} value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
            <option value="">Chọn gói</option>
            {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" min="1" max="12" className={styles.input} style={{ width: 90 }} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
          <button type="button" className={styles.btnAction} disabled={!pkgId}
            onClick={() => run(() => receptionistService.renewMemberPackage(token, memberId, Number(pkgId), months), 'Đã tạo đơn gia hạn', 'Gia hạn thất bại')}>
            Gia hạn
          </button>
          <button type="button" className={styles.btnAction} disabled={!pkgId}
            onClick={() => run(() => receptionistService.upgradeMemberPackage(token, memberId, Number(pkgId), months), 'Đã tạo đơn nâng hạng', 'Nâng hạng thất bại')}>
            Nâng hạng
          </button>
        </div>
        {subs.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Hội viên chưa có gói nào.</p> : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Gói</th>
                  <th className={styles.th}>Thời hạn</th>
                  <th className={styles.th}>Số tiền</th>
                  <th className={styles.th}>Trạng thái</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className={styles.row}>
                    <td className={styles.td}><strong>{s.packageName}</strong> ({s.months} tháng)</td>
                    <td className={styles.td}>{s.startDate ? `${s.startDate} → ${s.endDate}` : '-'}</td>
                    <td className={styles.td}>{formatVND(s.totalAmount)}</td>
                    <td className={styles.td}>{s.status}</td>
                    <td className={styles.td}>
                      {s.status === 'PENDING' && (
                        <button type="button" className={styles.btnAction}
                          onClick={() => run(() => receptionistService.confirmCashPayment(token, s.id, memberId, s.totalAmount), 'Đã thu tiền mặt', 'Thu tiền thất bại')}>
                          Thu tiền mặt
                        </button>
                      )}{' '}
                      {(s.status === 'PENDING' || s.status === 'ACTIVE' || s.status === 'SCHEDULED') && (
                        <button type="button" className={styles.btnDanger}
                          onClick={() => run(() => receptionistService.cancelSubscription(token, memberId, s.id), 'Đã hủy gói', 'Hủy gói thất bại')}>
                          Hủy
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Lớp Của Hội Viên</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <select className={styles.select} value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Chọn lớp để đăng ký giúp</option>
            {openClasses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.seatsLeft} chỗ) {formatVND(c.tuition)}</option>)}
          </select>
          <button type="button" className={styles.btnAction} disabled={!classId}
            onClick={() => run(() => receptionistService.registerClassForMember(token, memberId, Number(classId), true), 'Đã đăng ký lớp cho hội viên', 'Đăng ký lớp thất bại')}>
            Đăng ký lớp
          </button>
        </div>
        {regs.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Hội viên chưa đăng ký lớp nào.</p> : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <tbody>
                {regs.map((r) => (
                  <tr key={r.id} className={styles.row}>
                    <td className={styles.td}><strong>{r.className}</strong></td>
                    <td className={styles.td}>{formatVND(r.tuition || 0)}</td>
                    <td className={styles.td}>{REG_STATUS[r.status] || r.status}</td>
                    <td className={styles.td}>
                      {r.status === 'PENDING_PAYMENT' && (
                        <button type="button" className={styles.btnAction}
                          onClick={() => run(() => receptionistService.payClassRegistrationCash(token, r.id), 'Đã thu tiền mặt', 'Thu tiền thất bại')}>
                          Thu tiền mặt
                        </button>
                      )}{' '}
                      {(r.status === 'PENDING_PAYMENT' || r.status === 'REGISTERED' || r.status === 'WAITLISTED') && (
                        <button type="button" className={styles.btnDanger}
                          onClick={() => run(() => receptionistService.cancelClassRegistration(token, r.id), 'Đã hủy đăng ký', 'Hủy đăng ký thất bại')}>
                          Hủy
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Voucher Của Hội Viên</h2>
        {vouchers.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Hội viên chưa có voucher.</p> : (
          <ul style={{ paddingLeft: '1.2rem' }}>
            {vouchers.map((v) => (
              <li key={v.id}>
                {v.kind} {v.value} · {v.appliesTo} · hạn {new Date(v.expiresAt).toLocaleDateString('vi-VN')}
                {!v.usable && ` · không dùng được: ${v.unusableReason}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Lịch Sử Thanh Toán</h2>
        {payments.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Chưa có giao dịch.</p> : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className={styles.row}>
                    <td className={styles.td}>{p.invoiceNumber || `#${p.id}`}</td>
                    <td className={styles.td}>{formatVND(p.amount)} ({p.paymentMethod})</td>
                    <td className={styles.td}>{p.paymentStatus}</td>
                    <td className={styles.td}>{p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : '-'}</td>
                    <td className={styles.td}>
                      {p.paymentStatus === 'SUCCESS' && (
                        <button type="button" className={styles.btnAction} onClick={() => showInvoice(p.id)}>Xem hóa đơn</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {invoice && (
          <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 8 }}>
            <h3>Hóa đơn {invoice.invoiceNumber}</h3>
            <p>{invoice.memberName} · {invoice.memberEmail} · {invoice.memberPhone}</p>
            <p>{invoice.packageName} {invoice.durationMonths ? `· ${invoice.durationMonths} tháng` : ''}</p>
            <p>Số tiền: <strong>{formatVND(invoice.amount)}</strong> ({invoice.paymentMethod}) · thu bởi {invoice.receivedByName || 'hệ thống'}</p>
            <button type="button" className={styles.btnAction} onClick={() => window.print()}>In hóa đơn</button>{' '}
            <button type="button" className={styles.btnAction} onClick={() => setInvoice(null)}>Đóng</button>
          </div>
        )}
      </div>
    </>
  )
}
