import { useState } from 'react'
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTrainingToast as useToast } from '../training/useTrainingToast'
import { trainingRequest } from '../../services/trainingService'
import { ErrorMessage, Field, FormSection } from './TrainingShared'
import { numeric, today } from './trainingUtils'
import { useTrainingData } from './useTrainingData'
import styles from '../../css/training/Training.module.css'

const emptyExercise = () => ({ name: '', instructions: '', sets: '', repetitions: '', durationSeconds: '' })
export default function TrainingPlanEditor({ initial, classes, onCancel, onSaved }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(initial || { classId: '', memberId: '', title: '', description: '', objective: '', startDate: today(), endDate: today(), status: 'DRAFT', coachNotes: '', exercises: [emptyExercise()] })
  const { data: roster, error: rosterError, loading } = useTrainingData(token, form.classId ? `coach/training/classes/${form.classId}/members` : null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (field, value) => setForm(old => ({ ...old, [field]: value }))
  const editExercise = (index, field, value) => setForm(old => ({ ...old, exercises: old.exercises.map((e, i) => i === index ? { ...e, [field]: value } : e) }))
  async function submit(event) {
    event.preventDefault(); setError('')
    if (form.endDate < form.startDate) { setError('Ngày kết thúc phải từ ngày bắt đầu trở đi.'); return }
    if (!form.exercises.length) { setError('Kế hoạch phải có ít nhất một bài tập.'); return }
    setBusy(true)
    try {
      await trainingRequest(token, `coach/training/plans${initial?.id ? `/${initial.id}` : ''}`, { method: initial?.id ? 'PUT' : 'POST', body: {
        ...form, classId: Number(form.classId), memberId: numeric(form.memberId),
        exercises: form.exercises.map(e => ({ ...e, sets: numeric(e.sets), repetitions: numeric(e.repetitions), durationSeconds: numeric(e.durationSeconds) })),
      } })
      toast.success('Đã lưu kế hoạch tập luyện'); onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <section className={styles.panel}><div className={styles.row}><div><p className={styles.eyebrow}>Lộ trình huấn luyện</p><h2>{initial?.id ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch tập luyện'}</h2></div><button onClick={onCancel} disabled={busy}><ArrowLeft size={15} aria-hidden="true" />Danh sách kế hoạch</button></div><p className={styles.formIntro}>Chọn đối tượng, đặt mục tiêu và xây dựng các bài tập. Các trường có dấu * là bắt buộc.</p><ErrorMessage error={error || rosterError} />
    <form onSubmit={submit}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><div className={styles.form}>
      <FormSection number="01" title="Đối tượng nhận kế hoạch" description="Giao cho cả lớp hoặc chọn riêng một học viên." />
      <Field label="Lớp được phân công"><select required disabled={!!initial?.id} value={form.classId} onChange={e => setForm(old => ({ ...old, classId: e.target.value, memberId: '' }))}><option value="">Chọn lớp</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Đối tượng được giao"><select disabled={!!initial?.id || loading || !form.classId} value={form.memberId || ''} onChange={e => set('memberId', e.target.value)}><option value="">Cả lớp</option>{(roster || []).filter(p => p.eligible || p.memberId === initial?.memberId).map(p => <option key={p.memberId} value={p.memberId}>{p.fullName}</option>)}{initial?.memberId && !(roster || []).some(p => p.memberId === initial.memberId) ? <option value={initial.memberId}>{initial.memberName} (đã rời lớp)</option> : null}</select></Field>
      <FormSection number="02" title="Mục tiêu & thời gian" description="Bản nháp chỉ dành cho bạn. Chọn Đã giao để học viên nhìn thấy kế hoạch." />
      <Field label="Tên kế hoạch"><input required maxLength={200} placeholder="Tên ngắn gọn, dễ nhận biết" value={form.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Trạng thái"><select value={form.status} onChange={e => set('status', e.target.value)}><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã giao cho học viên</option><option value="COMPLETED">Hoàn thành</option><option value="ARCHIVED">Lưu trữ</option></select></Field>
      <Field label="Bắt đầu"><input type="date" required value={form.startDate || ''} onChange={e => set('startDate', e.target.value)} /></Field><Field label="Kết thúc"><input type="date" required min={form.startDate} value={form.endDate || ''} onChange={e => set('endDate', e.target.value)} /></Field>
      <Field label="Mục tiêu"><textarea required maxLength={2000} value={form.objective || ''} onChange={e => set('objective', e.target.value)} /></Field><Field label="Mô tả"><textarea maxLength={4000} value={form.description || ''} onChange={e => set('description', e.target.value)} /></Field>
      <Field wide label="Ghi chú cho học viên"><textarea maxLength={4000} value={form.coachNotes || ''} onChange={e => set('coachNotes', e.target.value)} /></Field>
      <FormSection number="03" title="Bài tập / hoạt động" description="Thêm hướng dẫn và chỉ tiêu phù hợp. Có thể để trống chỉ tiêu chưa áp dụng." />
      <div className={`${styles.row} ${styles.wide}`}><span className={styles.muted}>{form.exercises.length} bài tập trong kế hoạch</span><button type="button" disabled={form.exercises.length >= 100} onClick={() => set('exercises', [...form.exercises, emptyExercise()])}><Plus size={15} aria-hidden="true" />Thêm bài tập</button></div>
      {form.exercises.map((exercise, index) => <div className={styles.exerciseEditor} key={exercise.id || `new-${index}`}><div className={styles.row}><h3>Bài {index + 1}</h3><button className={styles.danger} type="button" disabled={form.exercises.length === 1} onClick={() => set('exercises', form.exercises.filter((_, i) => i !== index))} aria-label={`Bỏ bài tập ${index + 1}`}><Trash2 size={14} aria-hidden="true" />Bỏ bài tập</button></div><div className={styles.form}>
        <Field wide label="Tên bài tập"><input required maxLength={200} value={exercise.name} onChange={e => editExercise(index, 'name', e.target.value)} /></Field>
        <Field wide label="Hướng dẫn thực hiện"><textarea maxLength={2000} value={exercise.instructions || ''} onChange={e => editExercise(index, 'instructions', e.target.value)} /></Field>
        {[['sets', 'Số hiệp', 10000], ['repetitions', 'Số lần lặp', 100000], ['durationSeconds', 'Thời lượng (giây)', 604800]].map(([field, label, max]) => <Field key={field} label={label}><input type="number" min="0" max={max} step="1" value={exercise[field] ?? ''} onChange={e => editExercise(index, field, e.target.value)} /></Field>)}
      </div></div>)}
      <p className={`${styles.muted} ${styles.wide}`}>Khi lưu, kết quả đã ghi giữ nguyên bài tập được giao trước đó. Đổi đối tượng nhận cần tạo kế hoạch mới.</p>
      <div className={`${styles.stickyActions} ${styles.wide}`}><p><strong>{form.status === 'DRAFT' ? 'Lưu bản nháp' : 'Lưu thay đổi kế hoạch'}</strong><br />{form.exercises.length} bài tập · {form.memberId ? 'Giao cá nhân' : 'Giao cả lớp'}</p><div className={styles.actions}><button type="button" onClick={onCancel}>Hủy</button><button className={styles.primary} type="submit"><Save size={15} aria-hidden="true" />{busy ? 'Đang lưu…' : 'Lưu kế hoạch'}</button></div></div>
    </div></fieldset></form>
  </section>
}
