import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { scheduleService } from '../../services/scheduleService'
import { formatVND } from '../../utils/format'
import { groupByClass, scheduleText } from '../../utils/schedule'
import ClassStatusBadge from './ClassStatusBadge'
import styles from '../../css/manager/ManagerDashboard.module.css'

const SESSION_VI = { SCHEDULED: 'Sắp diễn ra', DONE: 'Đã diễn ra', CANCELED_BY_CENTER: 'Trung tâm hủy', CANCELED_BY_COACH: 'Coach hủy', CANCELED: 'Đã hủy' }
const DAYS =[[1, 'Thứ 2'], [2, 'Thứ 3'], [3, 'Thứ 4'], [4, 'Thứ 5'], [5, 'Thứ 6'], [6, 'Thứ 7'], [7, 'Chủ nhật']]

// Vận hành một lớp: mở đăng ký, đổi coach, xếp lịch tuần, sinh buổi học, hủy buổi và học bù, hàng chờ
export default function ClassOpsTab({ onScheduled, initialClassId }) {
  const { token } = useAuth()
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [coaches, setCoaches] = useState([])
  const [rooms, setRooms] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [bySchedule, setBySchedule] = useState({})
  const [classId, setClassId] = useState(initialClassId ? String(initialClassId) : '')
  const [cls, setCls] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [saved, setSaved] = useState([])
  const [sessions, setSessions] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [reason, setReason] = useState('')
  const [newCoachId, setNewCoachId] = useState('')
  const [proposals, setProposals] = useState({ sessionId: null, list: [] })

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
      const [c, sch, ses, wl] = await Promise.all([
        managerService.getClass(token, classId),
        scheduleService.getByClass(token, classId),
        managerService.getClassSessions(token, classId),
        managerService.getClassWaitlist(token, classId),
      ])
      setCls(c)
      setSaved(Array.isArray(sch) ? sch : [])
      setSchedules((Array.isArray(sch) ? sch : []).map((s) => ({ roomId: s.roomId, dayOfWeek: s.dayOfWeek, timeSlotId: s.timeSlotId })))
      setSessions(ses)
      setWaitlist(wl)
      setProposals({ sessionId: null, list: [] })
    } catch (err) {
      toast.error(err.message || 'Không thể tải lớp')
    }
  }, [token, classId, toast])

  useEffect(() => {
    setCls(null)
    load()
  }, [load])

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

  const showProposals = async (sessionId) => {
    try {
      setProposals({ sessionId, list: await managerService.getMakeupProposals(token, sessionId) })
    } catch (err) {
      toast.error(err.message || 'Không thể tải đề xuất học bù')
    }
  }

  const setRow = (i, patch) => setSchedules((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Vận Hành Lớp Học</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Bấm vào một lớp để xếp lịch, mở đăng ký, đổi coach hoặc hủy buổi.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {classes.map((c) => (
            <button key={c.id} type="button" onClick={() => setClassId(String(c.id))}
              style={{ textAlign: 'left', color: 'inherit', padding: '1rem', background: 'var(--bg-primary)', border: `1px solid ${String(c.id) === classId ? 'var(--accent, #ff4d00)' : 'var(--border-color)'}`, cursor: 'pointer' }}>
              <strong>{c.name}</strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem' }}><ClassStatusBadge status={c.status} /> coach {c.coachName}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Khai giảng {c.startDate}</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>{scheduleText(bySchedule[c.id])}</div>
            </button>
          ))}
        </div>

        {cls && (
          <div style={{ marginTop: '1rem' }}>
            <p>
              <strong>{cls.name}</strong> · {cls.categoryName} · coach {cls.coachName} · {formatVND(cls.tuition)} · khai giảng {cls.startDate} · <ClassStatusBadge status={cls.status} />
            </p>
            {['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(cls.status) && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {cls.status === 'DRAFT' && (
                <button type="button" className={styles.btnAction}
                  onClick={() => run(() => managerService.openClass(token, cls.id), 'Đã mở đăng ký lớp', 'Mở đăng ký thất bại')}>
                  Mở đăng ký
                </button>
              )}
              <button type="button" className={styles.btnAction}
                onClick={async () => { if (await run(() => managerService.generateClassSessions(token, cls.id), 'Đã sinh các buổi học, đây là lịch tuần của cả trung tâm', 'Sinh buổi học thất bại')) onScheduled?.() }}>
                Sinh các buổi học
              </button>
              <select className={styles.select} value={newCoachId} onChange={(e) => setNewCoachId(e.target.value)}>
                <option value="">Đổi coach sang...</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
              <button type="button" className={styles.btnAction} disabled={!newCoachId || !reason.trim()}
                onClick={() => run(() => managerService.replaceClassCoach(token, cls.id, Number(newCoachId), reason.trim()), 'Đã đổi coach', 'Đổi coach thất bại')}>
                Đổi coach (cần nhập lý do)
              </button>
            </div>
            )}
            <input className={styles.input} style={{ marginTop: '0.75rem', width: '100%' }} placeholder="Lý do (dùng khi đổi coach, hủy buổi)" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
      </div>

      {cls && (
        <>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Lịch Học Hàng Tuần</h2>
            <h3 style={{ marginBottom: '0.5rem' }}>Lịch đang áp dụng</h3>
            {saved.length === 0 ? <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Lớp này chưa có lịch hằng tuần. Thêm buổi bên dưới rồi bấm "Lưu lịch học".</p> : (
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
            <button type="button" className={styles.btnAction}
              onClick={() => run(() => managerService.replaceClassSchedules(token, cls.id, schedules), 'Đã lưu lịch học', 'Lưu lịch học thất bại')}>
              Lưu lịch học
            </button>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Các Buổi Học</h2>
            {sessions.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Chưa có buổi học nào. Lưu lịch tuần rồi bấm "Sinh các buổi học".</p> : (
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
                        <td className={styles.td}>#{s.sessionNo}{s.makeup ? ' (bù)' : ''}</td>
                        <td className={styles.td}>{s.sessionDate} {String(s.startTime).slice(0, 5)}-{String(s.endTime).slice(0, 5)}</td>
                        <td className={styles.td}>{s.roomName}</td>
                        <td className={styles.td}>{s.coachName}</td>
                        <td className={styles.td}>{SESSION_VI[s.status] || s.status}{s.cancelReason ? ` (${s.cancelReason})` : ''}</td>
                        <td className={styles.td}>
                          {s.status === 'SCHEDULED' && (
                            <button type="button" className={styles.btnDanger} disabled={!reason.trim()}
                              onClick={() => run(() => managerService.cancelSession(token, s.id, reason.trim()), 'Đã hủy buổi học', 'Hủy buổi học thất bại')}>
                              Hủy buổi
                            </button>
                          )}
                          {s.status === 'CANCELED_BY_CENTER' && (
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
            {proposals.sessionId && (
              <div style={{ marginTop: '1rem' }}>
                <h3>Ngày học bù đề xuất cho buổi #{proposals.sessionId}</h3>
                {proposals.list.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Không có ngày phù hợp, nên hoàn tiền.</p> : proposals.list.map((p) => (
                  <div key={`${p.date}-${p.roomId}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span>{p.date} {String(p.startTime).slice(0, 5)}-{String(p.endTime).slice(0, 5)} · {p.roomName} · {p.conflictedMembers} học viên trùng lịch</span>
                    <button type="button" className={styles.btnAction}
                      onClick={() => run(() => managerService.chooseMakeup(token, proposals.sessionId, p.date), 'Đã xếp buổi học bù', 'Xếp học bù thất bại')}>
                      Chọn ngày này
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Hàng Chờ</h2>
            {waitlist.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Không có ai trong hàng chờ.</p> : (
              <ol style={{ paddingLeft: '1.2rem' }}>
                {waitlist.map((w) => <li key={w.id}>{w.memberName} · đăng ký lúc {new Date(w.registeredAt).toLocaleString('vi-VN')}</li>)}
              </ol>
            )}
          </div>
        </>
      )}
    </>
  )
}
