import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { memberService } from '../../services/memberService'
import { formatVND } from '../../utils/format'
import InvoiceSheet from '../common/InvoiceSheet'
import styles from '../../css/member/PaymentsTab.module.css'
import buttons from '../../css/member/MemberDashboard.module.css'

const STATUS = {
  SUCCESS: 'Thành công',
  PENDING: 'Chờ thanh toán',
  FAILED: 'Thất bại',
  EXPIRED: 'Hết hạn',
  CANCELED: 'Đã hủy',
  PENDING_REFUND: 'Chờ hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
}

const METHOD = { CASH: 'Tiền mặt', QR_GATEWAY: 'Thanh toán online' }

// Lý do hoàn tiền do BE ghi bằng tiếng Anh; đổi sang tiếng Việt để hội viên đọc được
const REFUND_REASON = {
  'Package canceled before it started': 'Hủy gói trước ngày bắt đầu',
  'Package canceled': 'Hủy gói',
  '1-1 session no longer available when the payment arrived': 'Suất 1-1 không còn khi tiền về',
  'Seat no longer available when the payment arrived': 'Lớp hết chỗ khi tiền về',
}
const reasonVi = (r) => REFUND_REASON[r] || (r?.startsWith('Class canceled by the center: ') ? `Trung tâm hủy lớp: ${r.slice(30)}` : r)

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '-')

// Lịch sử thanh toán, hoàn tiền của hội viên và hóa đơn từng khoản
export default function PaymentsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [payments, setPayments] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [refunds, setRefunds] = useState([])

  useEffect(() => {
    memberService.getMyPayments(token).then(setPayments).catch((err) => toast.error(err.message))
    memberService.getMyRefunds(token).then(setRefunds).catch(() => setRefunds([]))
  }, [token, toast])

  const open = async (id) => {
    try {
      setInvoice(await memberService.getInvoice(token, id))
    } catch (err) {
      toast.error(err.message || 'Không thể tải hóa đơn')
    }
  }

  const what = (p) => (p.subscriptionId ? 'Gói hội viên' : p.registrationId ? 'Học phí lớp' : p.coachSlotId ? 'Buổi 1-1' : 'Thanh toán')

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>Thanh toán</h2>
      <p className={styles.heading}>Lịch sử thanh toán</p>
      {payments === null ? <p className={styles.muted}>Đang tải...</p> : payments.length === 0 ? (
        <p className={styles.empty}>Bạn chưa có giao dịch nào.</p>
      ) : (
        <div className={styles.list}>
          {payments.map((p) => (
            <article key={p.id} className={styles.row}>
              <div className={styles.main}>
                <p className={styles.name}>{what(p)}{p.invoiceNumber ? ` · ${p.invoiceNumber}` : ''}</p>
                <p className={styles.meta}>{fmtDate(p.paidAt)} · {METHOD[p.paymentMethod] || p.paymentMethod} · {STATUS[p.paymentStatus] || p.paymentStatus}</p>
              </div>
              <span className={styles.amount}>{formatVND(p.amount)}</span>
              {p.paymentStatus === 'SUCCESS' && <button type="button" className={styles.link} onClick={() => open(p.id)}>Xem hóa đơn</button>}
            </article>
          ))}
        </div>
      )}

      <p className={styles.heading}>Hoàn tiền</p>
      {refunds.length === 0 ? (
        <p className={styles.empty}>Chưa có khoản hoàn tiền nào. Khi bạn hủy lớp hoặc buổi 1-1 đủ điều kiện, khoản hoàn sẽ hiện ở đây.</p>
      ) : (
        <div className={styles.list}>
          {refunds.map((r) => (
            <article key={r.id} className={styles.row}>
              <div className={styles.main}>
                <p className={styles.name}>{r.invoiceNumber} · {reasonVi(r.reason)}</p>
                <p className={styles.meta}>{METHOD[r.method] || r.method} · {r.status === 'DONE' ? 'Đã hoàn' : 'Đang chờ quầy hoàn tiền'} · {fmtDate(r.requestedAt)}</p>
              </div>
              <span className={styles.amount}>{formatVND(r.amount)}</span>
            </article>
          ))}
        </div>
      )}

      {invoice && <InvoiceSheet invoice={invoice} onClose={() => setInvoice(null)} buttonClass={buttons.btnSecondary} />}
    </div>
  )
}
