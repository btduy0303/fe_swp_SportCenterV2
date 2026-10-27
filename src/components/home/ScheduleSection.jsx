import React from 'react'
import { SLOTS } from '../../data/landing'
import { Reveal } from './landingHooks'

// 8 khung giờ cố định của trung tâm; mỗi ô sáng lần lượt
export default function ScheduleSection() {
  return (
    <section id="schedule">
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">Giờ cố định</span>
          <h2>8 khung giờ<br />mỗi ngày</h2>
          <p className="lead">Lớp học và buổi 1-1 đều xếp theo các khung giờ cố định. Dễ nhớ, không lệch giờ.</p>
        </Reveal>
        <div className="slots">
          {SLOTS.map(([a, b], i) => (
            <div className="slot" key={a} style={{ '--i': i }}>
              <em>Khung {i + 1}</em>
              <b>{a}</b>
              <span>đến {b}</span>
            </div>
          ))}
        </div>
        <div className="meta">
          <span>Mở cửa 06:00 – 22:00</span>
          <span>Mỗi khung 105 phút</span>
          <span>Nghỉ 15 phút giữa hai khung</span>
        </div>
      </div>
    </section>
  )
}
