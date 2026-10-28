import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Dumbbell, ChartNoAxesCombined, RefreshCw, Plus, Pencil } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CoachLayout from '../../components/coach/CoachLayout'
import { trainingRequest } from '../../services/trainingService'
import { Badge, Empty, ErrorMessage, Field, Loading, PlanAudience, PlanDetails, SessionTable, TrainingTabs } from './TrainingShared'
import CoachSession from './CoachSession'
import CoachProgress from './CoachProgress'
import TrainingPlanEditor from './TrainingPlanEditor'
import PagedRecords from './PagedRecords'
import PaginatedList from './PaginatedList'
import { filterSessions, sessionStatusFilter } from './trainingUtils'
import styles from '../../css/training/Training.module.css'

export default function CoachTraining() {
  const { token, user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = ['sessions', 'plans', 'progress'].includes(params.get('tab')) ? params.get('tab') : 'sessions'
  const sessionId = /^\d+$/.test(params.get('session') || '') && Number(params.get('session')) > 0 ? Number(params.get('session')) : null
  const classFilter = params.get('classId') || ''
  const sessionFilter = sessionStatusFilter(params.get('status'))
  const updateParams = changes => setParams(old => { const next = new URLSearchParams(old); Object.entries(changes).forEach(([key, value]) => { if (value == null || value === '') next.delete(key); else next.set(key, value) }); return next })
  const setTab = value => { setEditPlan(undefined); updateParams({ tab: value, session: null, create: null, status: null, classId: null }) }
  const setSessionId = value => updateParams({ session: value })
  const setClassFilter = value => updateParams({ classId: value })
  const setSessionFilter = value => updateParams({ status: value })
  const [range, setRange] = useState({ from: '', to: '' })
  const [applied, setApplied] = useState('')
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ loading: true, error: '', sessions: [], classes: [], plans: { items: [], nextCursor: null } })
  const [editPlan, setEditPlan] = useState(undefined)
  const editing = params.get('create') === 'plan' ? null : editPlan
  const setEditing = value => { setEditPlan(value); updateParams({ create: null }) }
  const [search, setSearch] = useState('')
  const requestKey = `${applied}:${revision}:${token}`
  const loading = state.loading || state.requestKey !== requestKey
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(['classes', `sessions${applied}`, 'plans'].map(resource => trainingRequest(token, `coach/training/${resource}`, { signal: controller.signal }))).then(([classes, sessions, plans]) => {
      if (!controller.signal.aborted) setState({ classes, sessions, plans, requestKey, loading: false, error: '' })
    }).catch(error => { if (!controller.signal.aborted) setState(old => ({ ...old, requestKey, loading: false, error: error.message })) })
    return () => controller.abort()
  }, [token, applied, requestKey])
  const role = user?.roleCode || (typeof user?.role === 'string' ? user.role : user?.role?.code)
  const historyClasses = state.classes.filter(c => c.coachId === user?.id && c.status !== 'DRAFT')
  const ownClasses = historyClasses.filter(c => c.status !== 'CANCELED')
  const sessions = filterSessions(state.sessions, classFilter, sessionFilter, search)
  const reload = () => setRevision(n => n + 1)
  function applyRange(e) {
    e.preventDefault()
    const params = new URLSearchParams(Object.entries(range).filter(([, value]) => value))
    setApplied(params.size ? `?${params}` : '')
    reload()
  }
  return <CoachLayout><main className={styles.page}><div className={styles.pageHeader}><div><p className={styles.eyebrow}>Khu vực huấn luyện viên</p><h1>{tab === 'plans' ? 'Kế hoạch tập luyện' : tab === 'progress' ? 'Tiến bộ học viên' : sessionFilter === 'completed' ? 'Kết quả tập luyện' : 'Lịch & điểm danh'}</h1><p className={styles.muted}>{tab === 'plans' ? 'Xây dựng lộ trình rõ ràng cho từng học viên và cả lớp.' : tab === 'progress' ? 'Theo dõi hành trình, ghi nhận nỗ lực và định hướng buổi tập tiếp theo.' : 'Lịch được phân công, điểm danh và kết quả trong từng buổi tập.'}</p></div><div className={styles.actions}><Link to="/coach">← Tổng quan</Link><button disabled={loading} onClick={reload}><RefreshCw size={15} aria-hidden="true" />{state.error ? 'Thử tải lại' : 'Tải lại dữ liệu'}</button></div></div>
    <TrainingTabs label="Quản lý tập luyện" items={[['sessions', 'Lịch & điểm danh', CalendarDays], ['plans', 'Kế hoạch tập luyện', Dumbbell], ['progress', 'Tiến bộ học viên', ChartNoAxesCombined]]} active={tab} onChange={setTab} />
    <ErrorMessage error={state.error} />
    {loading ? <Loading label="Đang tải dữ liệu tập luyện…" /> : null}
    {!loading && !state.error ? <div role="tabpanel" tabIndex={0} id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
      {tab === 'sessions' ? <>{sessionId ? <CoachSession id={sessionId} onBack={() => setSessionId(null)} onSaved={reload} /> : <section className={styles.panel}><div className={styles.row}><h2>Lịch tập được phân công</h2><small>{state.classes.length} lớp · {state.sessions.length} buổi trong khoảng ngày</small></div>
        <div className={styles.filterBar}><form className={styles.filters} onSubmit={applyRange}><Field label="Từ ngày" hint="Mặc định: 30 ngày trước"><input type="date" value={range.from} onChange={e => setRange(old => ({ ...old, from: e.target.value }))} /></Field><Field label="Đến ngày" hint="Mặc định: 30 ngày tới"><input type="date" min={range.from} value={range.to} onChange={e => setRange(old => ({ ...old, to: e.target.value }))} /></Field><button type="submit">Áp dụng ngày</button></form>
        <div className={styles.filters}><Field label="Tìm lớp / phòng"><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nhập tên lớp hoặc phòng…" /></Field><Field label="Lớp"><select value={classFilter} onChange={e => setClassFilter(e.target.value)}><option value="">Tất cả lớp</option>{state.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Trạng thái"><select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}><option value="all">Tất cả</option><option value="scheduled">Đã lên lịch</option><option value="completed">Đã hoàn thành</option></select></Field></div>
        </div><div className={styles.row}><small>Hiển thị {sessions.length} buổi phù hợp bộ lọc</small><button onClick={() => { setSearch(''); setParams({ tab:'sessions' }); setRange({ from:'', to:'' }); setApplied('') }}>Xóa bộ lọc</button></div><PaginatedList items={sessions} resetKey={JSON.stringify([applied, classFilter, sessionFilter, search])} label="lịch tập Coach">{items => <SessionTable sessions={items} onSelect={setSessionId} />}</PaginatedList></section>}</> : null}
      {tab === 'plans' ? <>{editing !== undefined ? <TrainingPlanEditor initial={editing} classes={ownClasses} onCancel={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload() }} /> : <section className={styles.panel}><div className={styles.row}><div><h2>Lộ trình của học viên</h2><p className={styles.muted}>Bản nháp, kế hoạch đã giao và các phiên bản đã lưu.</p></div><button className={styles.primary} disabled={!ownClasses.length} onClick={() => setEditing(null)}><Plus size={16} aria-hidden="true" />Tạo kế hoạch</button></div>{!ownClasses.length ? <p className={styles.muted}>Bạn cần được phân công phụ trách một lớp đang mở để giao kế hoạch.</p> : null}
        <PagedRecords page={state.plans} resource="coach/training/plans" label="kế hoạch Coach">{items => items.length ? <div className={styles.stack}>{items.map(plan => <article key={plan.id} className={styles.record}><div className={styles.row}><div><PlanAudience memberId={plan.memberId} memberName={plan.memberName} /><h3>{plan.title}</h3><small>{plan.className || 'Kế hoạch cá nhân cũ'}</small></div><div className={styles.actions}><Badge value={plan.status} /><button disabled={!ownClasses.some(c => c.id === plan.classId)} onClick={() => setEditing(plan)}><Pencil size={14} aria-hidden="true" />Chỉnh sửa</button></div></div><details><summary>Xem kế hoạch · {plan.exercises.length} bài tập</summary><PlanDetails plan={plan} /></details></article>)}</div> : <Empty>Chưa có kế hoạch. Tạo bản nháp hoặc giao kế hoạch cho cả lớp / một học viên.</Empty>}</PagedRecords></section>}</> : null}
      {tab === 'progress' ? <CoachProgress key={classFilter} classes={historyClasses} initialClassId={classFilter} /> : null}
    </div> : null}
    {role !== 'COACH' ? <ErrorMessage error="Khu vực tập luyện này dành cho tài khoản Huấn luyện viên." /> : null}
  </main></CoachLayout>
}
