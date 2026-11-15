import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { formatVND } from '../../utils/format'
import ConfirmModal from '../common/ConfirmModal'
import { VideoStill } from './landingHooks'
import { sportVideo } from '../../data/landing'
import styles from '../../css/home/ClassSection.module.css'

const MAX_CLASSES = 6

// Học gì ở G6: tối đa 6 lớp sắp khai giảng (đăng ký hoặc vào danh sách chờ ngay) và khóa kèm 1-1 ở cột bên cạnh
export default function ClassSection({ classes, loading, oneOnOnePrice, minSessions, rescheduleHours }) {
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

  // Đăng ký ghi danh lớp (giữ chỗ tối đa 2 giờ, BR-ENR-01)
  const handleRegister = (cls) => {
    if (!token) {
      toast.info('Vui lòng đăng nhập để đăng ký lớp học.')
      navigate('/login')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: 'Đăng ký tham gia lớp học',
      message: `Bạn muốn đăng ký lớp "${cls.name}"? Chỗ của bạn được giữ tối đa 2 giờ (không quá giờ buổi học đầu tiên) để bạn thanh toán online hoặc tiền mặt tại quầy.`,
      confirmText: 'Xác nhận đăng ký',
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
      confirmText: 'Tham gia danh sách chờ',
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
        <h2 className={styles.title}>Học gì ở G6</h2>
        <p className={styles.intro}>Học theo lớp với lịch cố định cùng bạn tập, hoặc kèm riêng 1-1 vào giờ bạn rảnh.</p>
      </div>
      <div className={styles.split}>
      <div>
      <h3 className={styles.colTitle}>Lớp sắp khai giảng</h3>

      {loading ? (
        <p className={styles.emptyText}>Đang tải danh sách lớp học...</p>
      ) : classes.length === 0 ? (
        <p className={styles.emptyText}>Hiện chưa có lớp học nào mở đăng ký.</p>
      ) : (
        <div className={styles.grid}>
          {[...classes].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, MAX_CLASSES).map((cls) => {
            const isFull = cls.seatsLeft <= 0

            return (
              <div key={cls.id} className={styles.card}>
                <VideoStill className={styles.cardPic} src={sportVideo(cls.categoryName)} at={4} label={`Lớp ${cls.categoryName}`} />
                <div>
                  <div className={styles.topRow}>
                    <span className={styles.tag}>{cls.categoryName || 'Thể thao'}</span>
                    <span className={styles.seats} style={{ color: isFull ? 'var(--danger)' : 'var(--success)' }}>
                      {isFull ? 'Đã hết chỗ' : `Còn ${cls.seatsLeft} / ${cls.maxCapacity} chỗ`}
                    </span>
                  </div>

                  <h3 className={styles.classTitle}>{cls.name}</h3>

                  <div className={styles.metaList}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Huấn luyện viên:</span>
                      <span>{cls.coachName || 'Ban huấn luyện'}</span>
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

      {classes.length > MAX_CLASSES || token ? (
        <a className={styles.allLink} href={token ? '/member?tab=classes' : '/login'}>Xem tất cả {classes.length} lớp đang mở</a>
      ) : null}
      </div>

      <aside className={styles.private} aria-labelledby="private-title">
        <VideoStill className={styles.privatePic} src="/media/fitness.mp4" at={3} label="Tập kèm riêng với huấn luyện viên" />
        <h3 id="private-title" className={styles.colTitle}>Kèm riêng 1-1</h3>
        <p>Mua khóa nhiều buổi với huấn luyện viên riêng. Bạn chọn giờ rảnh mỗi tuần, hệ thống gợi ý huấn luyện viên rảnh đúng giờ đó; một ngày học được nhiều khung giờ.</p>
        {oneOnOnePrice != null ? <p className={styles.privatePrice}>Từ <b>{formatVND(oneOnOnePrice)}</b> mỗi buổi<small>Khóa ngắn nhất {minSessions} buổi, khóa càng dài mỗi buổi càng rẻ.</small></p> : null}
        {rescheduleHours ? <p className={styles.privateNote}>Bận đột xuất thì báo dời trước {rescheduleHours} giờ, buổi học vẫn được giữ.</p> : null}
        <a className={styles.btnRegister} href={token ? '/member?tab=slots' : '/login'}>{token ? 'Mua khóa 1-1' : 'Đăng nhập để đặt 1-1'}</a>
      </aside>
      </div>

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
