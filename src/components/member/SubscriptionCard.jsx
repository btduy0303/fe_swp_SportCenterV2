import { formatDate, formatVND, lastUsableDate, subscriptionProgress } from '../../utils/format'
import { tierInfo } from '../../utils/overview'
import TierLadder from './TierLadder'
import PendingOrderSummary from './PendingOrderSummary'
import styles from '../../css/member/SubscriptionCard.module.css'

const STATUS = { ACTIVE: 'Đang sử dụng', PENDING: 'Chờ thanh toán', SCHEDULED: 'Chờ bắt đầu' }
const PAY_METHOD = { CASH: 'Tiền mặt tại quầy', QR_GATEWAY: 'Thanh toán online (QR)' }
const TYPE = { NEW: 'Đăng ký mới', RENEWAL: 'Gia hạn / chuyển gói', UPGRADE: 'Nâng cấp' }

// Một gói của hội viên (đang dùng, chờ thanh toán hoặc đã trả chờ bắt đầu), kèm các nút thao tác của đúng trạng thái đó.
export default function SubscriptionCard({ sub, packages, busy, onPay, onCheck, onCancel }) {
  const { tiers, index } = tierInfo(packages, sub.tierLevel)
  const progress = sub.status === 'ACTIVE' && sub.startDate && sub.endDate ? subscriptionProgress(sub.startDate, sub.endDate) : null
  const soon = progress && progress.daysLeft <= 7

  return (
    <article className={styles.card}>
      <div className={styles.main}>
        {tiers.length ? <TierLadder count={tiers.length} index={index} /> : null}
        <div className={styles.info}>
          <div className={styles.head}>
            <strong className={styles.name}>{sub.packageName || 'Gói tập'}</strong>
            {tiers.length ? <span className={styles.rank}>HẠNG {index}/{tiers.length}</span> : null}
            <span className={`${styles.chip} ${sub.status === 'ACTIVE' ? styles.ok : styles.warn}`}>{STATUS[sub.status] || sub.status}</span>
            <span className={styles.chip}>{sub.months} tháng</span>
            <span className={styles.chip}>{TYPE[sub.purchaseType] || sub.purchaseType}</span>
          </div>
          <p className={styles.dates}>
            {sub.startDate && sub.endDate ? `Từ ${formatDate(sub.startDate)} · dùng đến hết ${lastUsableDate(sub.endDate)}` : 'Ngày bắt đầu có sau khi thanh toán'}
            {sub.status === 'SCHEDULED' ? ' · bắt đầu sau khi gói hiện tại hết hạn' : ''}
          </p>
          {progress ? (
            <div className={styles.progress}>
              <span>Đã dùng {progress.percent}%</span>
              <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label="Tiến độ gói"><i style={{ width: `${Math.max(2, progress.percent)}%` }} /></div>
            </div>
          ) : null}
        </div>
        <div className={styles.meta}>
          {progress ? <><span>{soon ? 'Sắp hết hạn, còn' : 'Còn lại'}</span><b className={soon ? styles.soon : ''}>{progress.daysLeft} ngày</b></> : <><span>Giá thanh toán</span><b>{formatVND(sub.totalAmount)}</b></>}
        </div>
      </div>

      {sub.status === 'PENDING' ? <PendingOrderSummary sub={sub} pkg={packages.find((p) => p.id === sub.packageId)} /> : null}

      {sub.status === 'PENDING' ? (
        <p role="note">
          Hình thức thanh toán: {(sub.availablePaymentMethods?.length ? sub.availablePaymentMethods : ['CASH', 'QR_GATEWAY']).map((m) => PAY_METHOD[m] || m).join(' hoặc ')}.
          {sub.cashPaymentDeadline ? ` Hạn thanh toán tại quầy: ${new Date(sub.cashPaymentDeadline).toLocaleString('vi-VN')}.` : ''}
        </p>
      ) : null}

      {sub.status === 'PENDING' || sub.status === 'SCHEDULED' ? (
        <div className={styles.actions}>
          {sub.status === 'PENDING' ? (
            <>
              <button type="button" className={styles.primary} disabled={busy} onClick={() => onPay(sub)}>Thanh toán online</button>
              <button type="button" className={styles.secondary} disabled={busy} onClick={() => onCheck(sub)}>Tôi đã thanh toán</button>
            </>
          ) : null}
          <button type="button" className={styles.danger} onClick={() => onCancel(sub)}>{sub.status === 'SCHEDULED' ? 'Hủy và hoàn tiền' : 'Hủy đơn'}</button>
        </div>
      ) : null}
    </article>
  )
}
