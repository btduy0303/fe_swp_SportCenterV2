import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSingleFlight } from '../../hooks/useSingleFlight'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import { PAYMENT_METHOD, refundReasonVi } from '../../utils/labels'
import styles from '../../css/manager/ManagerRefunds.module.css'

const when = (v) => new Date(v).toLocaleDateString('vi-VN')

// Danh sách khoản hoàn tiền: chờ xử lý hoặc đã xong; xác nhận khi đã chuyển tiền cho hội viên.
// Khoản quá hạn (BE đánh dấu overdue) có viền đỏ và nằm trong tầm mắt trước.
export default function RefundsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [guard, busy] = useSingleFlight()
  const [status, setStatus] = useState('PENDING')
  const [refunds, setRefunds] = useState([])

  const load = useCallback(async () => {
    try {
      setRefunds(await managerService.getRefunds(token, status))
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách hoàn tiền')
    }
  }, [token, status, toast])

  useEffect(() => {
    load()
  }, [load])

  const complete = (id) => guard(async () => {
    try {
      await managerService.completeRefund(token, id)
      toast.success('Đã xác nhận hoàn tiền')
      load()
    } catch (err) {
      toast.error(err.message || 'Xác nhận hoàn tiền thất bại')
    }
  })

  const sorted = [...refunds].sort((a, b) => Number(!!b.overdue) - Number(!!a.overdue))

  return (
    <section aria-labelledby="refund-title">
      <p className={styles.lead} id="refund-title">Bấm "Xác nhận đã hoàn" sau khi đã trả tiền cho hội viên. Hệ thống ghi lại ai đã hoàn và lúc nào.</p>
      <div className={styles.chips} role="group" aria-label="Trạng thái">
        <button type="button" aria-pressed={status === 'PENDING'} className={status === 'PENDING' ? styles.on : ''} onClick={() => setStatus('PENDING')}>Chờ hoàn</button>
        <button type="button" aria-pressed={status === 'DONE'} className={status === 'DONE' ? styles.on : ''} onClick={() => setStatus('DONE')}>Đã hoàn</button>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>{status === 'PENDING' ? 'Không có khoản nào đang chờ hoàn.' : 'Chưa có khoản nào đã hoàn.'}</p>
      ) : sorted.map((r) => (
        <article key={r.id} className={`${styles.row} ${r.overdue ? styles.late : ''}`}>
          <div>
            <p className={styles.name}>{r.memberName}{r.overdue && <span className={styles.flag}>Quá hạn</span>}</p>
            <p className={styles.meta}>{PAYMENT_METHOD[r.method] || r.method} · {refundReasonVi(r.reason)}</p>
            <p className={styles.meta}>{r.memberEmail} · yêu cầu {when(r.requestedAt)} · {r.invoiceNumber}</p>
          </div>
          <span className={styles.amount}>{formatVND(r.amount)}</span>
          {r.status === 'PENDING'
            ? <button type="button" className={styles.btn} disabled={busy} onClick={() => complete(r.id)}>Xác nhận đã hoàn</button>
            : <span className={styles.done}>Đã hoàn{r.processedByName ? ` bởi ${r.processedByName}` : ''}</span>}
        </article>
      ))}
    </section>
  )
}
