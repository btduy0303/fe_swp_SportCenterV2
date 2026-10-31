import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Dumbbell, ClipboardCheck, Activity, ChartNoAxesCombined, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import SidebarLayout from '../../components/common/SidebarLayout'
import { memberItems } from '../../components/common/navItems'
import { AttendanceHistory, Badge, Empty, ErrorMessage, Evaluations, Field, Loading, PlanAudience, PlanDetails, Results, SessionTable, TrainingTabs } from './TrainingShared'
import { useTrainingData } from './useTrainingData'
import { bookingService } from '../../services/bookingService'
import PagedRecords from './PagedRecords'
import PaginatedList from './PaginatedList'
import styles from '../../css/training/Training.module.css'

export default function MemberTraining() {
  const { token } = useAuth()
  const [tab, setTab] = useState('sessions')
  const [revision, setRevision] = useState(0)
  const [range, setRange] = useState({ from: '', to: '' })
  const [applied, setApplied] = useState('')
  const { data, error, loading } = useTrainingData(token, `member/training${applied}`, revision)
  // Xếp loại cuối khóa (coach chấm khi lớp kết thúc), hiện chung với nhận xét từng buổi
  const [grades, setGrades] = useState([])
  useEffect(() => { bookingService.getMyClassEvaluations(token).then(setGrades).catch(() => setGrades([])) }, [token, revision])
  function applyRange(e) {
    e.preventDefault()
    const params = new URLSearchParams(Object.entries(range).filter(([, value]) => value))
    setApplied(params.size ? `?${params}` : '')
    setRevision(n => n + 1)
  }
  return <SidebarLayout workspace="MEMBER WORKSPACE" caption="HỘI VIÊN" rootLabel="Không gian Hội viên" roleLabel="Hội viên" items={memberItems(true)} activeId="training" profileTo="/member?tab=profile"><div className={styles.memberShell}><main className={styles.page}><div className={styles.pageHeader}><div><p className={styles.eyebrow}>Nhật ký của hội viên</p><h1>Hành trình tập luyện</h1><p className={styles.muted}>Lịch tập, kế hoạch và từng bước tiến bộ của bạn.</p></div><div className={styles.actions}><Link to="/member">← Bảng điều khiển</Link><button disabled={loading} onClick={() => setRevision(n => n + 1)}><RefreshCw size={15} aria-hidden="true" />{error ? 'Thử tải lại' : 'Tải lại dữ liệu'}</button></div></div>
    <ErrorMessage error={error} />{loading ? <Loading label="Đang tải hành trình tập luyện…" /> : null}
    {data && !loading ? <><section className={styles.stats} aria-label="Thống kê tập luyện"><div><strong>{data.statistics.attendedSessions}</strong><span>Buổi có mặt / đến muộn</span></div><div><strong>{data.statistics.attendanceRate == null ? '—' : `${data.statistics.attendanceRate}%`}</strong><span>Tỷ lệ trên {data.statistics.markedSessions} buổi đã điểm danh</span></div><div><strong>{data.statistics.completedSessions}</strong><span>Buổi đã hoàn thành có điểm danh</span></div><div><strong>{data.statistics.completedActivities}</strong><span>Hoạt động đã hoàn thành</span></div></section>
      <TrainingTabs label="Thông tin tập luyện" items={[["sessions", "Lịch tập", CalendarDays], ["plans", "Kế hoạch của tôi", Dumbbell], ["attendance", "Điểm danh", ClipboardCheck], ["results", "Kết quả", Activity], ["feedback", "Đánh giá & nhận xét", ChartNoAxesCombined]]} active={tab} onChange={setTab} />
      <section className={styles.panel} role="tabpanel" tabIndex={0} id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'sessions' ? <><h2>Lịch tập của tôi</h2><form className={styles.filters} onSubmit={applyRange}><Field label="Từ ngày"><input type="date" value={range.from} onChange={e => setRange(old => ({ ...old, from: e.target.value }))} /></Field><Field label="Đến ngày"><input type="date" min={range.from} value={range.to} onChange={e => setRange(old => ({ ...old, to: e.target.value }))} /></Field><button type="submit">Áp dụng ngày</button></form><p className={styles.muted}>Mặc định hiển thị 30 ngày trước và 30 ngày tới. Lịch sử kết quả và điểm danh vẫn được giữ khi bạn rời lớp.</p><PaginatedList items={data.sessions} resetKey={applied} label="lịch tập của tôi">{items => <SessionTable sessions={items} />}</PaginatedList></> : null}
        {tab === 'plans' ? <><h2>Kế hoạch được giao</h2><PagedRecords key="plans" page={data.plans} resource="member/training/history/plans" label="kế hoạch của tôi">{items => items.length ? <div className={styles.stack}>{items.map(p => <article className={styles.record} key={p.id}><div className={styles.row}><div><PlanAudience memberId={p.memberId} memberName={p.memberName} /><h3>{p.title}</h3><small>{p.className}</small></div><Badge value={p.status} /></div><details><summary>Xem chi tiết · {p.exercises.length} bài tập</summary><PlanDetails plan={p} /></details></article>)}</div> : <Empty>HLV chưa giao kế hoạch tập luyện cho bạn.</Empty>}</PagedRecords></> : null}
        {tab === 'attendance' ? <><h2>Lịch sử điểm danh</h2><PagedRecords key="attendance" page={data.attendance} resource="member/training/history/attendance" label="lịch sử điểm danh">{items => <AttendanceHistory attendance={items} />}</PagedRecords></> : null}
        {tab === 'results' ? <><h2>Kết quả tập luyện</h2><PagedRecords key="results" page={data.results} resource="member/training/history/results" label="kết quả của tôi">{items => <Results results={items} />}</PagedRecords></> : null}
        {tab === 'feedback' ? <><h2>Xếp loại cuối khóa</h2>{grades.length ? <div className={styles.stack}>{grades.map(g => <article className={styles.record} key={g.registrationId}><div className={styles.row}><div><h3>{g.className}</h3><small>Coach {g.coachName}</small></div><Badge value={g.grade} /></div>{g.comment ? <p>{g.comment}</p> : null}</article>)}</div> : <Empty>Chưa có lớp nào được xếp loại cuối khóa.</Empty>}<h2>Tiến bộ & nhận xét từ HLV</h2><PagedRecords key="evaluations" page={data.evaluations} resource="member/training/history/evaluations" label="đánh giá của tôi">{items => <Evaluations evaluations={items} />}</PagedRecords></> : null}
      </section>
    </> : null}
  </main></div></SidebarLayout>
}
