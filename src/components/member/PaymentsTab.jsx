import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard, GraduationCap, IdCard, Undo2, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { memberService } from '../../services/memberService'
import { formatVND } from '../../utils/format'
import InvoiceSheet from '../common/InvoiceSheet'
import PageHead from './PageHead'
import { PAYMENT_METHOD as METHOD, refundReasonVi as reasonVi } from '../../utils/labels'
import styles from '../../css/member/PaymentsTab.module.css'
import buttons from '../../css/member/MemberDashboard.module.css'

// tone: ok xanh, wait vàng, off xám, bad đỏ
const STATUS = {
  SUCCESS: ['Thành công', 'ok'],
  CREATING: ['Đang tạo giao dịch', 'wait'],
  PENDING: ['Chờ thanh toán', 'wait'],
  PENDING_PAYMENT: ['Chờ thanh toán', 'wait'],
  FAILED: ['Thất bại', 'bad'],
  EXPIRED: ['Hết hạn', 'off'],
  CANCELED: ['Đã hủy', 'off'],
  PENDING_REFUND: ['Chờ hoàn tiền', 'wait'],
  REFUNDED: ['Đã hoàn tiền', 'ok'],
}

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '-')
const monthKey = (v) => (v ? `${new Date(v).getFullYear()}-${String(new Date(v).getMonth() + 1).padStart(2, '0')}` : 'pending')
const monthLabel = (key) => (key === 'pending' ? 'Chưa thanh toán' : `Tháng ${key.slice(5)}/${key.slice(0, 4)}`)

// Loại khoản thanh toán và biểu tượng tương ứng
function kind(p) {
  if (p.subscriptionId) return ['Gói hội viên', IdCard]
  if (p.registrationId) return ['Học phí lớp', GraduationCap]
  if (p.coachSlotId) return ['Buổi 1-1', UserRound]
  return ['Thanh toán', CreditCard]
}

