import React from 'react'
import { formatVND } from '../../utils/format'
import { Reveal } from './landingHooks'

// Huấn luyện 1-1 và cách coach đánh giá học viên
export default function CoachSection({ price, minSessions, packages, rescheduleHours }) {
  // Giảm giá buổi 1-1 theo hạng gói, lấy từ API gói
  const discounts = packages.filter((p) => p.oneOnOneDiscountPct > 0).map((p) => `${p.name} giảm ${p.oneOnOneDiscountPct}%`)
  return (
    <section id="coach" className="light">
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">Đội ngũ Coach</span>
          <h2>Có người<br />kèm riêng</h2>
        </Reveal>
        <div className="two">
          <Reveal className="card sun">
            <h3>Huấn luyện 1-1</h3>
            <p style={{ marginTop: 8 }}>Mua gói nhiều buổi với coach riêng, tự chọn giờ học mỗi tuần, một ngày học được nhiều khung giờ. Gói càng dài, mỗi buổi càng rẻ.</p>
            {price != null && (
              <div style={{ marginTop: 14 }}>
                <div className="rank"><b>Gói từ {minSessions} buổi</b><span>chỉ từ {formatVND(price)} / buổi</span></div>
              </div>
            )}
            <p style={{ marginTop: 12, fontSize: '.9rem' }}>
              {rescheduleHours ? `Báo dời lịch trước giờ học ${rescheduleHours} giờ thì giữ nguyên buổi. ` : ''}
              {discounts.length > 0 && `${discounts.join(', ')} cho buổi 1-1.`}
            </p>
          </Reveal>
          <Reveal className="card" delay={120}>
            <h3><span className="pulse" />Coach đánh giá sau mỗi buổi</h3>
            <p style={{ marginTop: 8 }}>Coach ghi nhận tiến bộ của bạn qua từng buổi học để bài tập luôn đúng sức.</p>
            <ul>
              <li><b>Theo dõi liên tục:</b> mỗi buổi một nhận xét, không cần thi đo riêng.</li>
              <li><b>Bài tập riêng:</b> coach soạn cho Vượt Đỉnh và Quán Quân.</li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
