import { useState } from 'react'
import { Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTrainingToast as useToast } from './useTrainingToast'
import { trainingRequest } from '../../services/trainingService'
import { Empty, ErrorMessage, Field } from './TrainingShared'
import { numeric } from './trainingUtils'
import { useTrainingData } from './useTrainingData'
import styles from '../../css/training/Training.module.css'

const blank = { classId: '', memberId: '', type: 'ANNOUNCEMENT', title: '', content: '' }

// Coach gửi thông báo hoặc bài tập về nhà cho cả lớp hoặc một học viên (POST coach/training/classes/{id}/announcements)
export default function CoachAnnouncement({ classes }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: roster, loading } = useTrainingData(token, form.classId ? `coach/training/classes/${form.classId}/members` : null)
  const set = (field, value) => setForm(old => ({ ...old, [field]: value }))

  async function submit(event) {
    event.preventDefault(); setError('')
    setBusy(true)
    try {
      const result = await trainingRequest(token, `coach/training/classes/${form.classId}/announcements`, { method: 'POST', body: {
        type: form.type, memberId: numeric(form.memberId), title: form.title.trim(), content: form.content.trim(),
      } })
      toast.success(`Đã gửi cho ${result.recipients} học viên`)
      setForm(old => ({ ...blank, classId: old.classId }))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  if (!classes.length) return <section className={styles.panel}><Empty>Bạn cần được phân công phụ trách một lớp đang mở để gửi thông báo.</Empty></section>
  return <section className={styles.panel}><h2>Thông báo & bài tập về nhà</h2><p className={styles.muted}>Gửi cho cả lớp hoặc một học viên. Học viên nhận trong mục thông báo của họ.</p>
    <ErrorMessage error={error} />
    <form onSubmit={submit}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><div className={styles.form}>
      <Field label="Lớp"><select required value={form.classId} onChange={e => setForm(old => ({ ...old, classId: e.target.value, memberId: '' }))}><option value="">Chọn lớp</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Gửi cho"><select disabled={!form.classId || loading} value={form.memberId} onChange={e => set('memberId', e.target.value)}><option value="">Cả lớp</option>{(roster || []).filter(p => p.eligible).map(p => <option key={p.memberId} value={p.memberId}>{p.fullName}</option>)}</select></Field>
      <Field label="Loại"><select value={form.type} onChange={e => set('type', e.target.value)}><option value="ANNOUNCEMENT">Thông báo</option><option value="HOMEWORK">Bài tập về nhà</option></select></Field>
      <Field wide label="Tiêu đề"><input required maxLength={200} placeholder="Ví dụ: Buổi sau nhớ mang vợt" value={form.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field wide label="Nội dung"><textarea required maxLength={2000} value={form.content} onChange={e => set('content', e.target.value)} /></Field>
    </div><div className={styles.actions}><button className={styles.primary} type="submit" disabled={busy || !form.classId}><Send size={15} aria-hidden="true" />{busy ? 'Đang gửi…' : 'Gửi'}</button></div></fieldset></form>
  </section>
}
