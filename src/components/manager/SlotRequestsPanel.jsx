import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import ReasonDialog from '../common/ReasonDialog'
import styles from '../../css/manager/ManagerDashboard.module.css'
import ui from '../../css/manager/ManagerUi.module.css'

const STATUS = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt, chờ trả tiền',
  PAID: 'Đã thanh toán',
  REJECTED: 'Đã từ chối',
  CANCELED: 'Hội viên hủy',
  EXPIRED: 'Hết hạn',
}
const WEEKDAY = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7']
const when = (v) => new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const hm = (t) => String(t).slice(0, 5)

// Ngày của từng buổi: buổi đầu rồi cách nhau đúng một tuần
function dates(firstDate, sessions) {
  const first = new Date(`${firstDate}T00:00:00`)
  return Array.from({ length: sessions }, (_, i) => {
    const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i * 7)
    return `${WEEKDAY[d.getDay()]} ${d.toLocaleDateString('vi-VN')}`
  })
}

// Yêu cầu 1-1 nhiều buổi của hội viên: duyệt cả chuỗi (hệ thống tự chọn phòng trống) hoặc từ chối kèm lý do
export default function SlotRequestsPanel({ onChanged }) {
  const { token } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState('PENDING')
  const [requests, setRequests] = useState([])
  const [errors, setErrors] = useState({})
  const [rejectTarget, setRejectTarget] = useState(null)

  const load = useCallback(async () => {
    try {
      setRequests(await managerService.getCoachRequests(token, status))
    } catch (err) {
      toast.error(err.message || 'Không thể tải yêu cầu 1-1')
    }
  }, [token, status])

  useEffect(() => {
    load()
  }, [load])

  // Một tuần vướng thì cả yêu cầu không duyệt được: giữ lại lý do ngay dưới yêu cầu để manager từ chối kèm lý do đó
  const approve = async (r) => {
    try {
      await managerService.approveCoachRequest(token, r.id)
      toast.success('Đã duyệt, hội viên được báo qua ứng dụng và email')
      setErrors((e) => ({ ...e, [r.id]: null }))
      load()
      onChanged()
    } catch (err) {
      setErrors((e) => ({ ...e, [r.id]: err.message || 'Duyệt thất bại' }))
    }
  }

  const reject = async (reason) => {
    const r = rejectTarget
    setRejectTarget(null)
    try {
      await managerService.rejectCoachRequest(token, r.id, reason)
      toast.success('Đã từ chối, hội viên được báo kèm lý do')
      load()
    } catch (err) {
      toast.error(err.message || 'Từ chối thất bại')
    }
  }

  return (
    <div className={styles.card}>
      <div className={ui.head}>
        <p className={ui.lead} style={{ margin: 0 }}>Yêu cầu 1-1 của hội viên: duyệt cả chuỗi hoặc từ chối.</p>
        <select className={styles.select} aria-label="Trạng thái yêu cầu" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {requests.length === 0 ? <p className={ui.empty}>Không có yêu cầu nào.</p> : (
        <div className={ui.list}>
          {requests.map((r) => (
            <article key={r.id} className={ui.row}>
              <div className={ui.main}>
                <p className={ui.name}>{r.memberName} · {r.sportName} với {r.coachName} · {r.sessions} buổi</p>
                <p className={ui.meta}>
                  {hm(r.startTime)} – {hm(r.endTime)} · {dates(r.firstDate, r.sessions).join(', ')}
                </p>
                <p className={ui.meta}>
                  {formatVND(r.payableTotal)}
                  {r.status === 'PENDING' ? ` · duyệt trước ${when(r.expiresAt)}` : ''}
                  {r.status === 'APPROVED' ? ` · hội viên trả trước ${when(r.expiresAt)}` : ''}
                  {r.status === 'REJECTED' && r.rejectReason ? ` · lý do: ${r.rejectReason}` : ''}
                </p>
                {errors[r.id] && <p className={ui.meta} role="alert" style={{ color: 'var(--danger, #b3261e)' }}>{errors[r.id]}</p>}
              </div>
              <div className={ui.side}>
                <span className={`${ui.badge} ${r.status === 'PAID' ? ui.good : r.status === 'PENDING' || r.status === 'APPROVED' ? '' : ui.off}`}>
                  {STATUS[r.status] || r.status}
                </span>
                {r.status === 'PENDING' && (
                  <>
                    <button type="button" className={ui.btn} onClick={() => approve(r)}>Duyệt</button>
                    <button type="button" className={ui.btnDanger} onClick={() => setRejectTarget(r)}>Từ chối</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ReasonDialog
        isOpen={!!rejectTarget}
        title="Từ chối yêu cầu 1-1"
        message={rejectTarget ? `Từ chối yêu cầu của ${rejectTarget.memberName}? Hội viên được báo kèm lý do và có thể gửi yêu cầu khác.` : ''}
        label="Lý do từ chối"
        confirmText="Từ chối"
        onConfirm={reject}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  )
}
