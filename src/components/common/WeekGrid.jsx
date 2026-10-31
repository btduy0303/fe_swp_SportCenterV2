import React, { useEffect, useState } from 'react'
import { coachService } from '../../services/coachService'
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

// Giá trị của ô chọn tuần (yyyy-Www, tuần ISO bắt đầu từ thứ Hai)
function isoWeekOf(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7))
  const week = Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY_MS + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
function mondayOfIsoWeek(value) {
  const [year, week] = value.split('-W').map(Number)
  return addDays(mondayOf(new Date(year, 0, 4)), (week - 1) * 7)
}

const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

// Lịch tuần dạng bảng: hàng là khung giờ cố định của trung tâm, cột là thứ trong tuần.
// Trên màn hẹp bảng không vừa nên hiện danh sách theo ngày với cùng dữ liệu.
// items: null khi đang tải, hoặc [{ key, date: 'yyyy-mm-dd', start: 'HH:mm', end, kind, title, sub, status: { label, tone }, canceled, action }]
// tone: ok | warn | bad | muted
export default function WeekGrid({ monday, onMondayChange, items, error, emptyText = 'Tuần này chưa có buổi nào.' }) {
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

  const renderItem = (x) => (
    <div key={x.key} className={`${styles.item} ${x.canceled ? styles.canceled : ''}`}>
      <div className={styles.itemHead}>
        <span className={styles.tag}>{x.kind}</span>
        <span className={styles.time}>{x.start}–{x.end}</span>
      </div>
      <div className={styles.title}>{x.title}</div>
      {x.sub && <div className={styles.sub}>{x.sub}</div>}
      {x.status && <span className={styles.status} data-tone={x.status.tone}>{x.status.label}</span>}
      {x.action}
    </div>
  )

  const total = items ? items.length : 0
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <label className={styles.picker}>
          <span>Chọn tuần</span>
          <input type="week" value={isoWeekOf(monday)} onChange={(e) => e.target.value && onMondayChange(mondayOfIsoWeek(e.target.value))} />
        </label>
        <div className={styles.nav}>
          <button type="button" onClick={() => onMondayChange(addDays(monday, -7))}>Tuần trước</button>
          <button type="button" data-primary={isoDay(monday) === isoDay(thisMonday)} onClick={() => onMondayChange(thisMonday)}>Tuần hiện tại</button>
          <button type="button" onClick={() => onMondayChange(addDays(monday, 7))}>Tuần sau</button>
        </div>
        <p className={styles.range}>Tuần {days[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – {days[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
      </div>

      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!error && items === null && <p role="status" className={styles.muted}>Đang tải lịch...</p>}
      {!error && items && total === 0 && <p className={styles.muted}>{emptyText}</p>}

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
                      <span>{d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((s, rowIndex) => (
                  <tr key={s.id}>
                    <th scope="row" className={styles.slotCell}>
                      <strong>{s.slotNo}</strong>
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
                  <h3>{DAY_NAMES[i]}, {d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</h3>
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
