import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { formatVND } from '../../utils/format'
import { sessionPlan, slotsByWeekday, weeklyText } from '../../utils/sessionDates'
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

const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

// Thời điểm từng buổi: các buổi còn sống nếu đã được tạo (đúng cả khi đã dời), chưa có thì tính từ các thứ hội viên chọn
function sessionTimes(r) {
  const live = (r.slots || []).filter((s) => s.status !== 'CANCELED')
  if (live.length > 0) return live.map((s) => new Date(s.startAt))
  const slotStart = Object.fromEntries((r.days || []).map((d) => [d.timeSlotId, String(d.startTime).slice(0, 5)]))
  return sessionPlan(r.firstDate, slotsByWeekday(r.days), r.sessions).map((p) => {
    const [h, m] = (slotStart[p.timeSlotId] || '00:00').split(':').map(Number)
    const d = new Date(p.date)
    d.setHours(h, m)
    return d
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
  // Coach đang hoạt động kèm môn dạy, để xếp coach cho yêu cầu hội viên nhờ trung tâm chọn; pick: { requestId: coachId }
  const [coaches, setCoaches] = useState([])
  const [pick, setPick] = useState({})

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

  useEffect(() => {
    managerService.getAccounts(token)
      .then((a) => setCoaches(a.filter((u) => u.role === 'COACH' && (u.active ?? u.isActive) !== false)))
      .catch(() => {})
  }, [token])

  // Một tuần vướng thì cả yêu cầu không duyệt được: giữ lại lý do ngay dưới yêu cầu để manager từ chối kèm lý do đó
  const approve = async (r) => {
    try {
      await managerService.approveCoachRequest(token, r.id, r.coachId ? null : Number(pick[r.id]))
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
                {(() => {
                  const times = sessionTimes(r)
                  return (
                    <>
                      <p className={ui.name}>{r.memberName} · {r.packageName || r.sportName}</p>
                      <p className={ui.meta}>
                        {r.coachName ? `Coach ${r.coachName}` : 'Nhờ trung tâm xếp coach'} · {r.sessions} buổi
                        {times.length ? ` · ${dm(times[0])} → ${dm(times.at(-1))}` : ''} · mỗi tuần {weeklyText(r.days)}
                      </p>
                      {times.length > 0 && (
                        <details className={ui.meta}>
                          <summary style={{ cursor: 'pointer', width: 'fit-content' }}>Xem {times.length} ngày học</summary>
                          <p style={{ margin: '0.35rem 0 0', lineHeight: 1.6 }}>
                            {times.map((d) => `${WEEKDAY[d.getDay()]} ${dm(d)} ${d.toTimeString().slice(0, 5)}`).join(' · ')}
                          </p>
                        </details>
                      )}
                    </>
                  )
                })()}
                <p className={ui.meta}>
                  <b>{formatVND(r.payableTotal)}</b>
                  {r.status === 'PENDING' ? ` · duyệt trước ${when(r.expiresAt)}` : ''}
                  {r.status === 'APPROVED' ? ` · hội viên trả trước ${when(r.expiresAt)}` : ''}
                  {r.status === 'PAID' ? ` · đã học ${(r.slots || []).filter((s) => s.status === 'BOOKED' && new Date(s.endAt) < new Date()).length}/${r.sessions} buổi` : ''}
                  {r.status === 'REJECTED' && r.rejectReason ? ` · lý do: ${r.rejectReason}` : ''}
                </p>
                {errors[r.id] && <p className={ui.meta} role="alert" style={{ color: 'var(--danger, #b3261e)' }}>{errors[r.id]}</p>}
              </div>
              <div className={ui.side}>
                <span className={`${ui.badge} ${r.status === 'PAID' ? ui.good : r.status === 'PENDING' || r.status === 'APPROVED' ? '' : ui.off}`}>
                  {STATUS[r.status] || r.status}
                </span>
                {r.status === 'PENDING' && !r.coachId && (
                  <select className={styles.select} style={{ width: 'auto', minWidth: '12rem' }} aria-label="Chọn coach cho yêu cầu này" value={pick[r.id] || ''} onChange={(e) => setPick((p) => ({ ...p, [r.id]: e.target.value }))}>
                    <option value="">Chọn coach</option>
                    {coaches.filter((c) => (c.sports || []).some((s) => s.id === r.sportId)).map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                  </select>
                )}
                {r.status === 'PENDING' && (
                  <>
                    <button type="button" className={ui.btn} disabled={!r.coachId && !pick[r.id]} onClick={() => approve(r)}>Duyệt</button>
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
