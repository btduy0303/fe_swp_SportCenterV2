import React from 'react'
import { createPortal } from 'react-dom'
import { formatVND, formatDate, lastUsableDate } from '../../utils/format'
import styles from '../../css/common/InvoiceSheet.module.css'

const METHOD = { CASH: 'Tiền mặt', QR_GATEWAY: 'Thanh toán online' }
const PURCHASE = { NEW: 'Đăng ký mới', RENEWAL: 'Gia hạn', UPGRADE: 'Nâng cấp' }
// CẦN ĐIỀN: địa chỉ và hotline thật của trung tâm (để trống thì hóa đơn không in dòng đó)
const CENTER = { name: 'SPORT CENTER', address: '', phone: '' }

function InvoiceBody({ invoice }) {
  const paidAt = invoice.paidAt ? new Date(invoice.paidAt).toLocaleString('vi-VN') : '-'
  const content = `${invoice.packageName || ''}${invoice.durationMonths ? ` · ${invoice.durationMonths} tháng` : ''}`
  const period = invoice.startDate && invoice.endDate ? `Hiệu lực: ${formatDate(invoice.startDate)} – ${lastUsableDate(invoice.endDate)}` : ''
  const credit = Number(invoice.upgradeDiscountAmount) > 0
    ? `Đã trừ phần chưa dùng của gói đầu tiên: ${formatVND(invoice.upgradeDiscountAmount)}`
    : Number(invoice.upgradeCreditAmount) > 0 ? `Giá trị gói cũ được quy đổi thành ngày sử dụng: ${formatVND(invoice.upgradeCreditAmount)}` : ''
  return <>
    <header className={styles.head}>
      <strong className={styles.brand}>{CENTER.name}</strong>
      {CENTER.address ? <span>{CENTER.address}</span> : null}
      {CENTER.phone ? <span>Hotline: {CENTER.phone}</span> : null}
    </header>
    <h3 className={styles.title}>HÓA ĐƠN THANH TOÁN</h3>
    <p className={styles.number}>Số: {invoice.invoiceNumber}</p>
    <dl className={styles.rows}>
      <dt>Thanh toán lúc</dt><dd>{paidAt}</dd>
      <dt>Hội viên</dt><dd>{[invoice.memberName, invoice.memberEmail, invoice.memberPhone].filter(Boolean).join(' · ')}</dd>
      <dt>Hình thức</dt><dd>{METHOD[invoice.paymentMethod] || invoice.paymentMethod}{invoice.receivedByName ? ` · thu bởi ${invoice.receivedByName}` : ''}</dd>
      {invoice.transactionCode ? <><dt>Mã giao dịch</dt><dd>{invoice.transactionCode}</dd></> : null}
    </dl>
    <table className={styles.items}>
      <thead><tr><th>Nội dung</th><th>Thành tiền</th></tr></thead>
      <tbody><tr>
        <td>{content}{PURCHASE[invoice.purchaseType] ? <small>{PURCHASE[invoice.purchaseType]}</small> : null}{period ? <small>{period}</small> : null}{credit ? <small>{credit}</small> : null}</td>
        <td>{formatVND(invoice.amount)}</td>
      </tr></tbody>
      <tfoot><tr><td>Tổng cộng</td><td className={styles.amount}>{formatVND(invoice.amount)}</td></tr></tfoot>
    </table>
    <p className={styles.thanks}>Cảm ơn bạn đã sử dụng dịch vụ của {CENTER.name}.</p>
  </>
}

// Hóa đơn một khoản thanh toán. Khi in, bản in riêng gắn thẳng vào <body> và mọi thứ khác bị ẩn bằng display:none
// (xem InvoiceSheet.module.css); cách cũ dùng visibility:hidden vẫn chiếm chỗ nên in ra hàng chục trang trống.
// buttonClass: class nút của trang đang dùng để nút khớp giao diện trang đó.
export default function InvoiceSheet({ invoice, onClose, buttonClass }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.sheet}><InvoiceBody invoice={invoice} /></div>
      <div className={styles.actions}>
        <button type="button" className={buttonClass} onClick={() => window.print()}>In hóa đơn</button>
        <button type="button" className={buttonClass} onClick={onClose}>Đóng</button>
      </div>
      {createPortal(<div className={`${styles.printOnly} print-invoice-root`}><InvoiceBody invoice={invoice} /></div>, document.body)}
    </div>
  )
}
