import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { formatVND } from '../../utils/format'
import ConfirmModal from '../common/ConfirmModal'
import styles from '../../css/home/ClassSection.module.css'

// Khu vực danh sách lớp học thể thao đang mở đăng ký (Flow 2: Ghi danh & Danh sách chờ BR-WL-01)
export default function ClassSection({ classes, loading }) {
  const { user, token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    type: 'primary',
    action: null,
  })

  // Đăng ký ghi danh lớp (giữ chỗ 15 phút - BR-ENR-01)
  const handleRegister = (cls) => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để đăng ký lớp học.')
      navigate('/login')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: 'Đăng Ký Tham Gia Lớp Học',
      message: `Bạn muốn đăng ký lớp "${cls.name}"? Đơn đăng ký sẽ giữ chỗ trong vòng 15 phút để bạn hoàn tất thanh toán.`,
      confirmText: 'Xác Nhận Đăng Ký',
      type: 'primary',
      action: async () => {
        try {
          await bookingService.registerClass(token, cls.id, true)
          toast.success('Đăng ký lớp thành công! Hãy thanh toán để giữ chỗ.')
          navigate('/member', { state: { tab: 'classes' } })
        } catch (err) {
          toast.error(err.message || 'Đăng ký lớp không thành công')
        }
      },
    })
  }

  // Vào danh sách chờ khi lớp đã hết chỗ (BR-WL-01)
  const handleJoinWaitlist = (cls) => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để vào danh sách chờ.')
      navigate('/login')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: 'Vào Danh Sách Chờ (Waitlist)',
      message: `Lớp "${cls.name}" hiện đã đủ sĩ số. Bạn có muốn vào danh sách chờ để nhận lời mời ngay khi có học viên hủy chỗ?`,
      confirmText: 'Tham Gia Danh Sách Chờ',
      type: 'primary',
      action: async () => {
        try {
          await bookingService.joinWaitlist(token, cls.id, true)
          toast.success('Đã tham gia danh sách chờ thành công!')
          navigate('/member', { state: { tab: 'classes' } })
        } catch (err) {
          toast.error(err.message || 'Không thể tham gia danh sách chờ')
        }
      },
    })
  }

  return (
    <section id="classes" className={styles.section}>
      <div className={styles.header}>
        <div className={styles.label}>Đang Mở Tuyển Sinh</div>
        <h2 className={styles.title}>Lớp Học Thể Thao</h2>
      </div>

      {loading ? (
        <p className={styles.emptyText}>Đang tải danh sách lớp học...</p>
      ) : classes.length === 0 ? (
        <p className={styles.emptyText}>Hiện chưa có lớp học nào mở đăng ký.</p>
      ) : (
        <div className={styles.grid}>
          {classes.map((cls) => {
            const isFull = cls.seatsLeft <= 0

            return (
              <div key={cls.id} className={styles.card}>
                <div>
                  <div className={styles.topRow}>
                    <span className={styles.tag}>{cls.categoryName || 'Thể Thao'}</span>
                    <span className={styles.seats} style={{ color: isFull ? 'var(--danger)' : 'var(--success)' }}>
                      {isFull ? 'Đã hết chỗ' : `Còn ${cls.seatsLeft} / ${cls.maxCapacity} chỗ`}
                    </span>
                  </div>

                  <h3 className={styles.classTitle}>{cls.name}</h3>

                  <div className={styles.metaList}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Huấn luyện viên:</span>
                      <span>{cls.coachName || 'Ban Huấn Luyện'}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Tổng số buổi:</span>
                      <span>{cls.totalSessions} buổi</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Ngày khai giảng:</span>
                      <span>{cls.startDate}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div>
                    <span className={styles.tuitionLabel}>Học phí toàn khóa</span>
                    <span className={styles.tuition}>{formatVND(cls.tuition)}</span>
                  </div>
                  {isFull ? (
                    <button
                      type="button"
                      className={styles.btnWaitlist}
                      onClick={() => handleJoinWaitlist(cls)}
                    >
                      Danh Sách Chờ
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnRegister}
                      onClick={() => handleRegister(cls)}
                    >
                      Đăng Ký
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal xác nhận 3 giây */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={() => {
          const action = confirmModal.action
          setConfirmModal({ ...confirmModal, isOpen: false })
          if (action) action()
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </section>
  )
}
