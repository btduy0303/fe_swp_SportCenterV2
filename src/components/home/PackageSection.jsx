import React from 'react'
import { formatVND } from '../../utils/format'
import styles from '../../css/home/PackageSection.module.css'


// Khu vực bảng giá và quyền lợi các gói hội viên
export default function PackageSection({ packages, loading }) {

  return (
    <section id="packages" className={styles.section}>
      <div className={styles.header}>
        <div className={styles.label}>Bảng Quyền Lợi</div>
        <h2 className={styles.title}>Gói Tập Hội Viên</h2>
      </div>

      {loading ? (
        <p className={styles.loadingText}>Đang tải dữ liệu gói hội viên...</p>
      ) : (
        <div className={styles.grid}>
          {packages.map((pkg) => {
            // Đánh dấu gói nổi bật (ví dụ gói Vượt Đỉnh)
            const isHighlight = pkg.code === 'VUOT_DINH' || pkg.tierLevel === 3

            return (
              <div
                key={pkg.id}
                className={`${styles.card} ${isHighlight ? styles.cardHighlight : ''}`}
              >
                {isHighlight && (
                  <span className={styles.badgePopular}>Phổ Biến Nhất</span>
                )}

                <div className={styles.pkgHeader}>
                  <h3 className={styles.pkgName}>{pkg.name}</h3>
                  <p className={styles.pkgDesc}>
                    {pkg.description || 'Quyền lợi chuẩn theo hạng hội viên'}
                  </p>
                </div>

                <div className={styles.priceWrapper}>
                  <span className={styles.priceVal}>{formatVND(pkg.monthlyPrice)}</span>
                  <span className={styles.priceUnit}>/ tháng</span>
                </div>

                <ul className={styles.features}>
                  <li className={styles.featureItem}>
                    <span className={styles.bullet}>•</span>
                    <span>Đăng ký lớp sớm trước {pkg.earlyRegisterDays} ngày</span>
                  </li>
                  <li className={styles.featureItem}>
                    <span className={styles.bullet}>•</span>
                    <span>Giảm học phí lớp: {pkg.tuitionDiscountPct}%</span>
                  </li>
                  <li className={styles.featureItem}>
                    <span className={styles.bullet}>•</span>
                    <span>Giảm học phí 1-1 với HLV: {pkg.oneOnOneDiscountPct}%</span>
                  </li>
                  <li className={styles.featureItem}>
                    <span className={styles.bullet}>•</span>
                    <span>Hỗ trợ AI: {pkg.aiLevel === 'NONE' ? 'Cơ bản' : pkg.aiLevel === 'LIMITED' ? 'Có giới hạn' : 'Không giới hạn'}</span>
                  </li>
                  {pkg.assessmentEveryMonths && (
                    <li className={styles.featureItem}>
                      <span className={styles.bullet}>•</span>
                      <span>Đánh giá thể lực mỗi {pkg.assessmentEveryMonths} tháng</span>
                    </li>
                  )}
                </ul>

                <button
                  type="button"
                  className={`${styles.btnSelect} ${isHighlight ? styles.btnHighlight : ''}`}
                >
                  Chọn Gói Này
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
