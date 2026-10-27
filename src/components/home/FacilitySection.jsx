import React from 'react'
import { Reveal } from './landingHooks'

// Danh sách phòng và khu tập kèm thanh sức chứa
export default function FacilitySection({ rooms }) {
  if (!rooms.length) return null
  const max = Math.max(...rooms.map((r) => r.cap))
  return (
    <section className="light" id="co-so">
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">Cơ sở vật chất</span>
          <h2>{rooms.length} phòng,<br />đủ chỗ tập</h2>
          <p className="lead">Mỗi phòng phục vụ đúng một nhóm môn, sức chứa rõ ràng để buổi tập không quá đông.</p>
        </Reveal>
        <Reveal className="rooms">
          {rooms.map((r) => (
            <div className="room" key={r.name}>
              <b>{r.name}</b>
              <span>{r.floor} · {r.note}</span>
              <div className="cap">Sức chứa {r.cap} người<i><s style={{ '--w': (r.cap / max) * 100 }} /></i></div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
