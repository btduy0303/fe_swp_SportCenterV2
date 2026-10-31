import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { CountUp, LoopVideo } from './landingHooks'

// Banner mở đầu: video nền, tiêu đề lớn và số liệu nổi bật
export default function HeroBanner({ stats, sports }) {
  const { token } = useAuth() || {}

  return (
    <section className="hero" id="top">
      <LoopVideo src="/media/boxing.mp4" />
      <div className="shade" />
      <div className="wrap body">
        <span className="eyebrow">G6 Sport Center</span>
        <h1>Rèn sức mạnh<em>Bứt giới hạn</em></h1>
        <p className="lead">
          {sports.length > 0 ? `${sports.map((s) => s.name).join(', ')} dưới một mái nhà.` : 'Nhiều môn thể thao dưới một mái nhà.'} Học theo lớp, kèm coach 1-1,
          chọn gói hội viên hợp với bạn.
        </p>
        <div className="cta">
          {token
            ? <a className="btn" href="#classes">Xem lớp đang mở</a>
            : <Link className="btn" to="/register">Đăng ký ngay</Link>}
          <a className="btn alt" href="#packages">Xem gói hội viên</a>
        </div>
      </div>
      {stats.length > 0 && <div className="stats">
        {stats.map((s) => (
          <div key={s.label}>
            <b><CountUp to={s.value} /></b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>}
    </section>
  )
}
