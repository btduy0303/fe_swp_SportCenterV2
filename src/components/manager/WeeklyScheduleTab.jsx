import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { hhmm } from '../../utils/schedule'
import WeekGrid, { addDays, isoDay, mondayOf } from '../common/WeekGrid'
import styles from '../../css/manager/ManagerDashboard.module.css'

const clock = (v) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })

function managerSessionStatus(s) {
  if (s.canceled || (s.status && s.status.startsWith('CANCELED'))) return { label: 'Đã hủy', tone: 'bad' }
  const endIso = new Date(`${s.date}T${s.end}:00+07:00`).getTime()
  const isPast = !isNaN(endIso) && endIso <= Date.now()
  if (s.status === 'COMPLETED' || s.status === 'DONE' || isPast) return { label: 'Đã hoàn thành', tone: 'ok' }
  return { label: 'Sắp diễn ra', tone: 'next' }
}

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
          status: managerSessionStatus({ ...s, date: s.sessionDate, end: hhmm(s.endTime) }),
        })),
        // Chỉ hiện buổi 1-1 đã có người giữ chỗ hoặc đã đặt
        ...slots.filter((s) => s.status === 'HELD' || s.status === 'BOOKED').map((s) => {
          const startStr = clock(s.startAt)
          const endStr = clock(s.endAt)
          const dateStr = isoDay(new Date(s.startAt))
          const isPast = new Date(s.endAt).getTime() <= Date.now()
          let statusObj
          if (s.status === 'HELD') {
            statusObj = { label: 'Chờ thanh toán', tone: 'warn' }
          } else if (isPast) {
            statusObj = { label: '1-1 đã xong', tone: 'ok' }
          } else {
            statusObj = { label: 'Buổi 1-1', tone: 'one-on-one' }
          }
          return {
            key: `o${s.id}`, date: dateStr, start: startStr, end: endStr, kind: '1-1',
            title: `${s.sportName || 'Buổi 1-1'} · ${s.memberName}`, sub: [s.roomName, `Coach ${s.coachName}`].filter(Boolean).join(' · '),
            status: statusObj,
          }
        }),
      ]))
      .catch((err) => toast.error(err.message || 'Không thể tải lịch tuần'))
  }, [token, toast, monday])

  return (
    <div className={styles.card}>
      <WeekGrid monday={monday} onMondayChange={setMonday} items={items} emptyText="Tuần này chưa có buổi lớp hay buổi 1-1 nào." />
    </div>
  )
}
