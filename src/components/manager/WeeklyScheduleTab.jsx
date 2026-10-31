import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { hhmm } from '../../utils/schedule'
import WeekGrid, { addDays, isoDay, mondayOf } from '../common/WeekGrid'
import styles from '../../css/manager/ManagerDashboard.module.css'

const clock = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })

// Lịch tuần của trung tâm: mọi buổi lớp và buổi 1-1 đã có người đặt, theo khung giờ và thứ
export default function WeeklyScheduleTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [monday, setMonday] = useState(() => mondayOf(new Date()))

  useEffect(() => {
    setItems(null)
    Promise.all([
      managerService.getSessionsBetween(token, isoDay(monday), isoDay(addDays(monday, 6))),
      managerService.getCoachSlots(token, { from: monday.toISOString(), to: addDays(monday, 7).toISOString() }),
    ])
      .then(([sessions, slots]) => setItems([
        ...sessions.map((s) => ({
          key: `c${s.id}`, date: s.sessionDate, start: hhmm(s.startTime), end: hhmm(s.endTime), kind: s.makeup ? 'Bù' : 'Lớp',
          title: s.className, sub: `${s.roomName} · Coach ${s.coachName}`, canceled: s.status.startsWith('CANCELED'),
          status: s.status.startsWith('CANCELED') ? { label: 'Đã hủy', tone: 'bad' } : null,
        })),
        // Suất 1-1 còn trống không chiếm lịch thật, chỉ hiện buổi đã có người giữ hoặc đặt
        ...slots.filter((s) => s.status === 'HELD' || s.status === 'BOOKED').map((s) => ({
          key: `o${s.id}`, date: isoDay(new Date(s.startAt)), start: clock(s.startAt), end: clock(s.endAt), kind: '1-1',
          title: `${s.sportName || 'Buổi 1-1'} · ${s.memberName}`, sub: [s.roomName, `Coach ${s.coachName}`].filter(Boolean).join(' · '),
          status: s.status === 'HELD' ? { label: 'Chờ thanh toán', tone: 'warn' } : { label: 'Đã đặt', tone: 'ok' },
        })),
      ]))
      .catch((err) => toast.error(err.message || 'Không thể tải lịch tuần'))
  }, [token, toast, monday])

  return (
    <div className={styles.card}>
      <WeekGrid monday={monday} onMondayChange={setMonday} items={items} emptyText="Tuần này chưa có buổi lớp hay buổi 1-1 nào." />
    </div>
  )
}
