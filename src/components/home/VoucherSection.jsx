import React from 'react'
import { Reveal } from './landingHooks'

// Các loại voucher hệ thống tự tặng
export default function VoucherSection({ vouchers }) {
  if (!vouchers.length) return null
  return (
    <section id="uu-dai">
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">Ưu đãi</span>
          <h2>Voucher tự tặng</h2>
          <p className="lead">Không cần săn mã. Hệ thống tự cộng voucher vào tài khoản khi bạn đủ điều kiện, và sinh nhật còn có quà theo hạng gói.</p>
        </Reveal>
        <div className="vc-grid">
          {vouchers.map((v, i) => (
            <Reveal key={v.name} delay={i * 80} className="vc">
              <div className="pct"><span>{v.pct}%<small>GIẢM</small></span></div>
              <div>
                <h3>{v.name}</h3>
                <p>{v.when}</p>
                <em>Áp dụng: {v.on} · hạn {v.days} ngày</em>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
