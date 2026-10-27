import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { STEPS } from '../../data/landing'
import { Reveal } from './landingHooks'

// 3 bước bắt đầu và lời kêu gọi cuối trang
export default function StepsSection() {
  const { token } = useAuth() || {}

  return (
    <section id="bat-dau">
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">Bắt đầu</span>
          <h2>3 bước<br />là vào tập</h2>
        </Reveal>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 100} className="step">
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="final">
          <h2>Vào G6 hôm nay</h2>
          <p>Tạo tài khoản mất chưa tới một phút.</p>
          {token
            ? <a className="btn" href="#classes">Xem lớp đang mở</a>
            : <Link className="btn" to="/register">Đăng ký ngay</Link>}
        </Reveal>
      </div>
    </section>
  )
}
