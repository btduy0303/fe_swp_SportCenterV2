import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { memberService } from '../../services/memberService'
import { bookingService } from '../../services/bookingService'
import { useToast } from '../../context/ToastContext'
import { formatVND } from '../../utils/format'
import ConfirmModal from '../common/ConfirmModal'
import WeekGrid, { addDays, isoDay, mondayOf } from '../common/WeekGrid'
import styles from '../../css/member/MemberDashboard.module.css'

const dmy = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('vi-VN')

// Trạng thái hiển thị của một buổi (buổi lớp đã lên lịch thì không cần nhãn)
function statusOf(it) {
  if (it.type === 'ONE_ON_ONE') return { label: 'Đã đặt', tone: 'ok' }
  if (it.status === 'CANCELED_BY_CENTER') return { label: 'Trung tâm hủy', tone: 'bad' }
  if (it.declined) return { label: 'Đã báo vắng', tone: 'warn' }
  if (it.status === 'DONE') return { label: 'Đã học', tone: 'ok' }
  return null
}

// Thời khóa biểu của hội viên theo tuần, gộp buổi lớp, buổi học bù và buổi 1-1
export default function MemberTimetable() {
  const { token } = useAuth()
  const toast = useToast()
  const [monday, setMonday] = useState(() => mondayOf(new Date()))
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [declining, setDeclining] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setRows(null)
    try {
      setRows(await memberService.getTimetable(token, isoDay(monday), isoDay(addDays(monday, 6))))
    } catch (err) {
      setError(err.message || 'Không thể tải thời khóa biểu')
    }
  }, [token, monday])

  useEffect(() => {
    load()
  }, [load])

  // BR-MKP-03: không đi được buổi học bù thì báo trước, được hoàn tiền một buổi, vẫn học các buổi còn lại
  const decline = async () => {
    const it = declining
    setDeclining(null)
    try {
      const res = await bookingService.declineSession(token, it.refId)
      toast.success(res.refundTotal > 0 ? `Đã báo vắng, hoàn ${formatVND(res.refundTotal)}` : 'Đã báo vắng buổi học bù')
      load()
    } catch (err) {
      toast.error(err.message || 'Báo vắng thất bại')
    }
  }

  const items = rows && rows.map((it) => ({
    key: `${it.type}-${it.refId}`,
    date: it.date,
    start: it.startTime,
    end: it.endTime,
    kind: it.type === 'ONE_ON_ONE' ? '1-1' : it.makeup ? 'Bù' : 'Lớp',
    title: it.title,
    sub: [it.roomName, it.coachName && `Coach ${it.coachName}`].filter(Boolean).join(' · '),
    status: statusOf(it),
    canceled: it.status === 'CANCELED_BY_CENTER',
    action: it.makeup && !it.declined && it.status === 'SCHEDULED'
      ? <button type="button" onClick={() => setDeclining(it)}>Không đi được</button> : null,
  }))

  return (
    <div className={styles.card}>
      <WeekGrid monday={monday} onMondayChange={setMonday} items={items} error={error} emptyText="Tuần này bạn chưa có buổi học hay buổi 1-1 nào." />
      <ConfirmModal
        isOpen={!!declining}
        title="Báo không đi buổi học bù"
        message={declining ? `Bạn không đi buổi bù ${declining.title} ngày ${dmy(declining.date)}? Trung tâm hoàn tiền một buổi, bạn vẫn học các buổi còn lại.` : ''}
        confirmText="Xác nhận"
        type="danger"
        onConfirm={decline}
        onCancel={() => setDeclining(null)}
      />
    </div>
  )
}
