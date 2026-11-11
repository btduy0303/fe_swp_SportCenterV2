import React from 'react'
import { formatVND } from '../../utils/format'
import styles from '../../css/member/SubscriptionExtras.module.css'

// Đơn gói chờ thanh toán: tóm tắt giá và cách trả tiền, để hội viên kiểm tra đơn trước khi trả
export default function PendingOrderSummary({ sub, pkg }) {
  const isUpgrade = sub.purchaseType === 'UPGRADE'
  const listPrice = pkg ? pkg.monthlyPrice * sub.months : null
  const upgradeDiscount = Number(sub.upgradeDiscountAmount || 0)
  const discount = listPrice == null ? 0 : Math.max(0, listPrice - upgradeDiscount - sub.totalAmount)

  return (
    <div className={styles.order}>
      <h4 className={styles.heading}>Đơn của bạn</h4>
      <dl className={styles.lines}>
        <dt>{sub.packageName} · {isUpgrade ? '30 ngày (nâng cấp)' : `${sub.months} tháng`}</dt>
        <dd>{listPrice != null ? formatVND(listPrice) : ''}</dd>
        {upgradeDiscount > 0 && (<><dt>Trừ giá gói hiện tại</dt><dd>-{formatVND(upgradeDiscount)}</dd></>)}
        {discount > 0 && (<><dt>Giảm giá (mua dài hạn)</dt><dd>-{formatVND(discount)}</dd></>)}
        <dt className={styles.total}>{isUpgrade ? 'Chênh lệch cần thanh toán' : 'Tổng thanh toán'}</dt>
        <dd className={styles.total}>{formatVND(sub.totalAmount)}</dd>
      </dl>
      {isUpgrade ? (
        <p className={styles.hint}>
          <strong>Chính sách nâng cấp:</strong> gói mới có hiệu lực 30 ngày kể từ khi thanh toán xong. Vui lòng chưa sử dụng quyền lợi của gói hiện tại trước khi hoàn tất thanh toán.
        </p>
      ) : null}
      <p className={styles.hint}>
        <strong>Thanh toán online:</strong> quét mã QR bằng app ngân hàng, gói kích hoạt ngay khi nhận được tiền. Mã QR hết hạn thì bạn tạo mã mới. Đơn chưa thanh toán được giữ 24 giờ.
        {sub.onlinePaymentExpiresAt ? ` Mã QR hiện tại có hiệu lực đến ${new Date(sub.onlinePaymentExpiresAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}.` : ''}
      </p>
      <p className={styles.hint}>
        <strong>Trả tiền mặt:</strong> đến quầy lễ tân trong vòng 24 giờ, lễ tân thu tiền trên đúng đơn này và gói được kích hoạt ngay.
        {sub.cashPaymentDeadline ? ` Hạn trả tiền mặt: ${new Date(sub.cashPaymentDeadline).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}.` : ''}
        {isUpgrade && ' Đơn nâng cấp cũng áp dụng hạn 24 giờ này.'}
      </p>
    </div>
  )
}
