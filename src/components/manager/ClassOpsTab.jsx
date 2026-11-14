import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { scheduleService } from '../../services/scheduleService'
import { formatVND, formatDate } from '../../utils/format'
import { groupByClass, scheduleText } from '../../utils/schedule'
import ClassStatusBadge from './ClassStatusBadge'
import ReasonDialog from '../common/ReasonDialog'
import { revealById } from '../../utils/reveal'
import styles from '../../css/manager/ManagerDashboard.module.css'
import ui from '../../css/manager/ManagerUi.module.css'

const SESSION_VI = { SCHEDULED: 'Sắp diễn ra', DONE: 'Đã diễn ra', CANCELED_BY_CENTER: 'Trung tâm hủy', CANCELED_BY_COACH: 'Coach hủy', CANCELED: 'Đã hủy' }
const DAYS =[[1, 'Thứ 2'], [2, 'Thứ 3'], [3, 'Thứ 4'], [4, 'Thứ 5'], [5, 'Thứ 6'], [6, 'Thứ 7'], [7, 'Chủ nhật']]

// Lớp nháp: trình thiết lập 4 bước (thông tin, lịch tuần, các buổi học, mở đăng ký).
// Lớp đã mở: quản lý buổi học, đổi coach, hủy buổi và học bù, hàng chờ
const TABS = [['overview', 'Tổng quan'], ['schedule', 'Lịch & buổi học'], ['students', 'Học viên & hàng chờ']]
const REG_STATUS = { REGISTERED: 'Đã ghi danh', PENDING_PAYMENT: 'Chờ thanh toán', LEFT: 'Đã rời lớp' }

