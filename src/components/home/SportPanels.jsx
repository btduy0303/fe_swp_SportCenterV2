import React from 'react'
import { LoopVideo, Reveal } from './landingHooks'

// 7 dải môn tập, mỗi dải một video; rê chuột để dải nở ra
export default function SportPanels({ sports }) {
  if (!sports.length) return null
  return (
    <>
      <section id="mon-tap" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <Reveal className="head">
            <span className="eyebrow">{sports.length} môn</span>
            <h2>Chọn môn<br />bạn mê</h2>
            <p className="lead">Mỗi môn có phòng riêng, coach đúng môn và lớp cho người mới lẫn người đã quen. Rê chuột vào từng môn để xem.</p>
          </Reveal>
        </div>
      </section>
      <div className="panels">
        {sports.map((s, i) => (
          <div className="panel" key={s.id} tabIndex={0}>
            {s.video && <LoopVideo src={s.video} />}
            <div className="shade" />
            <div className="txt">
              <span className="no">0{i + 1}</span>
              <h3>{s.name}</h3>
              <div className="more">
                <p>{s.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
