import { useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { coachService } from '../../services/coachService'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Đánh giá xếp loại cuối khóa của Flow 2, độc lập với đánh giá tiến bộ Flow 4.
export default function CoachClassReviews({ classes }) {
  const { token } = useAuth()
  const toast = useToast()
  const requestId = useRef(0)
  const [evalClassId, setEvalClassId] = useState('')
  const [evalRows, setEvalRows] = useState([])
  const myClasses = classes.map(c => [c.id, c.name])
  const loadEvaluations = async (classId) => {
    const currentRequest = ++requestId.current
    setEvalClassId(classId)
    setEvalRows([])
    if (!classId) return
    try {
      const rows = await coachService.getClassEvaluations(token, classId)
      if (requestId.current !== currentRequest) return
      setEvalRows(rows.map((r) => ({ ...r, grade: r.grade || 'B', comment: r.comment || '' })))
    } catch (err) {
      if (requestId.current === currentRequest) toast.error(err.message || 'Không thể tải danh sách học viên')
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


  return <>            {/* Nhận xét học viên sau mỗi buổi học */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Nhận Xét Học Viên</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Chỉ nhận xét được khi lớp đã kết thúc.</p>
              {myClasses.length === 0 ? (
                <p className="text-muted">Bạn chưa được phân công lớp nào.</p>
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

</>
}
