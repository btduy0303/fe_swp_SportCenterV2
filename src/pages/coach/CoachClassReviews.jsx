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
  const [savingAll, setSavingAll] = useState(false)

  const normalizeRow = (r) => ({
    ...r,
    grade: r.grade || 'B',
    comment: r.comment || '',
    savedGrade: r.grade || null,
    savedComment: r.comment || '',
  })

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
      setEvalRows(rows.map(normalizeRow))
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

  const targetClassId = fixedClassId ? String(fixedClassId) : evalClassId

  const saveEvaluation = async (row) => {
    if (!targetClassId) return
    setSavingId(row.registrationId)
    try {
      const saved = await coachService.evaluateStudent(token, targetClassId, row.registrationId, {
        grade: row.grade,
        comment: row.comment,
      })
      setEvalRows((rows) => rows.map((r) => (
        r.registrationId === row.registrationId
          ? normalizeRow({
            ...r,
            ...saved,
            grade: saved?.grade || row.grade,
            comment: saved?.comment ?? row.comment,
          })
          : r
      )))
      toast.success(`Đã lưu xếp loại ${saved?.grade || row.grade} cho ${row.memberName}`)
    } catch (err) {
      toast.error(err.message || 'Lưu xếp loại thất bại')
    } finally {
      setSavingId(null)
    }
  }

  const saveAllEvaluations = async () => {
    if (!targetClassId || evalRows.length === 0) return
    setSavingAll(true)
    try {
      const savedList = await coachService.evaluateAllStudents(
        token,
        targetClassId,
        evalRows.map((r) => ({
          registrationId: r.registrationId,
          grade: r.grade,
          comment: r.comment,
        })),
      )
      const byRegId = new Map((Array.isArray(savedList) ? savedList : []).map((item) => [item.registrationId, item]))
      setEvalRows((rows) => rows.map((r) => {
        const saved = byRegId.get(r.registrationId)
        return normalizeRow({
          ...r,
          ...saved,
          grade: saved?.grade || r.grade,
          comment: saved?.comment ?? r.comment,
        })
      }))
      toast.success(`Đã lưu toàn bộ đánh giá cho ${evalRows.length} học viên`)
    } catch (err) {
      toast.error(err.message || 'Lưu toàn bộ đánh giá thất bại')
    } finally {
      setSavingAll(false)
    }
  }

  const updateEvalRow = (registrationId, patch) =>
    setEvalRows((rows) => rows.map((r) => (r.registrationId === registrationId ? { ...r, ...patch } : r)))

  const anyBusy = savingAll || savingId !== null
  const hasUnsavedChanges = evalRows.some((r) => !r.savedGrade || r.grade !== r.savedGrade || (r.comment || '') !== (r.savedComment || ''))

  const tableBlock = (
    <>
      {loadingRows ? <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>Đang tải danh sách học viên...</p> : null}
      {!loadingRows && evalClassId && evalRows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>Lớp này chưa có học viên đủ điều kiện xếp loại.</p>
      ) : null}
      {evalRows.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <small style={{ color: 'var(--text-muted)' }}>
              {hasUnsavedChanges
                ? 'Có đánh giá chưa lưu hoặc vừa chỉnh sửa — bấm "Lưu toàn bộ đánh giá" để lưu/cập nhật cho cả lớp.'
                : `Đã lưu đầy đủ đánh giá cho ${evalRows.length} học viên.`}
            </small>
            <button
              type="button"
              className={styles.btnAction}
              disabled={anyBusy}
              onClick={saveAllEvaluations}
            >
              {savingAll ? 'Đang lưu tất cả...' : 'Lưu toàn bộ đánh giá'}
            </button>
          </div>
          <div className={styles.tableWrapper} style={{ marginTop: '0.6rem' }}>
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
                  const saving = savingAll || savingId === r.registrationId
                  const dirty = r.savedGrade && (r.grade !== r.savedGrade || (r.comment || '') !== (r.savedComment || ''))
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
                        <small style={{ color: dirty ? 'var(--warning)' : r.savedGrade ? 'var(--success)' : 'var(--text-muted)' }}>
                          {dirty
                            ? (r.grade !== r.savedGrade ? `Chưa lưu sửa (${r.savedGrade} → ${r.grade})` : 'Đã sửa nhận xét (chưa lưu)')
                            : r.savedGrade ? `Đã lưu (${r.savedGrade})` : 'Chưa lưu'}
                        </small>
                      </td>
                      <td className={styles.td}>
                        <button
                          type="button"
                          className={styles.btnAction}
                          disabled={anyBusy || Boolean(r.savedGrade)}
                          title={r.savedGrade ? 'Đã chấm lần đầu — dùng "Lưu toàn bộ đánh giá" để cập nhật' : 'Lưu đánh giá học viên này'}
                          onClick={() => saveEvaluation(r)}
                        >
                          {savingId === r.registrationId ? 'Đang lưu...' : r.savedGrade ? 'Đã chấm' : 'Lưu'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )

  if (embedded) {
    return (
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Xếp loại cuối khóa</strong>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Chọn mức xếp loại (A, B, C, D), nhập nhận xét rồi bấm Lưu từng học viên hoặc Lưu toàn bộ đánh giá để lưu/cập nhật cả lớp.</p>
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