// onBack: có thì đây là trang riêng của một lớp (3 tab, nút quay lại danh sách lớp)
export default function ClassOpsTab({ initialClassId, hideList, onBack }) {
  const { token } = useAuth()
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [coaches, setCoaches] = useState([])
  const [rooms, setRooms] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [bySchedule, setBySchedule] = useState({})
  const [classId, setClassId] = useState(initialClassId ? String(initialClassId) : '')
  const topRef = useRef(null)
  const [cls, setCls] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [saved, setSaved] = useState([])
  const [sessions, setSessions] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [roster, setRoster] = useState([])
  const [tab, setTab] = useState('overview')
  const [ask, setAsk] = useState(null) // { kind: 'coach' | 'session', session? } đang chờ nhập lý do
  const [newCoachId, setNewCoachId] = useState('')
  const [proposals, setProposals] = useState({ sessionId: null, list: [] })
  const [edit, setEdit] = useState(null) // { session, roomId, coachId } đang đổi phòng hoặc coach của một buổi
  const [stepPick, setStepPick] = useState(null) // lớp nháp: phần đang mở để sửa ('schedule' | 'sessions'); null = đóng hết

  // Danh mục dùng chung
  useEffect(() => {
    Promise.all([
      managerService.getClasses(token),
      managerService.getAccounts(token),
      managerService.getRooms(token),
      managerService.getTimeSlots(token),
      scheduleService.getAll(token),
    ]).then(([c, a, r, t, all]) => {
      setBySchedule(groupByClass(all))
      setClasses(c)
      setCoaches(a.filter((u) => u.role === 'COACH'))
      setRooms(r)
      setTimeSlots(t)
    }).catch((err) => toast.error(err.message || 'Không thể tải danh mục'))
  }, [token, toast])

  const load = useCallback(async () => {
    if (!classId) return
    try {
      const [c, sch, ses, wl, rs] = await Promise.all([
        managerService.getClass(token, classId),
        scheduleService.getByClass(token, classId),
        managerService.getClassSessions(token, classId),
        managerService.getClassWaitlist(token, classId),
        managerService.getClassRoster(token, classId).catch(() => []),
      ])
      setRoster(rs)
      setCls(c)
      setSaved(Array.isArray(sch) ? sch : [])
      setSchedules((Array.isArray(sch) ? sch : []).map((s) => ({ roomId: s.roomId, dayOfWeek: s.dayOfWeek, timeSlotId: s.timeSlotId })))
      setSessions(ses)
      setWaitlist(wl)
      setProposals({ sessionId: null, list: [] })
      setEdit(null)
    } catch (err) {
      toast.error(err.message || 'Không thể tải lớp')
    }
  }, [token, classId, toast])

  useEffect(() => {
    setCls(null)
    load()
  }, [load])

  // Được mở từ nơi khác (ví dụ vừa tạo lớp ở tab Khóa học): cuộn tới khung vận hành khi lớp tải xong
  useEffect(() => {
    if (hideList && cls) topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hideList, cls?.id])

  const run = async (action, okMsg, failMsg) => {
    try {
      await action()
      toast.success(okMsg)
      load()
      return true
    } catch (err) {
      toast.error(err.message || failMsg)
      return false
    }
  }

  // Công bố lớp: sinh các buổi học (nếu chưa có) rồi mở đăng ký, để manager bấm một lần thay vì hai lần đúng thứ tự
  const publish = async () => {
    if (sessions.length === 0 && !(await run(() => managerService.generateClassSessions(token, cls.id), 'Đã tạo các buổi học', 'Tạo buổi học thất bại'))) return
    if (await run(() => managerService.openClass(token, cls.id), 'Đã mở đăng ký, hội viên đã đăng ký được lớp này', 'Mở đăng ký thất bại')) setStepPick(null)
  }

  const saveSchedule = async () => {
    if (await run(() => managerService.replaceClassSchedules(token, cls.id, schedules), 'Đã lưu lịch tuần', 'Lưu lịch tuần thất bại')) setStepPick(null)
  }

  const generate = () => run(() => managerService.generateClassSessions(token, cls.id), 'Đã tạo các buổi học theo lịch tuần', 'Tạo buổi học thất bại')

  // Đổi phòng hoặc coach của một buổi chưa diễn ra; ngày giờ giữ nguyên (muốn dời giờ thì hủy buổi rồi xếp học bù)
  const openEdit = (s) => {
    setEdit({ session: s, roomId: String(s.roomId), coachId: String(s.coachId) })
    revealById('session-edit')
  }

  const showProposals = async (sessionId) => {
    try {
      setProposals({ sessionId, list: await managerService.getMakeupProposals(token, sessionId) })
      revealById('makeup-proposals')
    } catch (err) {
      toast.error(err.message || 'Không thể tải đề xuất học bù')
    }
  }

  const setRow = (i, patch) => setSchedules((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  // Lớp nháp: một danh sách việc cần có (thông tin, lịch tuần, các buổi học) với nút Sửa từng phần, cuối là Mở đăng ký.
  // Lớp đã mở thì không còn phần thiết lập, chỉ còn quản lý (buổi học, đổi coach, hàng chờ)
  const draft = cls?.status === 'DRAFT'
  const paged = Boolean(onBack)
  const showSchedule = paged ? tab === 'schedule' : (!draft || stepPick === 'schedule' || saved.length === 0)
  const showSessions = paged ? tab === 'schedule' : (!draft || stepPick === 'sessions')
  const showOverview = !paged || tab === 'overview'
  const showStudents = paged ? tab === 'students' : !draft
  const editPart = (part) => (paged ? setTab('schedule') : setStepPick(stepPick === part ? null : part))
  const weekText = saved.map((r) => `${DAYS.find(([v]) => v === r.dayOfWeek)?.[1] || r.dayOfWeekName} ${String(r.startTime).slice(0, 5)} · ${r.roomName}`).join('; ')
  const stepList = cls && !draft ? [
    ['Mở đăng ký', true],
    [cls.status === 'COMPLETED' ? 'Đã kết thúc' : cls.status === 'IN_PROGRESS' ? 'Đang học' : `Đang học từ ${formatDate(cls.startDate)}`, cls.status === 'COMPLETED'],
  ] : []
  const currentStep = stepList.findIndex(([, done]) => !done)

  // Số buổi bù đã xếp (còn hiệu lực hoặc đã học) đủ bù cho mọi buổi trung tâm đã hủy thì không cần đề xuất hay hoàn tiền nữa
  // (cùng cách đếm với backend)
  const canceledCount = sessions.filter((s) => s.status === 'CANCELED_BY_CENTER' && !s.makeup).length
  const makeupCount = sessions.filter((s) => s.makeup && (s.status === 'SCHEDULED' || s.status === 'DONE')).length
  const allMadeUp = makeupCount >= canceledCount

  // Nằm dưới bảng lớp: danh sách lớp đã có ở bảng trên, chưa chọn lớp thì không hiện gì
  if (hideList && !classId) return null

  return (
    <>
      {paged && (
        <div className={ui.pageTop}>
          <button type="button" className={ui.back} onClick={onBack}>← Danh sách lớp</button>
          {cls && (
            <div className={ui.pageTabs} role="tablist" aria-label="Các phần của lớp">
              {TABS.map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                  {label}{id === 'students' && roster.length ? ` (${roster.filter((r) => r.status !== 'LEFT').length})` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {showOverview && <div className={styles.card} ref={topRef} style={{ scrollMarginTop: '5rem' }}>
        <h2 className={styles.cardTitle}>{cls ? `${draft ? 'Thiết lập lớp' : 'Quản lý lớp'}: ${cls.name}` : 'Quản lý lớp học'}</h2>
        {!hideList && <p className={styles.hint}>Bấm vào một lớp để thiết lập hoặc quản lý.</p>}
        {!hideList && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {classes.map((c) => (
            <button key={c.id} type="button" onClick={() => setClassId(String(c.id))}
              style={{ textAlign: 'left', color: 'inherit', padding: '1rem', background: 'var(--bg-primary)', border: `1px solid ${String(c.id) === classId ? 'var(--accent, var(--accent-blue))' : 'var(--border-color)'}`, cursor: 'pointer' }}>
              <strong>{c.name}</strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem' }}><ClassStatusBadge status={c.status} /> Coach {c.coachName}</div>
              <div className="text-hint">Khai giảng {formatDate(c.startDate)}</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>{scheduleText(bySchedule[c.id])}</div>
            </button>
          ))}
        </div>}

        {cls && (
          <div style={{ marginTop: '1rem' }}>
            <p>
              <strong>{cls.name}</strong> · {cls.categoryName} · Coach {cls.coachName} · {formatVND(cls.tuition)} · khai giảng {formatDate(cls.startDate)} · <ClassStatusBadge status={cls.status} />
            </p>
            {draft ? (
              <div className={ui.setup}>
                <ul className={ui.checklist} aria-label="Thiết lập lớp">
                  <li className={ui.ok}>
                    <span className={ui.mark} aria-hidden="true">✓</span>
                    <div><b>Thông tin lớp</b><span>Sĩ số tối đa {cls.maxCapacity} · học phí {formatVND(cls.tuition)} · khai giảng {formatDate(cls.startDate)}</span></div>
                  </li>
                  <li className={saved.length ? ui.ok : ''}>
                    <span className={ui.mark} aria-hidden="true">{saved.length ? '✓' : '2'}</span>
                    <div><b>Lịch tuần</b><span>{saved.length ? weekText : 'Chưa có. Thêm các buổi lặp lại mỗi tuần ở bên dưới.'}</span></div>
                    {saved.length > 0 && <button type="button" className={styles.btnAction} onClick={() => editPart('schedule')}>{!paged && stepPick === 'schedule' ? 'Đóng' : 'Sửa'}</button>}
                  </li>
                  <li className={sessions.length ? ui.ok : ''}>
                    <span className={ui.mark} aria-hidden="true">{sessions.length ? '✓' : '3'}</span>
                    <div><b>Các buổi học</b><span>{sessions.length ? `${sessions.length} buổi, từ ${formatDate(sessions[0].sessionDate)} đến ${formatDate(sessions[sessions.length - 1].sessionDate)}` : saved.length ? 'Hệ thống sẽ tạo đủ các buổi theo lịch tuần khi bạn mở đăng ký.' : 'Có lịch tuần rồi mới tạo được.'}</span></div>
                    {sessions.length > 0 && <button type="button" className={styles.btnAction} onClick={() => editPart('sessions')}>{!paged && stepPick === 'sessions' ? 'Đóng' : 'Xem'}</button>}
                  </li>
                </ul>
                <div className={ui.setupFoot}>
                  <span>{saved.length ? 'Hội viên chỉ thấy và đăng ký được lớp sau khi mở đăng ký.' : 'Cần có lịch tuần trước khi mở đăng ký.'}</span>
                  <button type="button" className={ui.btn} disabled={saved.length === 0} onClick={publish}>Mở đăng ký</button>
                </div>
              </div>
            ) : (
              <ol className={ui.steps} aria-label="Tình trạng lớp">
                {stepList.map(([label, done], i) => <li key={label} className={`${ui.step} ${done ? ui.done : ''} ${i === currentStep ? ui.now : ''}`} aria-current={i === currentStep ? 'step' : undefined}>{label}</li>)}
              </ol>
            )}
            {cls.status === 'OPEN' && <div className={ui.callout}><p>Lớp đang mở đăng ký. Đến ngày khai giảng hệ thống tự chuyển sang "Đang học".</p></div>}
            {['OPEN', 'IN_PROGRESS'].includes(cls.status) && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {sessions.length === 0 && (
                <button type="button" className={styles.btnAction} onClick={generate}>Tạo các buổi học theo lịch tuần</button>
              )}
              <select className={styles.select} value={newCoachId} onChange={(e) => setNewCoachId(e.target.value)}>
                <option value="">Đổi coach sang...</option>
                {coaches
                  .filter((c) => (c.active ?? c.isActive) !== false && c.id !== cls.coachId && (c.sports || []).some((s) => s.id === cls.categoryId))
                  .map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
              <button type="button" className={styles.btnAction} disabled={!newCoachId} onClick={() => setAsk({ kind: 'coach' })}>
                Đổi coach
              </button>
            </div>
            )}
          </div>
        )}
      </div>}

      {cls && (
        <>
          {showSchedule && <div className={styles.card}>
            <h2 className={styles.cardTitle}>Lịch học hằng tuần</h2>
            <h3 style={{ marginBottom: '0.5rem' }}>Lịch đang áp dụng</h3>
            {saved.length === 0 ? <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Lớp này chưa có lịch hằng tuần. Thêm buổi bên dưới rồi bấm lưu.</p> : (
              <ul style={{ listStyle: 'none', display: 'grid', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {saved.map((r) => (
                  <li key={r.id}><strong>{DAYS.find(([v]) => v === r.dayOfWeek)?.[1] || r.dayOfWeekName}</strong> · {String(r.startTime).slice(0, 5)} - {String(r.endTime).slice(0, 5)} · {r.roomName}, {r.floor}</li>
                ))}
              </ul>
            )}
            <h3 style={{ marginBottom: '0.5rem' }}>Chỉnh sửa</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Mỗi dòng là một buổi lặp lại hằng tuần: chọn thứ, khung giờ và phòng. Bấm "Lưu lịch học" sẽ thay toàn bộ lịch hiện tại bằng các dòng dưới đây.</p>
            {schedules.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'end' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Thứ<br />
                <select className={styles.select} value={s.dayOfWeek} onChange={(e) => setRow(i, { dayOfWeek: Number(e.target.value) })}>
                  {DAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></label>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Khung giờ<br />
                <select className={styles.select} value={s.timeSlotId || ''} onChange={(e) => setRow(i, { timeSlotId: Number(e.target.value) })}>
                  <option value="">Chọn khung giờ</option>
                  {timeSlots.map((t) => <option key={t.id} value={t.id}>Khung {t.slotNo}: {String(t.startTime).slice(0, 5)} - {String(t.endTime).slice(0, 5)}{t.active ? '' : ' (đang khóa)'}</option>)}
                </select></label>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phòng<br />
                <select className={styles.select} value={s.roomId || ''} onChange={(e) => setRow(i, { roomId: Number(e.target.value) })}>
                  <option value="">Chọn phòng</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.roomName}</option>)}
                </select></label>
                <button type="button" className={styles.btnDanger} onClick={() => setSchedules(schedules.filter((_, idx) => idx !== i))}>Xóa</button>
              </div>
            ))}
            <button type="button" className={styles.btnAction} onClick={() => setSchedules([...schedules, { dayOfWeek: 1, timeSlotId: '', roomId: '' }])}>
              + Thêm buổi mỗi tuần
            </button>{' '}
            <button type="button" className={draft ? ui.btn : styles.btnAction} disabled={schedules.length === 0} onClick={saveSchedule}>
              {draft ? 'Lưu lịch tuần' : 'Lưu lịch học'}
            </button>
          </div>}

          {showSessions && <div className={styles.card}>
            <h2 className={styles.cardTitle}>Các buổi học{sessions.length ? ` (${sessions.length})` : ''}</h2>
            {sessions.length === 0 ? <p className="text-muted">Chưa có buổi học nào.</p> : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Buổi</th>
                      <th className={styles.th}>Ngày giờ</th>
                      <th className={styles.th}>Phòng</th>
                      <th className={styles.th}>Coach</th>
                      <th className={styles.th}>Trạng thái</th>
                      <th className={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className={styles.row}>
                        <td className={styles.td}>Buổi {s.sessionNo}{s.makeup ? ' (bù)' : ''}</td>
                        <td className={styles.td}>{formatDate(s.sessionDate)} {String(s.startTime).slice(0, 5)}-{String(s.endTime).slice(0, 5)}</td>
                        <td className={styles.td}>{s.roomName}</td>
                        <td className={styles.td}>{s.coachName}</td>
                        <td className={styles.td}>{SESSION_VI[s.status] || s.status}{s.cancelReason ? ` (${s.cancelReason})` : ''}</td>
                        <td className={styles.td}>
                          {s.status === 'SCHEDULED' && (
                            <>
                              <button type="button" className={styles.btnAction} onClick={() => openEdit(s)}>Đổi phòng/coach</button>{' '}
                              <button type="button" className={styles.btnDanger} onClick={() => setAsk({ kind: 'session', session: s })}>
                                Hủy buổi
                              </button>
                            </>
                          )}
                          {s.status === 'CANCELED_BY_CENTER' && allMadeUp && <span className="text-muted">Đã xếp học bù</span>}
                          {s.status === 'CANCELED_BY_CENTER' && !allMadeUp && (
                            <>
                              <button type="button" className={styles.btnAction} onClick={() => showProposals(s.id)}>Đề xuất học bù</button>{' '}
                              <button type="button" className={styles.btnAction}
                                onClick={() => run(() => managerService.refundInsteadOfMakeup(token, s.id), 'Đã hoàn tiền thay học bù', 'Hoàn tiền thất bại')}>
                                Hoàn tiền thay học bù
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {edit && (
              <div id="session-edit" style={{ marginTop: '1rem', display: 'grid', gap: '0.6rem' }}>
                <h3>Đổi phòng hoặc coach cho buổi {edit.session.sessionNo} ngày {formatDate(edit.session.sessionDate)}</h3>
                <p className="text-muted">Ngày và giờ giữ nguyên. Muốn dời giờ thì hủy buổi rồi xếp học bù.</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <select className={styles.select} aria-label="Phòng" value={edit.roomId} onChange={(e) => setEdit({ ...edit, roomId: e.target.value })}>
                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.roomName}</option>)}
                  </select>
                  <select className={styles.select} aria-label="Coach" value={edit.coachId} onChange={(e) => setEdit({ ...edit, coachId: e.target.value })}>
                    {coaches
                      .filter((c) => String(c.id) === String(edit.session.coachId)
                        || ((c.active ?? c.isActive) !== false && (c.sports || []).some((sp) => sp.id === cls.categoryId)))
                      .map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                  </select>
                  <button type="button" className={styles.btnAction}
                    disabled={String(edit.roomId) === String(edit.session.roomId) && String(edit.coachId) === String(edit.session.coachId)}
                    onClick={() => run(() => managerService.updateSession(token, edit.session.id, { roomId: Number(edit.roomId), coachId: Number(edit.coachId) }), 'Đã đổi phòng/coach của buổi học', 'Đổi phòng/coach thất bại')}>
                    Lưu thay đổi
                  </button>
                  <button type="button" className={styles.btnAction} onClick={() => setEdit(null)}>Đóng</button>
                </div>
              </div>
            )}
            {proposals.sessionId && (
              <div id="makeup-proposals" style={{ marginTop: '1rem' }}>
                <h3>Ngày học bù đề xuất cho buổi #{proposals.sessionId}</h3>
                {proposals.list.length === 0 ? <p className="text-muted">Không có ngày phù hợp, nên hoàn tiền.</p> : proposals.list.map((p) => (
                  <div key={`${p.date}-${p.roomId}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span>{formatDate(p.date)} {String(p.startTime).slice(0, 5)}-{String(p.endTime).slice(0, 5)} · {p.roomName} · {p.conflictedMembers} học viên trùng lịch</span>
                    <button type="button" className={styles.btnAction}
                      onClick={() => run(() => managerService.chooseMakeup(token, proposals.sessionId, p.date), 'Đã xếp buổi học bù', 'Xếp học bù thất bại')}>
                      Chọn ngày này
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>}


          {showStudents && paged && <div className={styles.card}>
            <h2 className={styles.cardTitle}>Học viên ({roster.filter((r) => r.status !== 'LEFT').length}/{cls.maxCapacity})</h2>
            {roster.length === 0 ? <p className="text-muted">Chưa có học viên nào đăng ký.</p> : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th className={styles.th}>Học viên</th><th className={styles.th}>Trạng thái</th><th className={styles.th}>Đi học</th></tr></thead>
                  <tbody>
                    {roster.map((r) => (
                      <tr key={r.registrationId} className={styles.row}>
                        <td className={styles.td}><strong>{r.memberName}</strong>{r.phone ? <><br /><span className={styles.hint}>{r.phone}</span></> : null}</td>
                        <td className={styles.td}>{REG_STATUS[r.status] || r.status}</td>
                        <td className={styles.td}>{r.marked ? `${r.present}/${r.marked} buổi có mặt` : 'Chưa có buổi điểm danh'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>}

          {showStudents && <div className={styles.card}>
            <h2 className={styles.cardTitle}>Hàng chờ</h2>
            {waitlist.length === 0 ? <p className="text-muted">Không có ai trong hàng chờ.</p> : (
              <ol style={{ paddingLeft: '1.2rem' }}>
                {waitlist.map((w) => <li key={w.id}>{w.memberName} · đăng ký lúc {new Date(w.registeredAt).toLocaleString('vi-VN')}</li>)}
              </ol>
            )}
          </div>}
        </>
      )}
      <ReasonDialog
        isOpen={!!ask}
        title={ask?.kind === 'coach' ? 'Đổi coach cho cả lớp' : 'Hủy buổi học'}
        message={ask?.kind === 'coach'
          ? `Đổi coach của lớp ${cls?.name || ''} sang ${coaches.find((c) => String(c.id) === String(newCoachId))?.fullName || 'coach đã chọn'}? Học viên sẽ được thông báo.`
          : ask ? `Hủy buổi ${ask.session.sessionNo} ngày ${formatDate(ask.session.sessionDate)}? Học viên không bị tính vắng, được báo qua ứng dụng và email, và bạn chọn ngày học bù sau.` : ''}
        label={ask?.kind === 'coach' ? 'Lý do đổi coach' : 'Lý do hủy buổi'}
        confirmText={ask?.kind === 'coach' ? 'Đổi coach' : 'Hủy buổi'}
        onConfirm={(reason) => {
          const current = ask
          setAsk(null)
          if (current.kind === 'coach') run(() => managerService.replaceClassCoach(token, cls.id, Number(newCoachId), reason), 'Đã đổi coach', 'Đổi coach thất bại')
          else run(() => managerService.cancelSession(token, current.session.id, reason), 'Đã hủy buổi học', 'Hủy buổi học thất bại')
        }}
        onCancel={() => setAsk(null)}
      />
    </>
  )
}
