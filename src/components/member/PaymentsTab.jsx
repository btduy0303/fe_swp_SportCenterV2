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

  useEffect(() => {
    memberService.getMyPayments(token).then(setPayments).catch((err) => toast.error(err.message))
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
      <h2 className={styles.cardTitle}>Lịch Sử Thanh Toán</h2>
      {payments === null ? <p style={{ color: 'var(--text-muted)' }}>Đang tải...</p> : payments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Bạn chưa có giao dịch nào.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.6rem' }}>Mã hóa đơn</th>
                <th style={{ padding: '0.6rem' }}>Nội dung</th>
                <th style={{ padding: '0.6rem' }}>Số tiền</th>
                <th style={{ padding: '0.6rem' }}>Hình thức</th>
                <th style={{ padding: '0.6rem' }}>Trạng thái</th>
                <th style={{ padding: '0.6rem' }}>Thời gian</th>
                <th style={{ padding: '0.6rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.6rem' }}>{p.invoiceNumber || `#${p.id}`}</td>
                  <td style={{ padding: '0.6rem' }}>{what(p)}</td>
                  <td style={{ padding: '0.6rem' }}>{formatVND(p.amount)}</td>
                  <td style={{ padding: '0.6rem' }}>{p.paymentMethod}</td>
                  <td style={{ padding: '0.6rem' }}>{STATUS[p.paymentStatus] || p.paymentStatus}</td>
                  <td style={{ padding: '0.6rem' }}>{p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : '-'}</td>
                  <td style={{ padding: '0.6rem' }}>
                    {p.paymentStatus === 'SUCCESS' && <button type="button" className={styles.btnSecondary} onClick={() => open(p.id)}>Hóa đơn</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
