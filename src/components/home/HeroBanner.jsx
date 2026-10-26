import React from 'react'
import styles from '../../css/home/HeroBanner.module.css'


// Khối banner giới thiệu và thống kê mở đầu trang chủ
export default function HeroBanner() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroGlow}></div>
      <div className={styles.heroContent}>
        <div className={styles.heroPill}>
          Hệ Thống Quản Lý Thể Thao Đạt Chuẩn
        </div>

        <h1 className={styles.heroTitle}>
          Nâng Tầm Thể Chất Với <br />
          <span className={styles.gradientText}>Không Gian Luyện Tập Hiện Đại</span>
        </h1>

        <p className={styles.heroSubtitle}>
          Trải nghiệm các bộ môn đa dạng từ Bơi lội, Yoga, Boxing đến Bóng chuyền.
          Đội ngũ Huấn luyện viên tận tâm cùng lịch tập cố định khoa học mỗi ngày.
        </p>

        <div className={styles.heroCta}>
          <a href="#packages" className={styles.btnPrimary}>Xem Bảng Giá Gói</a>
          <a href="#classes" className={styles.btnSecondary}>Khám Phá Lớp Học</a>
        </div>

        {/* Các chỉ số hoạt động của trung tâm thể thao */}
        <div className={styles.heroStats}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>06:00 - 22:00</span>
            <span className={styles.statLabel}>Giờ Mở Cửa Hằng Ngày</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>8 Khung Giờ</span>
            <span className={styles.statLabel}>Tiết Học 105 Phút Cố Định</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>4 Hạng Gói</span>
            <span className={styles.statLabel}>Đặc Quyền Hội Viên Riêng</span>
          </div>
        </div>
      </div>
    </section>
  )
}
