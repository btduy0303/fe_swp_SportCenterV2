import React from 'react'
import { formatVND } from '../../utils/format'
import styles from '../../css/member/PackagePlans.module.css'

const MONTHS = [1, 3, 6, 12]
// Lý do một mức nâng cấp chưa dùng được, nói rõ để hội viên biết cần làm gì
function upgradeNote(upQuote, upgrade) {
  if (!upQuote || upQuote.canUpgrade) return null
  if (upQuote.reason === 'ZERO_AMOUNT') {
    const enough = upgrade.find((q) => q.canUpgrade)
    return `Phần còn lại của gói hiện tại (${formatVND(upQuote.credit)}) đã đủ trả ${upQuote.months} tháng gói này, nên chưa có gì để thanh toán.${enough ? ` Hãy chọn từ ${enough.months} tháng trở lên để nâng cấp ngay.` : ''}`
  }
  return UPGRADE_REASON[upQuote.reason] || 'Chưa nâng cấp được mức này.'
}

const UPGRADE_REASON = {
  SCHEDULED_EXISTS: 'Bạn đang có gói đã trả chờ bắt đầu. Hủy gói chờ trước khi nâng cấp.',
  NO_REMAINING_VALUE: 'Gói hiện tại gần hết hạn. Hãy chọn đổi sang gói này khi hết hạn.',
}
const AI_LEVEL = { LIMITED: 'có giới hạn lượt', UNLIMITED: 'không giới hạn' }

// Quyền lợi của một gói, dựng từ các cột riêng của gói (không đọc chữ mô tả) để mỗi gói luôn đúng
function packageBenefits(pkg) {
  const list = []
  if (pkg.earlyRegisterDays > 0) list.push(`Đăng ký lớp sớm ${pkg.earlyRegisterDays} ngày`)
  if (pkg.tuitionDiscountPct > 0) list.push(`Giảm ${pkg.tuitionDiscountPct}% học phí lớp`)
  if (pkg.oneOnOneDiscountPct > 0) list.push(`Giảm ${pkg.oneOnOneDiscountPct}% buổi 1-1`)
  if (pkg.hasPersonalPlan) list.push('Bài tập riêng từ coach')
  if (AI_LEVEL[pkg.aiLevel]) list.push(`Trợ lý AI ${AI_LEVEL[pkg.aiLevel]}`)
  if (AI_LEVEL[pkg.menuAiLevel]) list.push(`Gợi ý thực đơn ${AI_LEVEL[pkg.menuAiLevel]}`)
  if (pkg.earlyLeaveRefundSessions > 0) list.push(`Rời lớp sớm vẫn được hoàn tiền (đã học tối đa ${pkg.earlyLeaveRefundSessions} buổi)`)
  if (pkg.waitlistPriority > 0) list.push(`Ưu tiên hàng chờ khi lớp đầy (cấp ${pkg.waitlistPriority})`)
  return list.length ? list : ['Vào khu tập tự do']
}

// Chọn gói hội viên: mỗi gói một thẻ.
// getAction(pkg) trả { label, onClick, disabled, secondary } để trang cha giữ nguyên luật mua, gia hạn, nâng cấp.
// upgradeQuotes: { packageId: [báo giá nâng cấp theo tháng] } cho các gói cao hơn gói đang dùng.
// getSecondaryAction(pkg) trả thêm một nút phụ (ví dụ đổi gói khi hết hạn) hoặc null.
export default function PackagePlans({ packages, quotes, selectedMonths, onSelectMonths, currentPackageId, getAction, upgradeQuotes = {}, getSecondaryAction }) {
  if (!packages.length) return <p className={styles.muted}>Hiện chưa có gói nào đang bán.</p>

  return (
    <section aria-labelledby="plans-title">
      <h2 id="plans-title" className={styles.title}>Chọn gói hội viên</h2>
      <p className={styles.lead}>Mua càng lâu, giá mỗi tháng càng thấp. Đơn chưa thanh toán có thể hủy bất cứ lúc nào.</p>

      <div className={styles.grid}>
        {packages.map((pkg) => {
          const months = selectedMonths[pkg.id] || 1
          const quote = quotes[pkg.id]
          const total = quote?.totalAmount ?? pkg.monthlyPrice * months
          const perMonth = Math.round(total / months)
          const saving = quote?.longTermDiscountPct || 0
          const action = getAction(pkg)
          const secondary = getSecondaryAction?.(pkg)
          const upgrade = upgradeQuotes[pkg.id]
          const upQuote = upgrade?.find((q) => q.months === months)
          const note = upgradeNote(upQuote, upgrade)
          const isCurrent = currentPackageId === pkg.id

          return (
            <article key={pkg.id} className={`${styles.card} ${isCurrent ? styles.current : ''}`}>
              <header className={styles.head}>
                <h3 className={styles.name}>{pkg.name}</h3>
                {isCurrent && <span className={styles.badge}>Gói đang dùng</span>}
              </header>

              <p className={styles.price}>{formatVND(perMonth)} <span>/ tháng</span></p>
              <p className={styles.saving}>{saving > 0 ? `Tiết kiệm ${saving}% so với mua từng tháng` : ' '}</p>

              <div className={styles.seg} role="group" aria-label={`Số tháng của gói ${pkg.name}`}>
                {MONTHS.map((m) => {
                  const unavailable = upgrade && !upgrade.find((q) => q.months === m)?.canUpgrade
                  return (
                    <button key={m} type="button" aria-pressed={months === m} className={`${months === m ? styles.on : ''} ${unavailable ? styles.dim : ''}`} onClick={() => onSelectMonths(pkg.id, m)}>
                      {m} tháng
                    </button>
                  )
                })}
              </div>
              {upQuote ? (
                upQuote.canUpgrade ? (
                  <p className={styles.total}>
                    Thanh toán hôm nay: <strong>{formatVND(upQuote.amountDue)}</strong>
                    <br />Đã trừ {formatVND(upQuote.credit)} từ phần còn lại của gói hiện tại.
                  </p>
                ) : (
                  <p className={styles.total}>Giá {months} tháng: <strong>{formatVND(upQuote.newTotal)}</strong></p>
                )
              ) : (
                <p className={styles.total}>Tổng thanh toán: <strong>{formatVND(total)}</strong></p>
              )}

              <ul className={styles.benefits}>
                {packageBenefits(pkg).map((b) => <li key={b}>{b}</li>)}
              </ul>

              {note && <p className={styles.note} role="note">{note}</p>}

              <button type="button" className={action.secondary ? styles.btnSecondary : styles.btnPrimary} disabled={action.disabled} onClick={action.onClick}>
                {action.label}
              </button>
              {secondary && (
                <button type="button" className={styles.btnSecondary} disabled={secondary.disabled} onClick={secondary.onClick}>
                  {secondary.label}
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
