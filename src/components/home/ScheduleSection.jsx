import React from 'react'
import styles from '../../css/home/ScheduleSection.module.css'


// 8 khung giờ cố định chuẩn của trung tâm
const FIXED_SLOTS = [
  { no: 1, time: '06:00 - 07:45' },
  { no: 2, time: '08:00 - 09:45' },
  { no: 3, time: '10:00 - 11:45' },
  { no: 4, time: '12:00 - 13:45' },
  { no: 5, time: '14:00 - 15:45' },
  { no: 6, time: '16:00 - 17:45' },
  { no: 7, time: '18:00 - 19:45' },
  { no: 8, time: '20:00 - 21:45' },
]

// Bảng thời khóa biểu các khung giờ học chuẩn
export default function ScheduleSection() {
  return (
    <section id="schedule" className={styles.section}>
      <div className={styles.header}>
        <div className={styles.label}>Thời Khóa Biểu Chuẩn</div>
        <h2 className={styles.title}>8 Khung Giờ Cố Định</h2>
      </div>

      <div className={styles.strip}>
        <p className={styles.desc}>
          Toàn bộ các lớp học, buổi tập cá nhân 1-1 và khung đánh giá thể lực đều được sắp xếp gọn gàng theo 8 slot cố định (105 phút / slot, 15 phút nghỉ giữa giờ).
        </p>

        <div className={styles.grid}>
          {FIXED_SLOTS.map((slot) => (
            <div key={slot.no} className={styles.slotItem}>
              <div className={styles.slotNo}>Slot {slot.no}</div>
              <div className={styles.slotTime}>{slot.time}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
