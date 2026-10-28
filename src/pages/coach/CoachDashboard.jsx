import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, ClipboardCheck, Dumbbell, RefreshCw, Activity, ChartNoAxesCombined, CheckCheck, Clock3, Users, Waves, Flower2, Swords, Volleyball, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CoachLayout from '../../components/coach/CoachLayout'
import { useTrainingData } from '../training/useTrainingData'
import { Badge } from '../training/TrainingShared'
import { displayDate } from '../training/trainingUtils'
import CoachSlots from './CoachSlots'
import CoachClassReviews from './CoachClassReviews'
import { CoachWeeklySchedule, CoachProfileCard } from '../../components/coach/CoachExtras'
import PaginatedList from '../training/PaginatedList'
import styles from '../../css/coach/CoachDashboard.module.css'

const sessionUrl = id => `/coach/training?tab=sessions&session=${id}`
const time = value => value?.slice(0, 5) || '—'
const classStatus = { DRAFT: 'Bản nháp', OPEN: 'Đang mở', IN_PROGRESS: 'Đang học', COMPLETED: 'Hoàn thành', CANCELED: 'Đã hủy' }
const dateTime = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))

export default function CoachDashboard() {
  const { token, user, logout } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const view = params.get('view') || 'overview'
  const [revision, setRevision] = useState(0)
  const { data, loading, error, status } = useTrainingData(token, ['profile', 'slots', 'weekly'].includes(view) ? null : 'coach/training/dashboard', revision)
  const title = { classes: 'Lớp phụ trách', attendance: 'Điểm danh cần hoàn tất', profile: 'Hồ sơ của tôi', slots: 'Lịch kèm cá nhân 1-1', weekly: 'Lịch dạy hằng tuần', reviews: 'Xếp loại cuối khóa' }[view]
  return <CoachLayout><main className={styles.main}>
    <header className={styles.header}><div><p className={styles.eyebrow}>TRUNG TÂM THỂ THAO / HUẤN LUYỆN</p>
      {data ? <p className={styles.date}>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${data.today}T12:00:00+07:00`))}</p> : null}
      <h1>{title || `Xin chào, ${user?.fullName || 'Huấn luyện viên'}`}</h1>
      <p className={styles.muted}>{view === 'overview' ? data ? `${data.todaySessions.length} buổi dạy hôm nay · ${data.summary.pendingAttendance} buổi đang cần chốt điểm danh. Cùng học viên tiến bộ mỗi ngày.` : 'Sẵn sàng cho buổi tập tiếp theo cùng học viên của bạn.' : 'Lịch dạy, học viên và công việc huấn luyện của bạn.'}</p>
    </div><button className={styles.button} disabled={loading} onClick={() => setRevision(n => n + 1)}><RefreshCw size={16} aria-hidden="true" />{loading ? 'Đang tải' : 'Tải lại dữ liệu'}</button></header>
    {error ? <div role="alert" className={styles.error}><strong>{status === 401 ? 'Phiên đăng nhập đã hết hạn' : 'Chưa tải được dashboard'}</strong><p>{error}</p>
      {status === 401 ? <button className={styles.button} onClick={() => { logout(); navigate('/login', { replace: true }) }}>Đăng nhập lại</button> : <button className={styles.button} onClick={() => setRevision(n => n + 1)}>Thử lại</button>}</div> : null}
    {loading ? <div role="status" aria-label="Đang tải dashboard" className={styles.skeleton}><div /><div /><div /></div> : null}
    {view === 'profile' ? <><Profile user={user} /><CoachProfileCard /></> : view === 'slots' ? <CoachSlots /> : view === 'weekly' ? <CoachWeeklySchedule /> : null}
    {data && !loading && !error && !['profile', 'slots', 'weekly'].includes(view) ? <>
      {view === 'reviews' ? <CoachClassReviews classes={data.classes.filter(c => c.coachId === user?.id)} /> : <>
        {view === 'overview' ? <>
          <Statistics summary={data.summary} />
          <div className={styles.dashboardGrid}><div className={styles.primaryColumn}>
            <SessionList title="Lịch dạy hôm nay" subtitle={`${data.todaySessions.length} buổi được phân công · Bao gồm trạng thái thay đổi từ trung tâm`} items={data.todaySessions} classes={data.classes} userId={user?.id} empty="Hôm nay bạn chưa có lịch dạy. Có thể xem các buổi sắp tới trong lịch giảng dạy." />
            <ClassList classes={data.classes} userId={user?.id} compact />
          </div><div className={styles.secondaryColumn}>
            <QuickActions pending={data.pendingSessions} />
            <PendingSummary items={data.pendingSessions} />
            <RecentActivities activities={data.recentActivities} />
          </div></div>
        </> : view === 'classes' ? <ClassList classes={data.classes} userId={user?.id} />
          : <SessionList title="Buổi đang trong cửa sổ điểm danh" subtitle="Chưa chốt, từ 15 phút trước giờ bắt đầu đến 48 giờ sau khi kết thúc. Buổi hủy hoặc lớp chưa hoạt động được loại trừ." items={data.pendingSessions} classes={data.classes} userId={user?.id} empty="Không có buổi nào đang cần hoàn tất điểm danh. Các buổi chưa tới giờ hoặc đã hết hạn vẫn có trong lịch giảng dạy." />}
      </>}
      <p className={styles.updated}>Dữ liệu cập nhật lúc {dateTime(data.refreshedAt)} · Múi giờ trung tâm: Việt Nam (UTC+7)</p>
    </> : null}
  </main></CoachLayout>
}

function Statistics({ summary }) {
  const stats = [
    ['Lớp phụ trách', summary.myClasses, 'Lớp chủ nhiệm hoặc được phân công dạy thay.', '/coach?view=classes', Users, 'blue'],
    ['Buổi lên lịch hôm nay', summary.todaySessions, 'Đã lên lịch, thuộc lớp đang hoạt động.', '/coach/training?tab=sessions', CalendarDays, 'green'],
    ['Buổi sắp diễn ra', summary.upcomingSessions, 'Bắt đầu sau lúc cập nhật, không tính buổi hủy.', '/coach/training?tab=sessions&status=scheduled', Clock3, 'blue'],
    ['Cần chốt điểm danh', summary.pendingAttendance, 'Chưa chốt, đang trong thời gian được điểm danh.', '/coach?view=attendance', ClipboardCheck, 'amber'],
  ]
  return <section aria-label="Thống kê giảng dạy" className={styles.statistics}>{stats.map(([label, count, definition, to, Icon, tone]) => <Link to={to} key={label} className={styles.stat} data-tone={tone}>
    <div className={styles.statTop}><span className={styles.statIcon}><Icon size={19} aria-hidden="true" /></span><ArrowUpRight size={15} aria-hidden="true" /></div><strong>{count}</strong><span className={styles.statLabel}>{label}</span><small>{definition}</small>
  </Link>)}</section>
}

function SessionList({ title, subtitle, items, classes, userId, empty }) {
  return <section className={styles.panel}><div className={styles.sectionHeading}><div><h2>{title}</h2><p className={styles.muted}>{subtitle}</p></div><Link className={styles.textLink} to="/coach/training?tab=sessions">Xem lịch <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    {items.length ? <PaginatedList items={items} label={title}>{visible => <div className={styles.sessionList}>{visible.map(item => {
      const s = item.session
      const assignedClass = classes.find(c => c.id === s.classId)
      const attendanceStatus = s.status === 'CANCELED_BY_CENTER' || s.classStatus === 'CANCELED' ? 'Đã hủy · Chỉ xem bản lưu' : s.finalizedAt ? 'Đã chốt điểm danh' : item.marked ? `Đã lưu ${item.marked}/${item.members} học viên · Chưa chốt` : 'Chưa điểm danh'
      return <article className={styles.session} key={s.id} data-upcoming={s.status === 'SCHEDULED'}>
        <div className={styles.sessionTime}><strong>{time(s.startTime)}</strong><span>{time(s.endTime)}</span><small>{displayDate(s.date)}</small></div>
        <div className={styles.sessionInfo}><div className={styles.inline}><SportLabel name={item.sport} /><Badge value={s.status} /></div><h3>{s.className}</h3><p><MapPin size={12} aria-hidden="true" /> {s.room} · Buổi {s.sessionNo} · {item.members} học viên</p><p className={styles.attendanceState}><CheckCheck size={14} aria-hidden="true" />{attendanceStatus}</p>
          <div className={styles.actions}><Link className={styles.textLink} to={sessionUrl(s.id)}>Xem buổi tập</Link>
            <Link className={styles.textLink} to={assignedClass?.coachId === userId && assignedClass.status !== 'DRAFT' ? `/coach/training?tab=progress&classId=${s.classId}` : sessionUrl(s.id)}>Xem học viên</Link>
            {item.attendanceEditable ? <Link className={s.finalizedAt ? styles.button : styles.primaryButton} to={sessionUrl(s.id)}><ClipboardCheck size={15} aria-hidden="true" />{s.finalizedAt ? 'Sửa điểm danh' : 'Điểm danh'}</Link> : <span className={styles.muted}>Điểm danh đang khóa</span>}
          </div>
        </div>
      </article>
    })}</div>}</PaginatedList> : <div className={styles.empty}><CalendarDays size={28} aria-hidden="true" /><p>{empty}</p><Link className={styles.textLink} to="/coach/training?tab=sessions">Mở lịch giảng dạy →</Link></div>}
  </section>
}

function ClassList({ classes, userId, compact = false }) {
  const shown = compact ? classes.slice(0, 3) : classes
  return <section className={styles.panel}><div className={styles.sectionHeading}><div><h2>Lớp phụ trách</h2><p className={styles.muted}>{classes.length} lớp được phân công, gồm cả lịch sử dạy thay.</p></div>{compact ? <Link className={styles.textLink} to="/coach?view=classes">Tất cả lớp <ArrowUpRight size={15} aria-hidden="true" /></Link> : null}</div>
    {shown.length ? <PaginatedList items={shown} label="lớp phụ trách" hideControls={compact}>{visible => <div>{visible.map(c => <article className={styles.classRow} key={c.id}><div className={styles.inline}><SportLabel name={c.sport} /><span className={styles.status} data-status={c.status}>{classStatus[c.status] || c.status}</span></div>
      <h3>{c.name}</h3><p className={styles.muted}>{c.schedule || 'Trung tâm chưa thiết lập lịch cố định.'}</p>
      <div className={styles.classMeta}><span>{c.members}/{c.capacity} học viên đã đăng ký</span><span>{c.coachId === userId ? 'Lớp phụ trách chính' : 'Có phân công dạy thay'}</span></div>
      <p className={styles.nextSession}><Clock3 size={15} aria-hidden="true" />{c.nextSession ? `Buổi tiếp: ${displayDate(c.nextSession.date)} · ${time(c.nextSession.startTime)} · ${c.nextSession.room}` : 'Chưa có buổi dạy tiếp theo được lên lịch cho bạn.'}</p>
      <div className={styles.actions}><details className={styles.classDetails}><summary>Chi tiết lớp</summary><p>Khóa học: {c.course}</p><p>{c.description || 'Chưa có mô tả lớp.'}</p></details>
        {c.coachId === userId && c.status !== 'DRAFT' ? <Link className={styles.textLink} to={`/coach/training?tab=progress&classId=${c.id}`}>Xem học viên</Link> : c.representativeSessionId ? <Link className={styles.textLink} to={sessionUrl(c.representativeSessionId)}>Học viên buổi được phân công</Link> : null}
        <Link className={styles.textLink} to={`/coach/training?tab=sessions&classId=${c.id}`}>Lịch tập của lớp →</Link></div>
    </article>)}</div>}</PaginatedList> : <div className={styles.empty}><Dumbbell size={28} aria-hidden="true" /><p>Bạn chưa được phân công lớp nào. Lớp và lịch dạy sẽ xuất hiện khi quản lý hoàn tất phân công.</p></div>}
  </section>
}

function QuickActions({ pending }) {
  const actions = [
    [ClipboardCheck, 'Điểm danh', pending.length ? sessionUrl(pending[0].session.id) : '/coach?view=attendance'],
    [Dumbbell, 'Tạo kế hoạch', '/coach/training?tab=plans&create=plan'],
    [Activity, 'Ghi kết quả tập luyện', '/coach/training?tab=sessions&status=completed'],
    [ChartNoAxesCombined, 'Đánh giá tiến bộ', '/coach/training?tab=progress'],
    [CalendarDays, 'Xem lịch giảng dạy', '/coach/training?tab=sessions'],
  ]
  return <section className={styles.panel}><h2>Thao tác nhanh</h2><div className={styles.quickActions}>{actions.map(([Icon, label, to]) => <Link to={to} key={label}><Icon size={18} aria-hidden="true" /><span>{label}</span><ArrowUpRight size={15} aria-hidden="true" /></Link>)}</div></section>
}

function PendingSummary({ items }) {
  return <section className={styles.pending}><div className={styles.inline}><ClipboardCheck size={19} aria-hidden="true" /><h2>Cần hoàn tất</h2></div>
    <p>{items.length ? `${items.length} buổi đang mở điểm danh, chưa được chốt.` : 'Hiện không có buổi nào đang cần chốt điểm danh.'}</p>
    <Link className={styles.textLink} to="/coach?view=attendance">Xem các buổi cần chốt →</Link>
  </section>
}

function RecentActivities({ activities }) {
  const labels = { TRAINING_ATTENDANCE_SAVE: 'Lưu điểm danh', TRAINING_PLAN_CREATE: 'Tạo kế hoạch', TRAINING_PLAN_UPDATE: 'Cập nhật kế hoạch', TRAINING_RESULT_SAVE: 'Ghi kết quả tập luyện', TRAINING_EVALUATION_SAVE: 'Lưu đánh giá tiến bộ' }
  return <section className={styles.panel}><h2>Hoạt động gần đây</h2>{activities.length ? <ol className={styles.activityList}>{activities.map(a => <li key={a.id}><span className={styles.activityDot} /><div><strong>{a.finalized ? 'Chốt điểm danh' : labels[a.action]}</strong><p>Bản ghi #{a.resourceId}</p><time dateTime={a.occurredAt}>{dateTime(a.occurredAt)}</time></div></li>)}</ol> : <p className={styles.muted}>Các lần lưu điểm danh, kế hoạch, kết quả và đánh giá của bạn sẽ xuất hiện ở đây.</p>}</section>
}

function Profile({ user }) {
  const fields = [['Họ tên', user?.fullName], ['Email', user?.email], ['Điện thoại', user?.phone]]
  return <section className={styles.panel}><h2>Thông tin huấn luyện viên</h2><dl className={styles.profile}>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl><p className={styles.muted}>Cập nhật hồ sơ chuyên môn bằng biểu mẫu bên dưới.</p></section>
}

function SportLabel({ name }) {
  const normalized = (name || '').toLocaleLowerCase('vi')
  const Icon = normalized.includes('bơi') ? Waves : normalized.includes('yoga') ? Flower2 : normalized.includes('box') ? Swords : normalized.includes('chuyền') ? Volleyball : Dumbbell
  return <span className={styles.sport}><Icon size={14} aria-hidden="true" />{name || 'Bộ môn'}</span>
}
