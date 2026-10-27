import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { STATS } from '../../data/landing'
import { CountUp, LoopVideo } from './landingHooks'

// Banner mở đầu: video nền, tiêu đề lớn và số liệu nổi bật
export default function HeroBanner() {
  const { token } = useAuth() || {}

  return (
    <section className="hero" id="top">
      <LoopVideo src="/media/boxing.mp4" />
      <div className="shade" />
      <span className="rec"><i />LIVE TẠI G6</span>
      <div className="wrap body">
        <span className="eyebrow">G6 Sport Center</span>
        <h1>Rèn sức mạnh<em>Bứt giới hạn</em></h1>
        <p className="lead">
          Bơi lội, yoga, bóng chuyền, cầu lông, thể lực, zumba, boxing dưới một mái nhà. Học theo lớp, kèm coach 1-1,
          chọn gói hội viên hợp với bạn.
        </p>
        <div className="cta">
          {token
            ? <a className="btn" href="#classes">Xem lớp đang mở</a>
            : <Link className="btn" to="/register">Đăng ký ngay</Link>}
          <a className="btn alt" href="#packages">Xem gói hội viên</a>
        </div>
      </div>
      <div className="stats">
        {STATS.map((s) => (
          <div key={s.label}>
            <b><CountUp to={s.value} /></b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
