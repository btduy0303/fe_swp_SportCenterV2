import React from 'react'
import { formatVND } from '../../utils/format'
import styles from '../../css/member/SubscriptionExtras.module.css'

// Đơn gói chờ thanh toán: tóm tắt giá và cách trả tiền, để hội viên kiểm tra đơn trước khi trả
export default function PendingOrderSummary({ sub, pkg }) {
  const listPrice = pkg ? pkg.monthlyPrice * sub.months : null
  const credit = Number(sub.upgradeCreditAmount || 0)
  const discount = listPrice == null ? 0 : Math.max(0, listPrice - credit - sub.totalAmount)
  const isUpgrade = sub.purchaseType === 'UPGRADE'

  return (
    <div className={styles.order}>
      <h4 className={styles.heading}>Đơn của bạn</h4>
      <dl className={styles.lines}>
        <dt>{sub.packageName} · {sub.months} tháng</dt>
        <dd>{listPrice != null ? formatVND(listPrice) : ''}</dd>
        {credit > 0 && (<><dt>Trừ phần còn lại của gói hiện tại</dt><dd>-{formatVND(credit)}</dd></>)}
        {discount > 0 && (<><dt>Giảm giá (mua dài hạn)</dt><dd>-{formatVND(discount)}</dd></>)}
        <dt className={styles.total}>Tổng thanh toán</dt>
        <dd className={styles.total}>{formatVND(sub.totalAmount)}</dd>
      </dl>
      <p className={styles.hint}>
        Gói được kích hoạt ngay khi trung tâm nhận được tiền.
        {isUpgrade && ' Đơn nâng cấp trừ phần còn lại của gói cũ tính theo ngày tạo đơn, nên cần thanh toán trong ngày.'}
      </p>
    </div>
  )
}
