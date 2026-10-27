import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { coachService } from '../../services/coachService'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import ConfirmModal from '../../components/common/ConfirmModal'
import { CoachWeeklySchedule, CoachProfileCard } from '../../components/coach/CoachExtras'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Bảng điều khiển Huấn Luyện Viên (Coach) - Quản lý buổi dạy, mở slot 1-1, nhận xét học viên
export default function CoachDashboard() {
  const { user, token } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [classSessions, setClassSessions] = useState([])
  const [slots, setSlots] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [newSlot, setNewSlot] = useState({ date: '', timeSlotId: '' })
  const [evalClassId, setEvalClassId] = useState('')
  const [evalRows, setEvalRows] = useState([])
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
      const [sessions, mySlots, tSlots] = await Promise.all([
        coachService.getMyClassSessions(token),
        coachService.getMy1On1Slots(token),
        coachService.getTimeSlots().catch(() => []),
      ])
      setClassSessions(sessions)
      setSlots(mySlots)
      setTimeSlots(tSlots.filter((t) => t.active))
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Lỗi khi tải lịch làm việc')
    } finally {
      setLoading(false)
    }
  }

  // Mở suất 1-1 mới theo ngày và khung giờ cố định
  const handleCreateSlot = async (e) => {
    e.preventDefault()
    try {
      await coachService.create1On1Slot(token, { date: newSlot.date, timeSlotId: Number(newSlot.timeSlotId) })
      toast.success('Đã mở suất 1-1')
      setNewSlot({ date: '', timeSlotId: '' })
      loadData()
    } catch (err) {
      toast.error(err.message || 'Mở suất 1-1 thất bại')
    }
  }

  // Các lớp mình dạy (lấy từ lịch dạy, bỏ trùng)
  const myClasses = [...new Map(classSessions.map((ss) => [ss.classId, ss.className])).entries()]

  const loadEvaluations = async (classId) => {
    setEvalClassId(classId)
    setEvalRows([])
    if (!classId) return
    try {
      const rows = await coachService.getClassEvaluations(token, classId)
      setEvalRows(rows.map((r) => ({ ...r, grade: r.grade || 'B', comment: r.comment || '' })))
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách học viên')
    }
  }

  const saveEvaluation = async (row) => {
    try {
      await coachService.evaluateStudent(token, evalClassId, row.registrationId, { grade: row.grade, comment: row.comment })
      toast.success(`Đã lưu nhận xét cho ${row.memberName}`)
    } catch (err) {
      toast.error(err.message || 'Lưu nhận xét thất bại')
    }
  }

  const updateEvalRow = (registrationId, patch) =>
    setEvalRows((rows) => rows.map((r) => (r.registrationId === registrationId ? { ...r, ...patch } : r)))

  const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '')

  // Hủy slot 1-1 (yêu cầu xác nhận 3s)
  const requestCancelSlot = (slotId, hasMember) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hủy Suất Tập 1-1',
      message: 'Bạn có chắc chắn muốn hủy suất tập 1-1 này? Hội viên đã đặt lịch sẽ nhận được thông báo.',
      confirmText: 'Xác Nhận Hủy',
      type: 'danger',
      action: async () => {
        try {
          if (hasMember) await coachService.cancel1On1Slot(token, slotId)
          else await coachService.delete1On1Slot(token, slotId)
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
            <CoachWeeklySchedule />

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
                        <tr key={ss.sessionId} className={styles.row}>
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

            <CoachProfileCard />

            {/* Nhận xét học viên sau mỗi buổi học */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Nhận Xét Học Viên</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Chỉ nhận xét được khi lớp đã kết thúc.</p>
              {myClasses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Bạn chưa được phân công lớp nào.</p>
              ) : (
                <>
                  <select className={styles.input} value={evalClassId} onChange={(e) => loadEvaluations(e.target.value)}>
                    <option value="">Chọn lớp để nhận xét</option>
                    {myClasses.map(([id, name]) => (
                      <option key={id} value={id}>{name || `Lớp #${id}`}</option>
                    ))}
                  </select>
                  {evalRows.length > 0 && (
                    <div className={styles.tableWrapper} style={{ marginTop: '1rem' }}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.th}>Học viên</th>
                            <th className={styles.th}>Xếp loại</th>
                            <th className={styles.th}>Nhận xét</th>
                            <th className={styles.th}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {evalRows.map((r) => (
                            <tr key={r.registrationId} className={styles.row}>
                              <td className={styles.td}><strong>{r.memberName}</strong></td>
                              <td className={styles.td}>
                                <select className={styles.input} value={r.grade} onChange={(e) => updateEvalRow(r.registrationId, { grade: e.target.value })}>
                                  {['A', 'B', 'C', 'D'].map((g) => <option key={g} value={g}>{g}</option>)}
                                </select>
                              </td>
                              <td className={styles.td}>
                                <input className={styles.input} value={r.comment} onChange={(e) => updateEvalRow(r.registrationId, { comment: e.target.value })} />
                              </td>
                              <td className={styles.td}>
                                <button type="button" className={styles.btnAction} onClick={() => saveEvaluation(r)}>Lưu</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Danh sách các suất 1-1 */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Lịch Kèm Cá Nhân 1-1</h2>
              <form onSubmit={handleCreateSlot} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <input type="date" required className={styles.input} value={newSlot.date} onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })} />
                <select required className={styles.input} value={newSlot.timeSlotId} onChange={(e) => setNewSlot({ ...newSlot, timeSlotId: e.target.value })}>
                  <option value="">Chọn khung giờ</option>
                  {timeSlots.map((t) => (
                    <option key={t.id} value={t.id}>Khung {t.slotNo}: {String(t.startTime).slice(0, 5)} - {String(t.endTime).slice(0, 5)}</option>
                  ))}
                </select>
                <button type="submit" className={styles.btnAction}>Mở Suất 1-1</button>
              </form>
              {slots.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Chưa có suất tập 1-1 nào được mở.</p>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>ID</th>
                        <th className={styles.th}>Thời Gian</th>
                        <th className={styles.th}>Hội Viên</th>
                        <th className={styles.th}>Trạng Thái</th>
                        <th className={styles.th}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((s) => (
                        <tr key={s.id} className={styles.row}>
                          <td className={styles.td}>#{s.id}</td>
                          <td className={styles.td}>{fmtDateTime(s.startAt)} - {new Date(s.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className={styles.td}>{s.memberName || '-'}</td>
                          <td className={styles.td}>
                            <span className={s.status === 'BOOKED' || s.status === 'OPEN' ? styles.statusActive : styles.statusInactive}>
                              {s.status}
                            </span>
                          </td>
                          <td className={styles.td}>
                            {(s.status === 'OPEN' || s.status === 'HELD' || s.status === 'BOOKED') && (
                                <button
                                  type="button"
                                  className={styles.btnDanger}
                                  onClick={() => requestCancelSlot(s.id, s.status !== 'OPEN')}
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
