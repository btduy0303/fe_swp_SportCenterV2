import React, { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../context/AuthContext'
import { receptionistService } from '../../services/receptionistService'
import { formatVND } from '../../utils/format'
import styles from '../../css/receptionist/Reception.module.css'

const POLL_MS = 4000

// Thu bằng QR tại quầy: tạo link PayOS cho đơn, hiện mã QR cho khách quét, hỏi PayOS mỗi vài giây
// cho tới khi khách trả xong (hoặc hết hạn). kind: subscriptions | class-registrations | coach-requests
export default function CounterQr({ kind, id, label, amount, onPaid, onClose }) {
  const { token } = useAuth()
  const [link, setLink] = useState(null)
  const [error, setError] = useState('')
  const done = useRef(false)

  useEffect(() => {
    let alive = true
    receptionistService.startQrPayment(token, kind, id)
      .then((res) => { if (alive) setLink(res) })
      .catch((err) => { if (alive) setError(err.message || 'Không tạo được mã QR') })
    return () => { alive = false }
  }, [token, kind, id])

  useEffect(() => {
    if (!link) return undefined
    const timer = setInterval(async () => {
      try {
        const res = await receptionistService.checkQrPayment(token, kind, id)
        if (res?.paymentStatus === 'SUCCESS' && !done.current) {
          done.current = true
          onPaid()
        } else if (['FAILED', 'CANCELED', 'EXPIRED'].includes(res?.paymentStatus)) {
          setError('Mã QR đã hết hạn hoặc bị hủy, hãy đóng rồi tạo mã mới')
        }
      } catch {
        // lần hỏi này lỗi thì lần sau hỏi lại
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [link, token, kind, id, onPaid])

  return (
    <div className={styles.qrOverlay} onClick={onClose}>
      <div className={styles.qrBox} role="dialog" aria-modal="true" aria-label="Thu bằng QR" onClick={(e) => e.stopPropagation()}>
        <h3>Thu bằng QR: {label}</h3>
        <p className={styles.amount}>{formatVND(amount)}</p>
        {error ? <p role="alert">{error}</p>
          : !link ? <p>Đang tạo mã QR...</p>
            : link.checkoutUrl ? (
              <>
                <QRCodeSVG value={link.checkoutUrl} size={240} marginSize={2} />
                <p className={styles.meta}>Khách quét mã bằng camera điện thoại, trang thanh toán mở ra rồi trả bằng app ngân hàng. Màn hình này tự cập nhật khi tiền về.</p>
                <p className={styles.meta}>Mã hết hạn lúc {new Date(link.expiresAt).toLocaleTimeString('vi-VN')}</p>
              </>
            ) : <p>Đơn này không cần thanh toán.</p>}
        <button type="button" className={styles.btn} onClick={onClose}>Đóng</button>
      </div>
    </div>
  )
}
