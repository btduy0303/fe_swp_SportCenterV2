import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { perksOf } from '../../data/landing'
import { formatVND } from '../../utils/format'
import { Reveal } from './landingHooks'

// Bảng giá và quyền lợi các hạng gói, dữ liệu thật từ API
export default function PackageSection({ packages, loading, discounts }) {
  const { token } = useAuth() || {}

  return (
    <section id="packages" className="light">
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">4 hạng gói</span>
          <h2>Gói hội viên</h2>
          <p className="lead">Hạng càng cao, quyền lợi càng nhiều: đăng ký lớp sớm, giảm học phí, coach riêng, trợ lý AI.</p>
        </Reveal>

        {loading ? (
          <p className="lead">Đang tải gói hội viên...</p>
        ) : packages.length === 0 ? (
          <p className="lead">Chưa tải được danh sách gói. Vui lòng thử lại sau.</p>
        ) : (
          <div className="pk-grid">
            {packages.map((p, i) => {
              const hot = p.code === 'VUOT_DINH' || p.tierLevel === 3
              return (
                <Reveal key={p.id} delay={i * 90} className={`pk ${hot ? 'hot' : ''}`}>
                  {hot && <span className="badge">Phổ biến nhất</span>}
                  <span className="tag">{p.description || 'Quyền lợi theo hạng hội viên'}</span>
                  <h3>{p.name}</h3>
                  <div className="price">{formatVND(p.monthlyPrice)}<small> / tháng</small></div>
                  <ul>{perksOf(p).map((x) => <li key={x}>{x}</li>)}</ul>
                  <Link className={`btn ${hot ? '' : 'alt'}`} to={token ? '/member' : '/register'} style={{ marginTop: 'auto', textAlign: 'center' }}>
                    Chọn {p.name}
                  </Link>
                </Reveal>
              )
            })}
          </div>
        )}

        {discounts.length > 0 && (
        <Reveal className="disc">
          <h3>Mua càng dài, giảm càng nhiều</h3>
          <div className="bars">
            {discounts.map((d) => (
              <div className="bar" key={d.range}>
                <i style={{ '--pct': d.pct * 3.4 }}><b>{d.pct}%</b></i>
                {d.range}
              </div>
            ))}
          </div>
          <p className="note">Mức giảm theo số tháng mua gói. Giá cuối cùng hiển thị khi bạn chọn gói.</p>
        </Reveal>
        )}
      </div>
    </section>
  )
}
