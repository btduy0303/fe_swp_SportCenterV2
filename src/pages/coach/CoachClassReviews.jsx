import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { coachService } from '../../services/coachService'
import { trainingRequest } from '../../services/trainingService'
import styles from '../../css/manager/ManagerDashboard.module.css'

// Đánh giá xếp loại cuối khóa (chỉ lớp đã hoàn thành). Dùng được độc lập hoặc nhúng trực tiếp trong thẻ Lớp phụ trách.
export default function CoachClassReviews({ classes, classId: fixedClassId, embedded = false }) {
  const { token } = useAuth()
  const toast = useToast()
  const requestId = useRef(0)
  const [loadedClasses, setLoadedClasses] = useState([])
  const [evalClassId, setEvalClassId] = useState(fixedClassId ? String(fixedClassId) : '')
  const [evalRows, setEvalRows] = useState([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [savingId, setSavingId] = useState(null)

  // Nếu không truyền classes từ cha, tự gọi API mới /coach/training/classes?status=COMPLETED
  useEffect(() => {
    if (Array.isArray(classes) || fixedClassId) return
    trainingRequest(token, 'coach/training/classes?status=COMPLETED')
      .then((rows) => setLoadedClasses(Array.isArray(rows) ? rows : []))
      .catch(() => {})
  }, [token, classes, fixedClassId])

  const sourceClasses = Array.isArray(classes) ? classes : loadedClasses
  const completedClasses = sourceClasses.filter((c) => c.status === 'COMPLETED')
  const myClasses = completedClasses.map((c) => [c.id, c.name])

  const loadEvaluations = async (classId) => {
    const currentRequest = ++requestId.current
    setEvalClassId(classId)
    setEvalRows([])
    if (!classId) return
    setLoadingRows(true)
    try {
      const rows = await coachService.getClassEvaluations(token, classId)
      if (requestId.current !== currentRequest) return
      setEvalRows(rows.map((r) => ({
        ...r,
        grade: r.grade || 'B',
        comment: r.comment || '',
        savedGrade: r.grade || null,
      })))
    } catch (err) {
      if (requestId.current === currentRequest) toast.error(err.message || 'Không thể tải danh sách học viên')
    } finally {
      if (requestId.current === currentRequest) setLoadingRows(false)
    }
  }

  useEffect(() => {
    if (fixedClassId) {
      loadEvaluations(String(fixedClassId))
    }
  }, [fixedClassId])

  const saveEvaluation = async (row) => {
    const targetClassId = fixedClassId ? String(fixedClassId) : evalClassId
    if (!targetClassId) return
    setSavingId(row.registrationId)
    try {
      const saved = await coachService.evaluateStudent(token, targetClassId, row.registrationId, {
        grade: row.grade,
        comment: row.comment,
      })
      setEvalRows((rows) => rows.map((r) => (
        r.registrationId === row.registrationId
          ? {
            ...r,
            grade: saved?.grade || row.grade,
            comment: saved?.comment ?? row.comment,
            evaluatedAt: saved?.evaluatedAt || new Date().toISOString(),
            savedGrade: saved?.grade || row.grade,
          }
          : r
      )))
      toast.success(`Đã lưu xếp loại ${saved?.grade || row.grade} cho ${row.memberName}`)
    } catch (err) {
      toast.error(err.message || 'Lưu xếp loại thất bại')
    } finally {
      setSavingId(null)
    }
  }

  const updateEvalRow = (registrationId, patch) =>
    setEvalRows((rows) => rows.map((r) => (r.registrationId === registrationId ? { ...r, ...patch } : r)))

  const tableBlock = (
    <>
      {loadingRows ? <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>Đang tải danh sách học viên...</p> : null}
      {!loadingRows && evalClassId && evalRows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>Lớp này chưa có học viên đủ điều kiện xếp loại.</p>
      ) : null}
      {evalRows.length > 0 && (
        <div className={styles.tableWrapper} style={{ marginTop: '0.75rem' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Học viên</th>
                <th className={styles.th}>Xếp loại</th>
                <th className={styles.th}>Nhận xét</th>
                <th className={styles.th}>Trạng thái</th>
                <th className={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {evalRows.map((r) => {
                const saving = savingId === r.registrationId
                return (
                  <tr key={r.registrationId} className={styles.row}>
                    <td className={styles.td}><strong>{r.memberName}</strong></td>
                    <td className={styles.td}>
                      <select className={styles.input} value={r.grade} disabled={saving} onChange={(e) => updateEvalRow(r.registrationId, { grade: e.target.value })}>
                        {['A', 'B', 'C', 'D'].map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className={styles.td}>
                      <input className={styles.input} value={r.comment} disabled={saving} placeholder="Nhận xét cuối khóa..." onChange={(e) => updateEvalRow(r.registrationId, { comment: e.target.value })} />
                    </td>
                    <td className={styles.td}>
                      <small style={{ color: r.savedGrade ? 'var(--success)' : 'var(--text-muted)' }}>
                        {r.savedGrade ? `Đã lưu (${r.savedGrade})` : 'Chưa lưu'}
                      </small>
                    </td>
                    <td className={styles.td}>
                      <button type="button" className={styles.btnAction} disabled={saving} onClick={() => saveEvaluation(r)}>
                        {saving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )

  if (embedded) {
    return (
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Xếp loại cuối khóa</strong>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Chọn mức xếp loại (A, B, C, D), nhập nhận xét rồi bấm Lưu cho từng học viên.</p>
        {tableBlock}
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Xếp Loại Học Viên Cuối Khóa</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Chỉ hiển thị các lớp đã hoàn thành để xếp loại và lưu nhận xét.</p>
      {myClasses.length === 0 ? (
        <p className="text-muted">Chưa có lớp nào hoàn thành để xếp loại.</p>
      ) : (
        <>
          <select className={styles.input} value={evalClassId} onChange={(e) => loadEvaluations(e.target.value)}>
            <option value="">Chọn lớp đã hoàn thành</option>
            {myClasses.map(([id, name]) => (
              <option key={id} value={id}>{name || `Lớp #${id}`}</option>
            ))}
          </select>
          {tableBlock}
        </>
      )}
    </div>
  )
}
