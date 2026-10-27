import React from 'react'
import { ROOMS } from '../../data/landing'
import { Reveal } from './landingHooks'

const MAX = Math.max(...ROOMS.map((r) => r.cap))

// Danh sách phòng và khu tập kèm thanh sức chứa
export default function FacilitySection() {
  return (
    <section className="light" id="co-so">
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">Cơ sở vật chất</span>
          <h2>8 phòng,<br />đủ chỗ tập</h2>
          <p className="lead">Mỗi phòng đúng một việc: hồ bơi, yoga, sân bóng, khu máy, phòng thể lực và phòng boxing.</p>
        </Reveal>
        <Reveal className="rooms">
          {ROOMS.map((r) => (
            <div className="room" key={r.name}>
              <b>{r.name}</b>
              <span>{r.floor} · {r.note}</span>
              <div className="cap">Sức chứa {r.cap} người<i><s style={{ '--w': (r.cap / MAX) * 100 }} /></i></div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