// Lịch sử thanh toán, hoàn tiền của hội viên và hóa đơn từng khoản
export default function PaymentsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [payments, setPayments] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [refunds, setRefunds] = useState([])
  const invoiceRef = useRef(null)

  useEffect(() => {
    memberService.getMyPayments(token).then(setPayments).catch((err) => toast.error(err.message))
    memberService.getMyRefunds(token).then(setRefunds).catch(() => setRefunds([]))
  }, [token, toast])

  // Hóa đơn mở ở cuối trang: cuộn tới đó để hội viên khỏi phải kéo xuống
  useEffect(() => {
    if (!invoice) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    invoiceRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  }, [invoice])

  const open = async (id) => {
    try {
      setInvoice(await memberService.getInvoice(token, id))
    } catch (err) {
      toast.error(err.message || 'Không thể tải hóa đơn')
    }
  }

  const done = (payments || []).filter((p) => p.paymentStatus === 'SUCCESS')
  const paidTotal = done.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const refundedTotal = refunds.filter((r) => r.status === 'DONE').reduce((sum, r) => sum + Number(r.amount || 0), 0)

  // Gom theo tháng thanh toán, khoản chưa thanh toán lên đầu, mới nhất trước
  const groups = useMemo(() => {
    const map = new Map()
    ;[...(payments || [])].sort((a, b) => String(b.paidAt || '9').localeCompare(String(a.paidAt || '9'))).forEach((p) => {
      const key = monthKey(p.paidAt)
      map.set(key, [...(map.get(key) || []), p])
    })
    return [...map]
  }, [payments])

  return (
    <div className={styles.wrap}>
      <PageHead title="Thanh toán" lead="Các khoản bạn đã trả, đơn đang chờ và tiền được hoàn. Bấm Xem hóa đơn để xem hoặc in." />

      <div className={styles.summary}>
        <div className={styles.hl}><strong>{formatVND(paidTotal)}</strong><span>Đã thanh toán</span></div>
        <div><strong>{done.length}</strong><span>Giao dịch thành công</span></div>
        <div><strong>{formatVND(refundedTotal)}</strong><span>Đã được hoàn</span></div>
      </div>

      <h2 className={styles.heading}>Lịch sử thanh toán</h2>
      {payments === null ? <p className={styles.muted}>Đang tải...</p> : payments.length === 0 ? (
        <p className={styles.empty}>Bạn chưa có giao dịch nào.</p>
      ) : groups.map(([key, list]) => (
        <section key={key} aria-label={monthLabel(key)}>
          <p className={styles.month}>{monthLabel(key).toUpperCase()}</p>
          <div className={styles.list}>
            {list.map((p) => {
              const [name, Icon] = kind(p)
              const [label, tone] = STATUS[p.paymentStatus] || [p.paymentStatus, 'off']
              return (
                <article key={p.id} className={styles.row}>
                  <span className={styles.icon} aria-hidden="true"><Icon size={20} /></span>
                  <div className={styles.main}>
                    <p className={styles.name}>{p.itemName || name}{p.invoiceNumber ? ` · ${p.invoiceNumber}` : ''}</p>
                    <p className={styles.meta}>
                      {p.paidAt ? `${fmtDate(p.paidAt)} · ${METHOD[p.paymentMethod] || p.paymentMethod}` : p.paymentMethod === 'UNPAID' ? 'Chưa thanh toán' : `Chưa thanh toán · ${METHOD[p.paymentMethod] || p.paymentMethod}`}
                    </p>
                    {(p.paymentStatus === 'PENDING' || p.paymentStatus === 'PENDING_PAYMENT') ? (
                      <>
                        <p className={styles.meta}>
                          Có thể trả: {(p.availablePaymentMethods?.length ? p.availablePaymentMethods : ['CASH', 'QR_GATEWAY']).map((m) => (m === 'CASH' ? 'Tiền mặt tại quầy' : 'Online (QR)')).join(' hoặc ')}
                        </p>
                        {p.cashPaymentDeadline ? <p className={styles.meta}>Tiền mặt trước {new Date(p.cashPaymentDeadline).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })} (24 giờ)</p> : null}
                        {p.paymentExpiresAt ? <p className={styles.meta}>Đơn hết hạn {new Date(p.paymentExpiresAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p> : null}
                        {p.onlinePaymentExpiresAt ? <p className={styles.meta}>Mã QR hiệu lực đến {new Date(p.onlinePaymentExpiresAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p> : null}
                      </>
                    ) : null}
                  </div>
                  <span className={styles.amount}>{formatVND(p.amount)}</span>
                  <div className={styles.side}>
                    <span className={`${styles.chip} ${styles[tone]}`}>{label}</span>
                    {p.paymentStatus === 'SUCCESS' ? <button type="button" className={styles.link} onClick={() => open(p.id)}>Xem hóa đơn</button> : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}

      <h2 className={styles.heading}>Hoàn tiền</h2>
      {refunds.length === 0 ? (
        <p className={styles.empty}>Chưa có khoản hoàn tiền nào. Khi bạn hủy lớp hoặc buổi 1-1 đủ điều kiện, khoản hoàn sẽ hiện ở đây.</p>
      ) : (
        <div className={styles.list}>
          {refunds.map((r) => (
            <article key={r.id} className={styles.row}>
              <span className={styles.icon} aria-hidden="true"><Undo2 size={20} /></span>
              <div className={styles.main}>
                <p className={styles.name}>{r.invoiceNumber} · {reasonVi(r.reason)}</p>
                <p className={styles.meta}>{METHOD[r.method] || r.method} · {fmtDate(r.requestedAt)}</p>
                {r.claimCode ? <p className={styles.meta}>Mã nhận tiền: <b>{r.claimCode.replace(/(\d{3})(\d{3})/, '$1 $2')}</b> · đọc mã này cho nhân viên quầy khi nhận tiền, không chia sẻ cho ai khác</p> : null}
              </div>
              <span className={`${styles.amount} ${styles.refund}`}>{formatVND(r.amount)}</span>
              <div className={styles.side}>
                <span className={`${styles.chip} ${r.status === 'DONE' ? styles.ok : styles.wait}`}>{r.status === 'DONE' ? 'Đã hoàn' : 'Chờ quầy hoàn tiền'}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {invoice ? <div ref={invoiceRef} className={styles.invoice}><InvoiceSheet invoice={invoice} onClose={() => setInvoice(null)} buttonClass={buttons.btnSecondary} /></div> : null}
    </div>
  )
}
