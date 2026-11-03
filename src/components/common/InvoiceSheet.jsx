import React from 'react'
import { formatVND } from '../../utils/format'
import styles from '../../css/common/InvoiceSheet.module.css'

const METHOD = { CASH: 'Tiền mặt', QR_GATEWAY: 'Thanh toán online' }

// Hóa đơn một khoản thanh toán. Khi in chỉ in tờ này (xem InvoiceSheet.module.css), nút bấm không in ra.
// buttonClass: class nút của trang đang dùng để nút khớp giao diện trang đó.
export default function InvoiceSheet({ invoice, onClose, buttonClass }) {
  const paidAt = invoice.paidAt ? new Date(invoice.paidAt).toLocaleString('vi-VN') : '-'

  return (
    <div className={styles.wrap}>
      <div className={`${styles.sheet} print-invoice`}>
        <h3 className={styles.title}>Hóa đơn {invoice.invoiceNumber}</h3>
        <dl className={styles.rows}>
          <dt>Thanh toán lúc</dt><dd>{paidAt}</dd>
          <dt>Hội viên</dt><dd>{[invoice.memberName, invoice.memberEmail, invoice.memberPhone].filter(Boolean).join(' · ')}</dd>
          <dt>Nội dung</dt><dd>{invoice.packageName}{invoice.durationMonths ? ` · ${invoice.durationMonths} tháng` : ''}</dd>
          <dt>Hình thức</dt><dd>{METHOD[invoice.paymentMethod] || invoice.paymentMethod}{invoice.receivedByName ? ` · thu bởi ${invoice.receivedByName}` : ''}</dd>
          <dt>Số tiền</dt><dd className={styles.amount}>{formatVND(invoice.amount)}</dd>
        </dl>
      </div>
      <div className={`${styles.actions} no-print`}>
        <button type="button" className={buttonClass} onClick={() => window.print()}>In hóa đơn</button>
        <button type="button" className={buttonClass} onClick={onClose}>Đóng</button>
      </div>
    </div>
  )
}
