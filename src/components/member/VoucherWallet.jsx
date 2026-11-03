import React from 'react'
import { formatVND } from '../../utils/format'
import styles from '../../css/member/VoucherWallet.module.css'

const SOON_DAYS = 14

function discountText(v) {
  if (v.kind === 'PERCENT') return `${Number(v.value)}%`
  if (v.kind === 'AMOUNT') return formatVND(v.value)
  if (v.kind === 'FREE_ONE_ON_ONE') return '1 buổi'
  return ''
}

// Ví voucher: ô nhập mã và các thẻ voucher. Hạn dưới 14 ngày đổi sang màu nhắc.
// sourceLabels / targetLabels: tên hiển thị của nguồn voucher và thứ voucher áp dụng.
export default function VoucherWallet({ vouchers, code, onCodeChange, onRedeem, sourceLabels, targetLabels }) {
  return (
    <section aria-labelledby="voucher-title">
      <h2 id="voucher-title" className={styles.title}>Voucher của tôi</h2>

      <form onSubmit={onRedeem} className={styles.redeem}>
        <input type="text" aria-label="Mã voucher" placeholder="Nhập mã voucher" value={code} onChange={(e) => onCodeChange(e.target.value.toUpperCase())} />
        <button type="submit">Thêm mã</button>
      </form>

      {vouchers.length === 0 ? (
        <p className={styles.empty}>Bạn chưa có voucher nào. Voucher sẽ xuất hiện ở đây khi bạn đủ điều kiện nhận hoặc nhập mã.</p>
      ) : (
        <div className={styles.grid}>
          {vouchers.map((v) => {
            const daysLeft = v.expiresAt ? Math.ceil((new Date(v.expiresAt) - new Date()) / 86400000) : null
            const soon = daysLeft != null && daysLeft <= SOON_DAYS
            return (
              <article key={v.id} className={`${styles.card} ${v.usable ? '' : styles.off}`}>
                <div className={styles.value}>
                  <b>{discountText(v)}</b>
                  <span>{targetLabels[v.appliesTo] || v.appliesTo}</span>
                </div>
                <div className={styles.info}>
                  <p className={styles.source}>{sourceLabels[v.source] || 'Voucher'}</p>
                  <p>{v.usable ? 'Chọn khi thanh toán' : (v.unusableReason || 'Chưa dùng được')}</p>
                  <p className={soon ? styles.soon : ''}>{v.expiresAt ? `Hết hạn ${new Date(v.expiresAt).toLocaleDateString('vi-VN')}` : 'Không thời hạn'}</p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
