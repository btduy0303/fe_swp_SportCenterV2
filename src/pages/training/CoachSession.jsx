import { useState } from 'react'
import { CalendarDays, Clock3, MapPin, Info, Save, CheckCheck, Plus, ArrowLeft, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTrainingToast as useToast } from '../training/useTrainingToast'
import ConfirmModal from '../../components/common/ConfirmModal'
import { trainingRequest } from '../../services/trainingService'
import { Badge, Empty, ErrorMessage, Field, FormSection, Loading, Results } from './TrainingShared'
import { displayDate, numeric } from './trainingUtils'
import { useTrainingData } from './useTrainingData'
import PaginatedList from './PaginatedList'
import styles from '../../css/training/Training.module.css'

export default function CoachSession({ id, onBack, onSaved }) {
  const { token } = useAuth()
  const [revision, setRevision] = useState(0)
  const { data, error, loading } = useTrainingData(token, `coach/training/sessions/${id}`, revision)
  return <section className={styles.panel}><div className={styles.row}><button onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />Danh sách buổi tập</button><button disabled={loading} onClick={() => setRevision(n => n + 1)}><RefreshCw size={15} aria-hidden="true" />Tải lại buổi tập</button></div>
    <ErrorMessage error={error} />{loading ? <Loading label="Đang tải buổi tập…" /> : data ? <SessionEditor key={revision} data={data} plans={data.plans} onSaved={() => { setRevision(n => n + 1); onSaved() }} /> : null}</section>
}

