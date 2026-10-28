import { useState } from 'react'
import { Plus, RefreshCw, Save } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTrainingToast as useToast } from '../training/useTrainingToast'
import { trainingRequest } from '../../services/trainingService'
import { AttendanceHistory, Empty, ErrorMessage, Evaluations, Field, FormSection, Loading, Results } from './TrainingShared'
import { today } from './trainingUtils'
import { useTrainingData } from './useTrainingData'
import PagedRecords from './PagedRecords'
import styles from '../../css/training/Training.module.css'

export default function CoachProgress({ classes, initialClassId = '' }) {
  const { token } = useAuth()
  const [classId, setClassId] = useState(initialClassId)
  const [memberId, setMemberId] = useState('')
  const { data: members, loading, error } = useTrainingData(token, classId ? `coach/training/classes/${classId}/members` : null)
  return <section className={styles.panel}><h2>Theo dõi tiến bộ</h2><p className={styles.muted}>Xem điểm danh, kết quả và nhận xét theo từng lớp để định hướng buổi tập tiếp theo.</p>
    <div className={styles.filters}><Field label="Lớp phụ trách"><select value={classId} onChange={e => { setClassId(e.target.value); setMemberId('') }}><option value="">Chọn lớp</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.status === 'CANCELED' ? ' (đã hủy · lịch sử)' : ''}</option>)}</select></Field><Field label="Học viên"><select value={memberId} disabled={!classId || loading} onChange={e => setMemberId(e.target.value)}><option value="">Chọn học viên</option>{(members || []).map(m => <option key={m.memberId} value={m.memberId}>{m.fullName}{!m.eligible ? ' (lịch sử)' : ''}</option>)}</select></Field></div>
    <ErrorMessage error={error} />{loading ? <Loading label="Đang tải danh sách học viên…" /> : null}{classId && !loading && members?.length === 0 ? <Empty>Lớp chưa có học viên.</Empty> : null}
    {memberId ? <MemberProgress key={`${classId}-${memberId}`} classId={Number(classId)} memberId={Number(memberId)} /> : <Empty>Chọn lớp và học viên để xem lịch sử, kết quả và đánh giá.</Empty>}
  </section>
}
function MemberProgress({ classId, memberId }) {
  const { token, user } = useAuth()
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState(null)
  const { data, loading, error } = useTrainingData(token, `coach/training/classes/${classId}/members/${memberId}`, revision)
  if (loading) return <Loading label="Đang tải lịch sử học viên…" />
  if (error) return <ErrorMessage error={error} />
  return <><div className={styles.memberSummary}><span className={styles.memberAvatar} aria-hidden="true">{data.fullName.split(' ').filter(Boolean).slice(-2).map(n => n[0]).join('')}</span><div><h3>{data.fullName}</h3><p className={styles.muted}>Mục tiêu: {data.fitnessGoal || 'Chưa cập nhật'}</p></div><button onClick={() => setRevision(n => n + 1)}><RefreshCw size={15} aria-hidden="true" />Tải lại lịch sử</button></div>
    <details className={styles.memberHistory}><summary>Lịch sử điểm danh</summary><PagedRecords page={data.attendance} resource={`coach/training/classes/${classId}/members/${memberId}/history/attendance`} label="điểm danh học viên">{items => <AttendanceHistory attendance={items} />}</PagedRecords></details>
    <details className={styles.memberHistory}><summary>Kết quả đã ghi</summary><PagedRecords page={data.results} resource={`coach/training/classes/${classId}/members/${memberId}/history/results`} label="kết quả học viên">{items => <Results results={items} />}</PagedRecords></details>
    <div className={`${styles.row} ${styles.sectionDivider}`}><div><h3>Đánh giá tiến bộ</h3><p className={styles.muted}>Nhận xét theo kỳ và định hướng tập luyện tiếp theo.</p></div><button onClick={() => setEditing({ classId, memberId, evaluationDate: today(), periodStart: today(), periodEnd: today(), summary: '', rating: 3, strengths: '', improvements: '', recommendations: '', feedback: '' })}><Plus size={16} aria-hidden="true" />Đánh giá định kỳ</button></div>
    {editing ? <EvaluationForm key={editing.id || 'new'} initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setRevision(n => n + 1) }} /> : null}
    <PagedRecords page={data.evaluations} resource={`coach/training/classes/${classId}/members/${memberId}/history/evaluations`} label="đánh giá học viên">{items => <Evaluations evaluations={items} onEdit={setEditing} canEdit={evaluation => evaluation.coachId === user?.id} />}</PagedRecords>
  </>
}
function EvaluationForm({ initial, onCancel, onSaved }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (field, value) => setForm(old => ({ ...old, [field]: value }))
  async function submit(e) {
    e.preventDefault(); setError('')
    if (form.periodEnd < form.periodStart || form.evaluationDate < form.periodEnd) { setError('Kỳ đánh giá phải kết thúc từ ngày bắt đầu trở đi và không sau ngày đánh giá.'); return }
    setBusy(true)
    try {
      await trainingRequest(token, `coach/training/evaluations${initial.id ? `/${initial.id}` : ''}`, { method: initial.id ? 'PUT' : 'POST', body: { ...form, rating: Number(form.rating) } })
      toast.success('Đã lưu đánh giá tiến bộ'); onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className={styles.inlineForm}><h3>{initial.id ? 'Chỉnh sửa đánh giá' : 'Đánh giá định kỳ mới'}</h3><p className={styles.formIntro}>Các trường có dấu * là bắt buộc. Mức 1–5 phản ánh đánh giá của HLV trong kỳ đã chọn.</p><ErrorMessage error={error} /><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><div className={styles.form}>
    <FormSection number="01" title="Thời gian & mức tiến bộ" />
    <Field label="Ngày đánh giá"><input type="date" required max={today()} min={form.periodEnd} value={form.evaluationDate} onChange={e => set('evaluationDate', e.target.value)} /></Field>
    <Field label="Mức tiến bộ (1–5)"><select value={form.rating} onChange={e => set('rating', e.target.value)}>{[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r}/5</option>)}</select></Field>
    <Field label="Kỳ đánh giá từ"><input type="date" required max={form.periodEnd} value={form.periodStart} onChange={e => set('periodStart', e.target.value)} /></Field><Field label="Đến"><input type="date" required min={form.periodStart} max={form.evaluationDate} value={form.periodEnd} onChange={e => set('periodEnd', e.target.value)} /></Field>
    <FormSection number="02" title="Nhận xét & định hướng" />
    {[['summary', 'Tóm tắt kết quả', 4000], ['strengths', 'Điểm mạnh', 2000], ['improvements', 'Cần cải thiện', 2000], ['recommendations', 'Khuyến nghị', 2000], ['feedback', 'Nhận xét của HLV', 4000]].map(([field, label, max]) => <Field key={field} label={label} wide={field === 'summary'}><textarea required={field === 'summary'} maxLength={max} value={form[field] || ''} onChange={e => set(field, e.target.value)} /></Field>)}
    <div className={`${styles.wide} ${styles.actions}`}><button className={styles.primary} type="submit"><Save size={15} aria-hidden="true" />{busy ? 'Đang lưu…' : 'Lưu đánh giá'}</button><button type="button" onClick={onCancel}>Hủy</button></div>
  </div></fieldset></form>
}
