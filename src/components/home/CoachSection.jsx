import React from 'react'
import { formatVND } from '../../utils/format'
import { Reveal } from './landingHooks'

// Huấn luyện 1-1 và cách coach đánh giá học viên
export default function CoachSection({ ranks, packages, refundHours }) {
  // Giảm giá buổi 1-1 theo hạng gói, lấy từ API gói
  const discounts = packages.filter((p) => p.oneOnOneDiscountPct > 0).map((p) => `${p.name} giảm ${p.oneOnOneDiscountPct}%`)
  return (
    <section id="coach" className="light">
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">Coach kèm cặp</span>
          <h2>Có người<br />kèm riêng</h2>
        </Reveal>
        <div className="two">
          <Reveal className="card sun">
            <h3>Huấn luyện 1-1</h3>
            <p style={{ marginTop: 8 }}>Đặt coach riêng, buổi 60 phút. Giá theo hạng coach.</p>
            <div style={{ marginTop: 14 }}>
              {ranks.map((r) => (
                <div className="rank" key={r.rank}><b>{r.rank}</b><span>{formatVND(r.price)} / buổi</span></div>
              ))}
            </div>
            <p style={{ marginTop: 12, fontSize: '.9rem' }}>
              {refundHours ? `Hủy trước giờ học ${refundHours} giờ được hoàn tiền. ` : ''}
              {discounts.length > 0 && `${discounts.join(', ')} cho buổi 1-1.`}
            </p>
          </Reveal>
          <Reveal className="card" delay={120}>
            <h3><span className="pulse" />Coach đánh giá sau mỗi buổi</h3>
            <p style={{ marginTop: 8 }}>Coach ghi nhận tiến bộ của bạn qua từng buổi học để bài tập luôn đúng sức.</p>
            <ul>
              <li><b>Theo dõi liên tục:</b> mỗi buổi một nhận xét, không cần thi đo riêng.</li>
              <li><b>Bài tập riêng:</b> coach soạn cho Vượt Đỉnh và Quán Quân.</li>
              <li><b>Học xong lớp:</b> nhận voucher cho lớp kế tiếp.</li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