function SessionEditor({ data, plans, onSaved }) {
  const { token } = useAuth()
  const toast = useToast()
  const { session, roster } = data
  const [attendance, setAttendance] = useState(() => Object.fromEntries(roster.map(p => [p.memberId, { memberId: p.memberId, status: p.status || '', notes: p.notes || '' }])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [result, setResult] = useState(null)
  const withdrawn = new Set(roster.filter(p => p.withdrawnBeforeSession).map(p => p.memberId))
  const editableRoster = roster.filter(p => p.status !== 'DECLINED_MAKEUP' && !p.withdrawnBeforeSession)
  const markedNow = editableRoster.filter(p => attendance[p.memberId].status).length
  const dirty = roster.some(p => attendance[p.memberId].status !== (p.status || '') || attendance[p.memberId].notes !== (p.notes || ''))
  const update = (id, field, value) => setAttendance(old => ({ ...old, [id]: { ...old[id], [field]: value } }))
  async function save(finalizeSession) {
    setBusy(true); setError(''); setConfirm(false)
    try {
      await trainingRequest(token, `coach/training/sessions/${session.id}/attendance`, { method: 'PUT', body: {
        version: session.version, finalizeSession, entries: Object.values(attendance).filter(a => a.status && a.status !== 'DECLINED_MAKEUP' && !withdrawn.has(a.memberId)),
      } })
      toast.success(finalizeSession ? 'Đã chốt điểm danh và hoàn thành buổi tập' : 'Đã lưu điểm danh')
      onSaved()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <>
    <div className={styles.sessionHero}><div><p className={styles.eyebrow}>Buổi {session.sessionNo} · Điểm danh & kết quả</p><h2>{session.className}</h2><div className={styles.sessionFacts}><span><CalendarDays size={15} aria-hidden="true" />{displayDate(session.date)}</span><span><Clock3 size={15} aria-hidden="true" />{session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)}</span><span><MapPin size={15} aria-hidden="true" />{session.room}</span></div></div><Badge value={session.status} /></div>
    <div className={styles.counts} aria-label="Điểm danh đã lưu">{[['Có mặt', data.counts.present, 'green'], ['Vắng', data.counts.absent], ['Muộn', data.counts.late], ['Có phép', data.counts.excused], ['Chưa đánh dấu', data.counts.unmarked, 'amber'], ['Từ chối buổi bù', data.counts.declined]].map(([label, count, tone]) => <span key={label} data-tone={tone}>{label}<strong>{count}</strong></span>)}</div>
    <div className={styles.notice}><Info size={17} aria-hidden="true" /><p><strong>{session.finalizedAt ? 'Buổi này đã được chốt.' : 'Buổi này chưa được chốt.'}</strong> Điểm danh mở từ 15 phút trước giờ tập đến 48 giờ sau khi kết thúc. Chốt sau giờ tập sẽ đánh dấu người còn trống là vắng. Thống kê phía trên là dữ liệu đã lưu.</p></div>
    <ErrorMessage error={error} />
    {session.status === 'CANCELED_BY_CENTER' ? <p className={styles.muted}>Buổi tập đã bị trung tâm hủy. Bản điểm danh cũ được giữ để tra cứu và không tính vào thống kê chuyên cần.</p> : null}
    <div className={styles.row}><h3>Danh sách học viên <small>{roster.length} hồ sơ trong buổi tập</small></h3><button disabled={busy || !data.attendanceEditable} onClick={() => setAttendance(old => Object.fromEntries(Object.entries(old).map(([key, a]) => [key, a.status === 'DECLINED_MAKEUP' || withdrawn.has(a.memberId) ? a : { ...a, status: 'PRESENT' }]))) }><CheckCheck size={15} aria-hidden="true" />Đánh dấu tất cả có mặt (mọi trang)</button></div>
    {roster.length ? <PaginatedList items={roster} label="học viên điểm danh" disabled={busy}>{visible => <div className={styles.tableWrap} role="region" aria-label="Bảng điểm danh học viên, có thể cuộn ngang" tabIndex={0}><table><thead><tr><th scope="col">Học viên / mục tiêu</th><th scope="col">Điểm danh</th><th scope="col">Ghi chú</th></tr></thead><tbody>{visible.map(p => <tr key={p.memberId}><td><strong>{p.fullName}</strong><small>{p.fitnessGoal || 'Chưa có mục tiêu'}{p.withdrawnBeforeSession ? ' · Đã rời lớp trước buổi tập, chỉ xem bản lưu' : !p.eligible ? ' · Hồ sơ lịch sử' : ''}</small></td><td>{p.status === 'DECLINED_MAKEUP' ? <Badge value={p.status} /> : <select aria-label={`Điểm danh ${p.fullName}`} value={attendance[p.memberId].status} disabled={busy || !data.attendanceEditable || p.withdrawnBeforeSession} onChange={e => update(p.memberId, 'status', e.target.value)}><option value="" disabled={!!p.status}>Chưa đánh dấu</option>{['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map(s => <option key={s} value={s}>{{ PRESENT: 'Có mặt', ABSENT: 'Vắng', LATE: 'Đến muộn', EXCUSED: 'Có phép' }[s]}</option>)}</select>}</td><td><input aria-label={`Ghi chú ${p.fullName}`} placeholder="Ghi chú cho buổi tập…" maxLength={500} value={attendance[p.memberId].notes} disabled={busy || !data.attendanceEditable || p.status === 'DECLINED_MAKEUP' || p.withdrawnBeforeSession} onChange={e => update(p.memberId, 'notes', e.target.value)} /></td></tr>)}</tbody></table></div>}</PaginatedList> : <Empty>Chưa có học viên đủ điều kiện cho buổi tập này.</Empty>}
    <div className={styles.stickyActions}><p role="status"><strong>{dirty ? 'Có thay đổi chưa lưu' : 'Dữ liệu đã đồng bộ'}</strong><br />{markedNow}/{editableRoster.length} học viên được đánh dấu trong biểu mẫu</p><div className={styles.actions}><button disabled={busy || !data.finalizationAllowed} onClick={() => setConfirm(true)}><CheckCheck size={15} aria-hidden="true" />Chốt buổi tập</button><button className={styles.primary} disabled={busy || !data.attendanceEditable} onClick={() => save(false)}><Save size={15} aria-hidden="true" />{busy ? 'Đang lưu…' : 'Lưu điểm danh'}</button></div></div>
    <ConfirmModal variant="training" isOpen={confirm} title="Chốt điểm danh" message="Học viên chưa được đánh dấu ở tất cả các trang sẽ chuyển thành vắng. Buổi tập sẽ được hoàn thành để ghi kết quả." confirmText="Chốt buổi tập" type="warning" onConfirm={() => save(true)} onCancel={() => setConfirm(false)} />
    <div className={`${styles.row} ${styles.sectionDivider}`}><div><h2>Kết quả tập luyện</h2><p className={styles.muted}>Thành tích và nhận xét sau buổi tập.</p></div><button disabled={!data.resultsEditable || busy} onClick={() => setResult({ memberId: '', exerciseId: '', activityKey: '', activityName: '', actualSets: '', actualRepetitions: '', actualDurationSeconds: '', performance: '', completionStatus: 'COMPLETED', notes: '' })}><Plus size={16} aria-hidden="true" />Ghi kết quả</button></div>
    {!data.resultsEditable ? <p className={styles.muted}>Kết quả được mở sau khi buổi tập kết thúc và được chốt hoàn thành.</p> : null}
    {result ? <ResultForm key={result.id || 'new'} initial={result} session={session} roster={roster} plans={plans} onCancel={() => setResult(null)} onSaved={onSaved} /> : null}
    <PaginatedList items={data.results} label="kết quả buổi tập">{items => <Results results={items} onEdit={data.resultsEditable ? setResult : undefined} />}</PaginatedList>
  </>
}

function ResultForm({ initial, session, roster, plans, onCancel, onSaved }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (field, value) => setForm(old => ({ ...old, [field]: value }))
  const exercises = plans.filter(p => p.classId === session.classId && (!p.memberId || p.memberId === Number(form.memberId)) && ['PUBLISHED', 'COMPLETED'].includes(p.status) && p.startDate <= session.date && p.endDate >= session.date).flatMap(p => p.exercises.map(e => ({ ...e, planTitle: p.title })))
  function selectExercise(value) {
    const exercise = exercises.find(e => e.id === Number(value))
    setForm(old => ({ ...old, exerciseId: value, activityKey: exercise ? `exercise:${value}` : '', activityName: exercise?.name || '' }))
  }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      await trainingRequest(token, `coach/training/sessions/${session.id}/results`, { method: 'PUT', body: { ...form,
        version: session.version, memberId: Number(form.memberId), exerciseId: numeric(form.exerciseId), actualSets: numeric(form.actualSets),
        actualRepetitions: numeric(form.actualRepetitions), actualDurationSeconds: numeric(form.actualDurationSeconds),
      } })
      toast.success('Đã lưu kết quả tập luyện'); onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <form className={styles.inlineForm} onSubmit={submit}><h3>{initial.id ? 'Cập nhật kết quả' : 'Ghi kết quả mới'}</h3><p className={styles.formIntro}>Chỉ học viên có mặt hoặc đến muộn mới được ghi kết quả. Các trường có dấu * là bắt buộc.</p><ErrorMessage error={error} /><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}><div className={styles.form}>
    <FormSection number="01" title="Học viên & bài tập" />
    <Field label="Học viên đã tham gia"><select required disabled={!!initial.id} value={form.memberId} onChange={e => { set('memberId', e.target.value); selectExercise('') }}><option value="">Chọn học viên</option>{roster.filter(p => ['PRESENT', 'LATE'].includes(p.status) && !p.withdrawnBeforeSession).map(p => <option key={p.memberId} value={p.memberId}>{p.fullName}</option>)}</select></Field>
    <Field label="Bài tập từ kế hoạch (tùy chọn)"><select disabled={!!initial.id} value={form.exerciseId ?? ''} onChange={e => selectExercise(e.target.value)}><option value="">Hoạt động ngoài kế hoạch</option>{exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.planTitle} · {ex.name}</option>)}{initial.exerciseId && !exercises.some(e => e.id === initial.exerciseId) ? <option value={initial.exerciseId}>{initial.activityName} (bản lưu)</option> : null}</select></Field>
    <Field label="Mã hoạt động" hint="Dùng lại mã để cập nhật cùng hoạt động, ví dụ warmup-01."><input required disabled={!!initial.id || !!form.exerciseId} pattern="[a-zA-Z0-9:_-]+" maxLength={100} placeholder="warmup-01" value={form.activityKey} onChange={e => set('activityKey', e.target.value)} /></Field>
    <Field label="Tên bài tập / hoạt động"><input required disabled={!!initial.id || !!form.exerciseId} maxLength={200} value={form.activityName} onChange={e => set('activityName', e.target.value)} /></Field>
    <FormSection number="02" title="Thành tích thực tế" description="Để trống chỉ tiêu không áp dụng, giữ số 0 khi giá trị thực tế là 0." />
    {[['actualSets', 'Số hiệp thực tế', 10000], ['actualRepetitions', 'Số lần lặp thực tế', 100000], ['actualDurationSeconds', 'Thời lượng thực tế (giây)', 604800]].map(([field, label, max]) => <Field key={field} label={label}><input type="number" inputMode="numeric" min="0" max={max} step="1" value={form[field] ?? ''} onChange={e => set(field, e.target.value)} /></Field>)}
    <Field label="Mức hoàn thành"><select value={form.completionStatus} onChange={e => set('completionStatus', e.target.value)}><option value="COMPLETED">Hoàn thành</option><option value="PARTIAL">Một phần</option><option value="NOT_COMPLETED">Chưa hoàn thành</option></select></Field>
    <Field label="Thành tích / hiệu suất"><textarea maxLength={2000} value={form.performance || ''} onChange={e => set('performance', e.target.value)} /></Field><Field label="Ghi chú"><textarea maxLength={4000} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>
    <div className={`${styles.actions} ${styles.wide}`}><button type="submit" className={styles.primary}>{busy ? 'Đang lưu…' : 'Lưu kết quả'}</button><button type="button" onClick={onCancel}>Hủy</button></div>
  </div></fieldset></form>
}
