import { useEffect, useRef, useState } from 'react'
import { Lock, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { coachService } from '../../services/coachService'
import { displayDate } from '../training/trainingUtils'
import styles from '../../css/coach/CoachDashboard.module.css'

const GRADES = [['A', 'Giỏi'], ['B', 'Khá'], ['C', 'Trung bình'], ['D', 'Cần cố gắng']]

// Xếp loại cuối khóa: chỉ mở khi lớp đã kết thúc (BE chỉ nhận lớp COMPLETED), mỗi học viên được xếp loại một lần.
// Lớp chưa kết thúc chỉ hiện ngày dự kiến mở xếp loại, không cho nhập để tránh nhập xong mà không lưu được.
export default function CoachClassReviews({ classes, initialClassId }) {
  const { token } = useAuth()
  const toast = useToast()
  const requestId = useRef(0)
  const finished = classes.filter((c) => c.status === 'COMPLETED')
  const waiting = classes.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS')
  const [classId, setClassId] = useState('')
  const [rows, setRows] = useState(null)
  const [savingId, setSavingId] = useState(null)

  const load = async (id) => {
    const current = ++requestId.current
    setClassId(id)
    setRows(null)
    if (!id) return
    try {
      const data = await coachService.getClassEvaluations(token, id)
      if (requestId.current !== current) return
      setRows(data.map((r) => ({ ...r, done: Boolean(r.grade), draftGrade: r.grade || '', draftComment: r.comment || '' })))
    } catch (err) {
      if (requestId.current === current) { setRows([]); toast.error(err.message || 'Không thể tải danh sách học viên') }
    }
  }

  useEffect(() => {
    if (initialClassId && finished.some((c) => String(c.id) === String(initialClassId))) load(String(initialClassId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClassId])

  const update = (registrationId, patch) => setRows((list) => list.map((r) => (r.registrationId === registrationId ? { ...r, ...patch } : r)))

  const save = async (row) => {
    if (!row.draftGrade) { toast.error('Hãy chọn xếp loại trước khi lưu'); return }
    setSavingId(row.registrationId)
    try {
      const saved = await coachService.evaluateStudent(token, classId, row.registrationId, { grade: row.draftGrade, comment: row.draftComment.trim() })
      update(row.registrationId, { ...saved, done: true })
      toast.success(`Đã lưu xếp loại cho ${row.memberName}`)
    } catch (err) {
      toast.error(err.message || 'Lưu xếp loại thất bại')
    } finally {
      setSavingId(null)
    }
  }

  const doneCount = rows ? rows.filter((r) => r.done).length : 0

  return (
    <>
      <section className={styles.panel}>
        <h2>Lớp đã kết thúc</h2>
        <p className={styles.muted}>Mỗi học viên được xếp loại một lần, sau khi lưu không sửa được. Học viên nhận thông báo ngay khi bạn lưu.</p>
        {finished.length === 0 ? (
          <p className={styles.empty}>Chưa có lớp nào kết thúc. Khi lớp học xong buổi cuối, lớp sẽ xuất hiện ở đây để bạn xếp loại.</p>
        ) : (
          <div className={styles.reviewPicker}>
            {finished.map((c) => (
              <button key={c.id} type="button" className={String(c.id) === String(classId) ? styles.primaryButton : styles.button} onClick={() => load(String(c.id))}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {classId && rows === null ? <p role="status" className={styles.muted}>Đang tải học viên…</p> : null}
        {classId && rows && rows.length === 0 ? <p className={styles.empty}>Lớp này không có học viên nào học đến cuối khóa.</p> : null}
        {classId && rows && rows.length > 0 ? (
          <>
            <p className={styles.reviewProgress}>Đã xếp loại {doneCount}/{rows.length} học viên</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Học viên</th><th>Xếp loại</th><th>Nhận xét</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => r.done ? (
                    <tr key={r.registrationId}>
                      <td><strong>{r.memberName}</strong></td>
                      <td><span className={styles.status} data-status="OPEN">{r.grade} · {GRADES.find(([g]) => g === r.grade)?.[1]}</span></td>
                      <td>{r.comment || <span className={styles.muted}>Không có nhận xét</span>}</td>
                      <td><span className={styles.inline}><CheckCircle2 size={16} aria-hidden="true" />Đã lưu{r.evaluatedAt ? ` ${displayDate(String(r.evaluatedAt).slice(0, 10))}` : ''}</span></td>
                    </tr>
                  ) : (
                    <tr key={r.registrationId}>
                      <td><strong>{r.memberName}</strong></td>
                      <td>
                        <select className={styles.field} aria-label={`Xếp loại cho ${r.memberName}`} value={r.draftGrade} onChange={(e) => update(r.registrationId, { draftGrade: e.target.value })}>
                          <option value="">Chọn</option>
                          {GRADES.map(([g, label]) => <option key={g} value={g}>{g} · {label}</option>)}
                        </select>
                      </td>
                      <td><input className={styles.field} aria-label={`Nhận xét cho ${r.memberName}`} maxLength={500} value={r.draftComment} placeholder="Điểm mạnh, điều cần cải thiện" onChange={(e) => update(r.registrationId, { draftComment: e.target.value })} /></td>
                      <td><button type="button" className={styles.primaryButton} disabled={savingId === r.registrationId} onClick={() => save(r)}>{savingId === r.registrationId ? 'Đang lưu' : 'Lưu'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      {waiting.length > 0 ? (
        <section className={styles.panel}>
          <h2>Chưa đến lúc xếp loại</h2>
          <p className={styles.muted}>Các lớp đang học. Xếp loại mở sau buổi học cuối cùng.</p>
          <ul className={styles.waitList}>
            {waiting.map((c) => (
              <li key={c.id}>
                <Lock size={16} aria-hidden="true" />
                <span><strong>{c.name}</strong> · đã dạy {c.doneSessions}/{c.totalSessions} buổi</span>
                <span className={styles.muted}>{c.lastSessionDate ? `Mở sau ngày ${displayDate(c.lastSessionDate)}` : 'Lớp chưa có lịch học'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
