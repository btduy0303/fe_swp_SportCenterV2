import React, { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react'
import { coachService } from '../../services/coachService'
import { dayMonth } from '../../utils/labels'
import styles from '../../css/common/WeekGrid.module.css'

const DAY_MS = 86400000
const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

export const isoDay = (d) => d.toLocaleDateString('sv-SE')
export const mondayOf = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}
export const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS)

// Số tuần theo chuẩn ISO (tuần có thứ Năm đầu tiên của năm là tuần 1) của tuần bắt đầu từ thứ Hai monday
export const isoWeek = (monday) => {
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3)
  const jan1 = new Date(thursday.getFullYear(), 0, 1)
  return { week: Math.floor((thursday - jan1) / (7 * DAY_MS)) + 1, year: thursday.getFullYear() }
}

const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

// Lịch tuần dạng bảng: hàng là khung giờ cố định của trung tâm, cột là thứ trong tuần.
// Trên màn hẹp bảng không vừa nên hiện danh sách theo ngày với cùng dữ liệu.
// items: null khi đang tải, hoặc [{ key, date: 'yyyy-mm-dd', start: 'HH:mm', end, kind, title, sub, status: { label, tone }, canceled, action }]
// tone: ok | warn | bad | muted
// legend: [[kind, tên]] để giải thích màu nhãn; bỏ trống thì không hiện chú giải
export default function WeekGrid({ monday, onMondayChange, items, error, emptyText = 'Tuần này chưa có buổi nào.', legend }) {
  const [slots, setSlots] = useState([])

  useEffect(() => {
    coachService.getTimeSlots()
      .then((rows) => setSlots(rows.filter((r) => r.active).sort((a, b) => a.slotNo - b.slotNo)))
      .catch(() => setSlots([]))
  }, [])

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const today = isoDay(new Date())
  const thisMonday = mondayOf(new Date())

  // Buổi khớp giờ bắt đầu của một khung thì vào hàng đó, lệch giờ thì vào khung gần nhất
  const rowOf = (item) => {
    if (!slots.length) return -1
    const at = minutes(item.start)
    let best = 0
    slots.forEach((s, i) => {
      if (Math.abs(minutes(String(s.startTime)) - at) < Math.abs(minutes(String(slots[best].startTime)) - at)) best = i
    })
    return best
  }
  const cell = (date, rowIndex) => (items || []).filter((x) => x.date === date && rowOf(x) === rowIndex)
  const dayItems = (date) => (items || []).filter((x) => x.date === date).sort((a, b) => a.start.localeCompare(b.start))

  // Màu thẻ theo trạng thái: ok xanh, warn vàng, bad đỏ, còn lại (chưa diễn ra) màu nhấn
  const renderItem = (x) => (
    <div key={x.key} className={`${styles.item} ${x.canceled ? styles.canceled : ''}`} data-tone={x.canceled ? 'bad' : x.status?.tone || 'next'}>
      <div className={styles.itemHead}>
        <span className={styles.title}>{x.title}</span>
        {x.status && <span className={styles.status}>{x.status.label}</span>}
      </div>
      <div className={styles.line}><Clock3 size={13} aria-hidden="true" /><span className={styles.time}>{x.start}–{x.end}</span><span className={styles.tag} data-kind={x.kind}>{x.kind}</span></div>
      {x.sub && <div className={styles.line}><MapPin size={13} aria-hidden="true" /><span className={styles.sub}>{x.sub}</span></div>}
      {x.action}
    </div>
  )

  const total = items ? items.length : 0
  const { week, year } = isoWeek(monday)
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <span className={styles.headIcon} aria-hidden="true"><CalendarDays size={20} /></span>
        <div className={styles.headText}>
          <p className={styles.headTitle}>Tuần {week}, {year}</p>
          <p className={styles.headMeta}>{dayMonth(days[0])} – {dayMonth(days[6])}/{days[6].getFullYear()}{items ? ` · ${total} buổi` : ''}</p>
        </div>
        <div className={styles.nav}>
          <button type="button" onClick={() => onMondayChange(addDays(monday, -7))}><ChevronLeft size={15} aria-hidden="true" />Tuần trước</button>
          <button type="button" data-primary={isoDay(monday) === isoDay(thisMonday)} onClick={() => onMondayChange(thisMonday)}>Tuần hiện tại</button>
          <button type="button" onClick={() => onMondayChange(addDays(monday, 7))}>Tuần sau<ChevronRight size={15} aria-hidden="true" /></button>
          <label className={styles.picker}><span className={styles.srOnly}>Xem tuần chứa ngày</span>
            <input type="date" aria-label="Xem tuần chứa ngày" value={isoDay(monday)} onChange={(e) => e.target.value && onMondayChange(mondayOf(new Date(`${e.target.value}T00:00:00`)))} />
          </label>
        </div>
      </div>

      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!error && items === null && <p role="status" className={styles.muted}>Đang tải lịch...</p>}
      {!error && items && total === 0 && <p className={styles.muted}>{emptyText}</p>}
      {legend && (<p className={styles.legend}>{legend.map(([kind, name]) => <span key={kind}><span className={styles.tag} data-kind={kind}>{kind}</span> {name}</span>)}<span>Ô trống là chưa có buổi</span></p>)}

      {!error && items && (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Lịch tuần, hàng là khung giờ, cột là thứ trong tuần</caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.slotHead}>Khung</th>
                  {days.map((d, i) => (
                    <th scope="col" key={isoDay(d)} data-today={isoDay(d) === today}>
                      {DAY_NAMES[i]}
                      <span>{dayMonth(d)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((s, rowIndex) => (
                  <tr key={s.id}>
                    <th scope="row" className={styles.slotCell}>
                      <small>SLOT</small><strong>{s.slotNo}</strong>
                      <span>{String(s.startTime).slice(0, 5)}–{String(s.endTime).slice(0, 5)}</span>
                    </th>
                    {days.map((d) => {
                      const date = isoDay(d)
                      const list = cell(date, rowIndex)
                      return (
                        <td key={date} data-today={date === today}>
                          {list.length === 0 ? <span className={styles.empty} aria-hidden="true">-</span> : list.map(renderItem)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.list}>
            {days.map((d, i) => {
              const date = isoDay(d)
              const list = dayItems(date)
              return (
                <section key={date} className={styles.day} data-today={date === today}>
                  <h3>{DAY_NAMES[i]}, {dayMonth(d)}</h3>
                  {list.length === 0 ? <p className={styles.muted}>Không có buổi nào.</p> : list.map(renderItem)}
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
