import React from 'react'
import { LoopVideo } from './landingHooks'

// Banner mở đầu: video nền, tiêu đề lớn, một câu nói trung tâm có gì và hai nút
export default function HeroBanner({ sports }) {
  return (
    <section className="hero" id="top">
      <LoopVideo src="/media/boxing.mp4" />
      <div className="shade" />
      <div className="wrap body">
        <h1>Rèn sức mạnh<em>Bứt giới hạn</em></h1>
        <p className="lead">
          {sports.length > 0 ? `${sports.map((s) => s.name).join(', ')} dưới một mái nhà.` : 'Nhiều môn thể thao dưới một mái nhà.'} Học theo lớp, kèm coach 1-1,
          chọn gói hội viên hợp với bạn.
        </p>
        <div className="cta">
          <a className="btn" href="#classes">Xem lớp đang mở</a>
          <a className="btn alt" href="#packages">Xem gói hội viên</a>
        </div>
      </div>
    </section>
  )
}
