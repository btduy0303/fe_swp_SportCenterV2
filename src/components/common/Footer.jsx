import React from 'react'
import styles from '../../css/common/Footer.module.css'


// Chân trang hệ thống
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div>
        <strong>Sport Center Management System</strong> © 2026. Mọi quyền được bảo lưu.
      </div>
      <div className={styles.links}>
        <a href="#packages" className={styles.link}>Gói Tập</a>
        <a href="#classes" className={styles.link}>Lớp Học</a>
        <a href="#schedule" className={styles.link}>Khung Giờ</a>
        <a href="#" className={styles.link}>Hỗ Trợ</a>
      </div>
    </footer>
  )
}
