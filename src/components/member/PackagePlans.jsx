import React from 'react'
import { Check } from 'lucide-react'
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

// Quyền lợi của một gói, dựng từ các cột riêng của gói (không đọc chữ mô tả) để mỗi gói luôn đúng
function packageBenefits(pkg) {
  const list = []
  if (pkg.tuitionDiscountPct > 0) list.push(`Giảm ${pkg.tuitionDiscountPct}% học phí lớp`)
  if (pkg.oneOnOneDiscountPct > 0) list.push(`Giảm ${pkg.oneOnOneDiscountPct}% buổi 1-1`)
  if (pkg.hasPersonalPlan) list.push('Bài tập riêng từ coach')
  if (pkg.waitlistPriority > 0) list.push(`Ưu tiên hàng chờ khi lớp đầy (cấp ${pkg.waitlistPriority})`)
  return list.length ? list : ['Vào khu tập tự do']
}

// Chọn gói hội viên: các hạng đặt cạnh nhau, một ô chọn số tháng chung cho tất cả.
// getAction(pkg) trả { label, onClick, disabled, secondary } để trang cha giữ nguyên luật mua, gia hạn, nâng cấp.
// upgradeQuotes: { packageId: [báo giá nâng cấp theo tháng] } cho các gói cao hơn gói đang dùng.
// getSecondaryAction(pkg) trả thêm một nút phụ (ví dụ đổi gói khi hết hạn) hoặc null.
export default function PackagePlans({ packages, quotes, selectedMonths, onSelectMonths, currentPackageId, getAction, upgradeQuotes = {}, getSecondaryAction, getCreditUpgrade }) {
  if (!packages.length) return <p className={styles.muted}>Hiện chưa có gói nào đang bán.</p>

  const months = selectedMonths[packages[0].id] || 1
  const current = packages.find((p) => p.id === currentPackageId)
  // Gói gợi ý nổi bật: hạng ngay trên gói đang dùng
  const recommendedId = current ? packages.find((p) => p.tierLevel > current.tierLevel)?.id : null

  return (
    <section aria-labelledby="plans-title">
      <div className={styles.top}>
        <div>
          <h2 id="plans-title" className={styles.title}>Chọn hoặc đổi gói</h2>
          <p className={styles.lead}>Mua càng lâu, giá mỗi tháng càng thấp. Đơn chưa thanh toán có thể hủy bất cứ lúc nào.</p>
        </div>
        <div className={styles.seg} role="group" aria-label="Số tháng">
          {MONTHS.map((m) => (
            <button key={m} type="button" aria-pressed={months === m} className={months === m ? styles.on : ''} onClick={() => packages.forEach((p) => onSelectMonths(p.id, m))}>
              {m} tháng
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {packages.map((pkg) => {
          const quote = quotes[pkg.id]
          const total = quote?.totalAmount ?? pkg.monthlyPrice * months
          const perMonth = Math.round(total / months)
          const saving = quote?.longTermDiscountPct || 0
          const action = getAction(pkg)
          const secondary = getSecondaryAction?.(pkg)
          const upgrade = upgradeQuotes[pkg.id]
          const upQuote = upgrade?.find((q) => q.months === months)
          // Chỉ hiện khi số tháng đang chọn đã được phần còn lại trả hết (không còn gì để thanh toán)
          const credit = upQuote?.reason === 'ZERO_AMOUNT' ? getCreditUpgrade?.(pkg) : null
          const note = upgradeNote(upQuote, upgrade)
          const isCurrent = currentPackageId === pkg.id
          const isRecommended = recommendedId === pkg.id
          const filled = !credit && !action.secondary && !action.disabled && (isRecommended || !current)

          return (
            <article key={pkg.id} className={`${styles.card} ${isCurrent ? styles.current : ''} ${isRecommended ? styles.recommended : ''}`}>
              {isRecommended ? <span className={styles.tag}>Gợi ý</span> : null}
              <header className={styles.head}>
                <h3 className={styles.name}>{pkg.name}</h3>
                {isCurrent ? <span className={styles.badge}>Đang dùng</span> : null}
              </header>

              <p className={styles.price}>{formatVND(perMonth).replace(' đ', '')}<span>đ / tháng</span></p>
              <p className={styles.total}>
                {upQuote ? (
                  upQuote.canUpgrade
                    ? <>Thanh toán hôm nay: <strong>{formatVND(upQuote.amountDue)}</strong><br />Đã trừ {formatVND(upQuote.credit)} từ phần còn lại của gói hiện tại.</>
                    : <>Giá {months} tháng: <strong>{formatVND(upQuote.newTotal)}</strong></>
                ) : <>{months} tháng: <strong>{formatVND(total)}</strong>{saving > 0 ? <span className={styles.saving}> · tiết kiệm {saving}%</span> : null}</>}
              </p>

              <ul className={styles.benefits}>
                {packageBenefits(pkg).map((b) => <li key={b}><Check size={15} aria-hidden="true" />{b}</li>)}
              </ul>

              {note && !credit ? <p className={styles.note} role="note">{note}</p> : null}

              <div className={styles.buttons}>
                {credit ? <button type="button" className={styles.btnPrimary} onClick={credit.onClick}>Nâng cấp ngay, không trả thêm</button> : null}
                {credit && action.disabled ? null : (
                  <button type="button" className={filled ? styles.btnPrimary : styles.btnSecondary} disabled={action.disabled} onClick={action.onClick}>
                    {action.label}
                  </button>
                )}
                {secondary ? (
                  <button type="button" className={styles.btnSecondary} disabled={secondary.disabled} onClick={secondary.onClick}>
                    {secondary.label}
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
