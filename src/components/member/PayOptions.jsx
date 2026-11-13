import React from 'react'
import { QrCode, Banknote, Clock } from 'lucide-react'
import styles from '../../css/member/PayOptions.module.css'

const fmt = (v) => new Date(v).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })

// Thời gian còn lại đến hạn, viết gọn: "còn 23 giờ", "còn 40 phút"
function remaining(deadline) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return 'đã quá hạn, đơn sẽ tự hủy trong ít phút'
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `còn ${minutes} phút`
  const hours = Math.floor(minutes / 60)
  return hours < 48 ? `còn ${hours} giờ` : `còn ${Math.floor(hours / 24)} ngày`
}

// Hai cách trả tiền cho một đơn chờ thanh toán (gói, lớp, buổi 1-1) cùng hạn thanh toán chung.
// whatHappens: câu nói rõ quá hạn thì sao (trả chỗ, nhả buổi...).
export default function PayOptions({ deadline, whatHappens, busy, onPay, onCheck, children }) {
  const soon = deadline && new Date(deadline).getTime() - Date.now() < 3 * 3600 * 1000
  return (
    <div className={styles.box}>
      {deadline ? (
        <p className={`${styles.deadline} ${soon ? styles.soon : ''}`}>
          <Clock size={16} aria-hidden="true" />
          <span>Hạn thanh toán: <b>{fmt(deadline)}</b> ({remaining(deadline)}). {whatHappens}</span>
        </p>
      ) : null}
      {children}
      <div className={styles.ways}>
        <div className={styles.way}>
          <strong><QrCode size={16} aria-hidden="true" />Thanh toán online</strong>
          <p>Quét mã QR bằng app ngân hàng. Mỗi mã dùng được 15 phút, hết mã thì bấm tạo mã mới, miễn là còn trong hạn.</p>
          <div className={styles.buttons}>
            <button type="button" className={styles.primary} disabled={busy} onClick={onPay}>Thanh toán online</button>
            <button type="button" className={styles.secondary} disabled={busy} onClick={onCheck}>Tôi đã thanh toán</button>
          </div>
        </div>
        <div className={styles.way}>
          <strong><Banknote size={16} aria-hidden="true" />Tiền mặt tại quầy</strong>
          <p>Đến quầy lễ tân trước hạn và báo họ tên hoặc email. Lễ tân thu tiền đúng đơn này và xác nhận ngay, bạn không cần bấm gì thêm.</p>
        </div>
      </div>
    </div>
  )
}
