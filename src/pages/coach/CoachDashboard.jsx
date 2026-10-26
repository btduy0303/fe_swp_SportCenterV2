import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { coachService } from '../../services/coachService'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import ConfirmModal from '../../components/common/ConfirmModal'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Bảng điều khiển Huấn Luyện Viên (Coach) - Quản lý buổi dạy, mở slot 1-1, đánh giá thể lực
export default function CoachDashboard() {
  const { user, token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [classSessions, setClassSessions] = useState([])
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal xác nhận 3 giây
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    type: 'danger',
    action: null,
  })

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    loadData()
  }, [token])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sessions, mySlots] = await Promise.all([
        coachService.getMyClassSessions(token),
        coachService.getMy1On1Slots(token),
      ])
      setClassSessions(sessions)
      setSlots(mySlots)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Lỗi khi tải lịch làm việc')
    } finally {
      setLoading(false)
    }
  }

  // Hủy slot 1-1 (yêu cầu xác nhận 3s)
  const requestCancelSlot = (slotId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hủy Suất Tập 1-1',
      message: 'Bạn có chắc chắn muốn hủy suất tập 1-1 này? Hội viên đã đặt lịch sẽ nhận được thông báo.',
      confirmText: 'Xác Nhận Hủy',
      type: 'danger',
      action: async () => {
        try {
          await coachService.cancel1On1Slot(token, slotId)
          toast.success('Đã hủy suất tập thành công!')
          loadData()
        } catch (err) {
          toast.error(err.message || 'Hủy suất tập thất bại')
        }
      },
    })
  }

  return (
    <div className={styles.container}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.badge}>Khu Vực Huấn Luyện Viên</div>
            <h1 className={styles.pageTitle}>Lịch Giảng Dạy & Huấn Luyện</h1>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Đang tải lịch của huấn luyện viên...</p>
        ) : (
          <>
            {/* Danh sách các buổi dạy lớp thể thao */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Lịch Dạy Các Lớp Học Thể Thao</h2>
              {classSessions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Hiện tại bạn chưa có lịch dạy lớp học nào.</p>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Tên Lớp</th>
                        <th className={styles.th}>Ngày</th>
                        <th className={styles.th}>Giờ Học</th>
                        <th className={styles.th}>Phòng</th>
                        <th className={styles.th}>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSessions.map((ss) => (
                        <tr key={ss.id} className={styles.row}>
                          <td className={styles.td}><strong>{ss.className || `Lớp #${ss.classId}`}</strong></td>
                          <td className={styles.td}>{ss.sessionDate}</td>
                          <td className={styles.td}>{ss.startTime} - {ss.endTime}</td>
                          <td className={styles.td}>{ss.roomName || 'Chưa xếp phòng'}</td>
                          <td className={styles.td}>
                            <span className={ss.status === 'SCHEDULED' ? styles.statusActive : styles.statusInactive}>
                              {ss.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Danh sách các suất 1-1 */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Lịch Kèm Cá Nhân 1-1</h2>
              {slots.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Chưa có suất tập 1-1 nào được mở.</p>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>ID</th>
                        <th className={styles.th}>Ngày Tập</th>
                        <th className={styles.th}>Khung Giờ</th>
                        <th className={styles.th}>Trạng Thái</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((s) => (
                        <tr key={s.id} className={styles.row}>
                          <td className={styles.td}>#{s.id}</td>
                          <td className={styles.td}>{s.slotDate}</td>
                          <td className={styles.td}>{s.startTime} - {s.endTime}</td>
                          <td className={styles.td}>
                            <span className={s.status === 'AVAILABLE' ? styles.statusActive : styles.statusInactive}>
                              {s.status}
                            </span>
                          </td>
                          <td className={styles.td}>
                            {s.status === 'AVAILABLE' && (
                                <button
                                  type="button"
                                  className={styles.btnDanger}
                                  onClick={() => requestCancelSlot(s.id)}
                                >
                                  Hủy Suất
                                </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />

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
    </div>
  )
}
