import React from 'react'
import { Reveal } from './landingHooks'

// 8 khung giờ cố định của trung tâm; mỗi ô sáng lần lượt
export default function ScheduleSection({ slots, hours, slotMinutes, bufferMinutes }) {
  if (!slots.length) return null
  return (
    <section id="schedule" className="sched">
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">Giờ cố định</span>
          <h2>{slots.length} khung giờ<br />mỗi ngày</h2>
          <p className="lead">Lớp học và buổi 1-1 đều xếp theo các khung giờ cố định. Dễ nhớ, không lệch giờ.</p>
        </Reveal>
        <div className="slots">
          {slots.map(([a, b], i) => (
            <div className="slot" key={a} style={{ '--i': i }}>
              <em>Khung {i + 1}</em>
              <b>{a}</b>
              <span>đến {b}</span>
            </div>
          ))}
        </div>
        <div className="meta">
          {hours && <span>Mở cửa {hours}</span>}
          <span>Mỗi khung {slotMinutes} phút</span>
          {bufferMinutes > 0 && <span>Nghỉ {bufferMinutes} phút giữa hai khung</span>}
        </div>
      </div>
    </section>
  )
}
