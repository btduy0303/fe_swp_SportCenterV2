import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { memberService } from '../../services/memberService'
import { formatVND } from '../../utils/format'
import styles from '../../css/member/MemberDashboard.module.css'

const STATUS = {
  SUCCESS: 'Thành công',
  PENDING: 'Chờ thanh toán',
  FAILED: 'Thất bại',
  EXPIRED: 'Hết hạn',
  CANCELED: 'Đã hủy',
  PENDING_REFUND: 'Chờ hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
}

// Lịch sử thanh toán của hội viên và hóa đơn từng khoản
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
    <div className={styles.card}>
      {payments === null ? <p className="text-muted">Đang tải...</p> : payments.length === 0 ? (
        <p className="text-muted">Bạn chưa có giao dịch nào.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr className="text-hint">
                <th className="cell">Mã hóa đơn</th>
                <th className="cell">Nội dung</th>
                <th className="cell">Số tiền</th>
                <th className="cell">Hình thức</th>
                <th className="cell">Trạng thái</th>
                <th className="cell">Thời gian</th>
                <th className="cell"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td className="cell">{p.invoiceNumber || `#${p.id}`}</td>
                  <td className="cell">{what(p)}</td>
                  <td className="cell">{formatVND(p.amount)}</td>
                  <td className="cell">{p.paymentMethod}</td>
                  <td className="cell">{STATUS[p.paymentStatus] || p.paymentStatus}</td>
                  <td className="cell">{p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : '-'}</td>
                  <td className="cell">
                    {p.paymentStatus === 'SUCCESS' && <button type="button" className={styles.btnSecondary} onClick={() => open(p.id)}>Hóa đơn</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginTop: '2rem' }}>Hoàn Tiền Của Tôi</h3>
      {refunds.length === 0 ? <p className="text-muted">Bạn chưa có khoản hoàn tiền nào.</p> : (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
          {refunds.map((r) => (
            <li key={r.id} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
              <strong>{formatVND(r.amount)}</strong> ({r.method}) · {r.status === 'DONE' ? 'Đã hoàn' : 'Đang chờ quầy hoàn tiền'} · {new Date(r.requestedAt).toLocaleString('vi-VN')}<br />
              <span style={{ color: 'var(--text-secondary)' }}>{r.invoiceNumber} · {r.reason}</span>
            </li>
          ))}
        </ul>
      )}

      {invoice && (
        <div style={{ marginTop: '1.5rem', padding: '1.25rem', border: '1px solid var(--border-color)' }}>
          <h3>Hóa đơn {invoice.invoiceNumber}</h3>
          <p>{invoice.memberName} · {invoice.memberEmail}</p>
          <p>{invoice.packageName}{invoice.durationMonths ? ` · ${invoice.durationMonths} tháng` : ''}</p>
          {invoice.startDate && <p>Hiệu lực: {invoice.startDate} đến {invoice.endDate}</p>}
          <p>Số tiền: <strong>{formatVND(invoice.amount)}</strong> ({invoice.paymentMethod})</p>
          <p>Thanh toán lúc: {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString('vi-VN') : '-'}</p>
          <button type="button" className={styles.btnSecondary} onClick={() => window.print()}>In hóa đơn</button>{' '}
          <button type="button" className={styles.btnSecondary} onClick={() => setInvoice(null)}>Đóng</button>
        </div>
      )}
    </div>
  )
}
