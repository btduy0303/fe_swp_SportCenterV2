import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import { hhmm } from '../../utils/schedule'
import { formatVND } from '../../utils/format'
import ConfirmModal from '../common/ConfirmModal'
import styles from '../../css/manager/ManagerDashboard.module.css'

const GAP_MINUTES = 15
const labelStyle = { display: 'grid', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }
const minutes = (t) => Number(String(t).slice(0, 2)) * 60 + Number(String(t).slice(3, 5))

// Coach nghỉ (có thời hạn hoặc nghỉ việc hẳn): xem các buổi học bị ảnh hưởng, tìm người dạy thay trước,
// buổi nào không có người thay thì mới hủy để xếp bù hoặc hoàn tiền. Nghỉ việc hẳn xử lý thêm các suất 1-1
export default function CoachLeavePanel({ coaches, onOpenClass }) {
  const { token } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ type: 'temp', coachId: '', from: '', to: '', reason: '' })
  const [data, setData] = useState(null) // { sessions: mọi buổi sắp tới của mọi lớp, affected: [id buổi] }
  const [picks, setPicks] = useState({})
  const [done, setDone] = useState({})
  const [confirm, setConfirm] = useState(null) // { title, message, confirmText, onConfirm }
  const [slotResult, setSlotResult] = useState(null)
  const [classPicks, setClassPicks] = useState({})
  const [result, setResult] = useState(null) // các buổi vừa bị hủy: [{ id, classId, className, sessionNo, sessionDate }]

  const today = new Date().toLocaleDateString('sv-SE')
  const resign = form.type === 'resign'
  // Nghỉ việc hẳn: mọi buổi từ hôm nay trở đi
  const range = resign ? { from: today, to: '2099-12-31' } : { from: form.from, to: form.to }
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()

  const load = async () => {
    try {
      // shortcut: API lịch theo khoảng ngày giới hạn 90 ngày, nên nghỉ việc hẳn chỉ xét 90 ngày tới; lớp dài hơn thì cần nâng giới hạn
      const until = new Date(Date.now() + 89 * 86400000).toLocaleDateString('sv-SE')
      const [all, rows] = await Promise.all([
        managerService.getClasses(token),
        managerService.getSessionsBetween(token, today, range.to < until ? range.to : until),
      ])
      const classes = new Map(all.filter((c) => ['OPEN', 'IN_PROGRESS'].includes(c.status)).map((c) => [c.id, c]))
      const sessions = rows.filter((s) => s.status === 'SCHEDULED' && classes.has(s.classId))
        .map((s) => ({ ...s, categoryId: classes.get(s.classId).categoryId, classCoachId: classes.get(s.classId).coachId }))
      const affected = sessions
        .filter((s) => String(s.coachId) === String(form.coachId) && s.sessionDate >= range.from && s.sessionDate <= range.to
          && (s.sessionDate > today || (s.sessionDate === today && minutes(s.endTime) > nowMin)))
        .map((s) => s.id)
      setData({ sessions, affected })
      setPicks({})
      setDone({})
      setClassPicks({})
      setResult(null)
      setSlotResult(null)
    } catch (err) {
      toast.error(err.message || 'Không thể tải các buổi bị ảnh hưởng')
    }
  }

  const byId = (id) => data.sessions.find((s) => s.id === id)

  // Coach có dạy đúng môn của lớp và không trùng buổi nào khác (cách nhau tối thiểu 15 phút)
  const candidatesFor = (s) => coaches
    .filter((c) => String(c.id) !== String(form.coachId) && (c.sports || []).some((x) => x.id === s.categoryId))
    .map((c) => {
      const busy = data.sessions.some((o) => o.id !== s.id && o.coachId === c.id && o.sessionDate === s.sessionDate
        && minutes(s.startTime) < minutes(o.endTime) + GAP_MINUTES && minutes(s.endTime) + GAP_MINUTES > minutes(o.startTime))
      return { ...c, busy }
    })

  const assign = async (s) => {
    const coach = coaches.find((c) => String(c.id) === String(picks[s.id]))
    try {
      await managerService.updateSession(token, s.id, { roomId: s.roomId, coachId: coach.id })
      toast.success(`Đã giao buổi ${s.sessionNo} của ${s.className} cho ${coach.fullName}`)
      setDone((d) => ({ ...d, [s.id]: coach.fullName }))
      setData((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === s.id ? { ...x, coachId: coach.id } : x)) }))
    } catch (err) {
      toast.error(err.message || 'Giao buổi học thất bại')
    }
  }

  // Lớp mà coach nghỉ là coach gốc: có thể giao cả lớp cho người khác dạy hết các buổi còn lại
  const wholeClasses = data ? [...new Map(data.affected.map(byId).filter((s) => String(s.classCoachId) === String(form.coachId)).map((s) => [s.classId, s])).values()] : []

  const classCandidates = (cls) => {
    const upcoming = data.sessions.filter((s) => s.classId === cls.classId && String(s.coachId) === String(form.coachId))
    return coaches
      .filter((c) => String(c.id) !== String(form.coachId) && (c.sports || []).some((x) => x.id === cls.categoryId))
      .map((c) => ({ ...c, busy: upcoming.some((s) => data.sessions.some((o) => o.classId !== s.classId && o.coachId === c.id && o.sessionDate === s.sessionDate
        && minutes(s.startTime) < minutes(o.endTime) + GAP_MINUTES && minutes(s.endTime) + GAP_MINUTES > minutes(o.startTime))) }))
  }

  const assignClass = async (cls) => {
    const coach = coaches.find((c) => String(c.id) === String(classPicks[cls.classId]))
    try {
      await managerService.replaceClassCoach(token, cls.classId, coach.id, form.reason.trim() || 'Coach nghỉ dài ngày')
      toast.success(`Đã giao cả lớp ${cls.className} cho ${coach.fullName}`)
      await load()
    } catch (err) {
      toast.error(err.message || 'Đổi coach cả lớp thất bại')
    }
  }

  // Suất 1-1 của coach nghỉ việc: BE tự đổi sang coach khác rảnh cùng giờ, không có thì hủy và hoàn tiền
  const handleSlots = async () => {
    setConfirm(null)
    try {
      setSlotResult(await managerService.cancelCoachSlots(token, form.coachId, reasonText))
    } catch (err) {
      toast.error(err.message || 'Xử lý suất 1-1 thất bại')
    }
  }

  const reasonText = form.reason.trim() || (resign ? 'Coach nghỉ việc' : '')

  const cancelRest = async () => {
    setConfirm(null)
    try {
      const canceled = await managerService.coachLeave(token, form.coachId, { from: range.from, to: range.to, reason: reasonText })
      toast.success(`Đã hủy ${canceled.length} buổi chưa có người thay`)
      setResult(canceled.map((c) => ({ id: c.id, classId: c.classId, sessionNo: c.sessionNo, sessionDate: c.sessionDate, className: byId(c.id)?.className })))
      setData(null)
    } catch (err) {
      toast.error(err.message || 'Ghi nhận nghỉ thất bại')
    }
  }

  const remaining = data ? data.affected.filter((id) => !done[id]) : []
  const coachName = coaches.find((c) => String(c.id) === String(form.coachId))?.fullName

  return (
    <div>
      <p className={styles.hint}>
        Chọn coach và loại nghỉ để xem các buổi bị ảnh hưởng. Hãy tìm người dạy thay trước. Buổi nào không có ai thay được thì mới hủy để xếp học bù hoặc hoàn tiền.
        Với nghỉ việc hẳn, hệ thống xử lý thêm các suất tập 1-1 của coach.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); load() }} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={labelStyle}>Coach
          <select required className={styles.select} value={form.coachId} onChange={(e) => { setForm({ ...form, coachId: e.target.value }); setData(null) }}>
            <option value="">Chọn coach</option>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Loại nghỉ
          <select className={styles.select} value={form.type} onChange={(e) => { setForm({ ...form, type: e.target.value }); setData(null); setResult(null); setSlotResult(null) }}>
            <option value="temp">Nghỉ có thời hạn (từ ngày đến ngày)</option>
            <option value="resign">Nghỉ việc hẳn (từ hôm nay)</option>
          </select>
        </label>
        {!resign && (
          <>
            <label style={labelStyle}>Nghỉ từ ngày
              <input required type="date" className={styles.input} value={form.from} onChange={(e) => { setForm({ ...form, from: e.target.value }); setData(null) }} />
            </label>
            <label style={labelStyle}>Đến ngày
              <input required type="date" className={styles.input} value={form.to} onChange={(e) => { setForm({ ...form, to: e.target.value }); setData(null) }} />
            </label>
          </>
        )}
        <button type="submit" className={styles.btnAction}>Xem các buổi bị ảnh hưởng</button>
      </form>

      {data && (
        <div style={{ marginTop: '1.5rem' }}>
          {data.affected.length === 0 ? (
            <p className="text-muted">Coach {coachName} không có buổi học nào cần xử lý.</p>
          ) : (
            <>
              <h3 style={{ marginBottom: '0.75rem' }}>{data.affected.length} buổi cần người thay</h3>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Lớp</th>
                      <th className={styles.th}>Buổi</th>
                      <th className={styles.th}>Ngày giờ</th>
                      <th className={styles.th}>Người dạy thay</th>
                      <th className={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.affected.map((id) => {
                      const s = byId(id)
                      const options = candidatesFor(s)
                      return (
                        <tr key={id} className={styles.row}>
                          <td className={styles.td}><strong>{s.className}</strong><br /><small className="text-muted">{s.roomName}</small></td>
                          <td className={styles.td}>#{s.sessionNo}</td>
                          <td className={styles.td}>{s.sessionDate}<br />{hhmm(s.startTime)}-{hhmm(s.endTime)}</td>
                          <td className={styles.td}>
                            {done[id] ? <span className={styles.statusActive}>Đã giao cho {done[id]}</span> : options.length === 0 ? (
                              <span className="text-muted">Không có coach nào dạy môn này</span>
                            ) : (
                              <select className={styles.select} value={picks[id] || ''} onChange={(e) => setPicks({ ...picks, [id]: e.target.value })}>
                                <option value="">Chọn người thay</option>
                                {options.map((c) => <option key={c.id} value={c.id} disabled={c.busy}>{c.fullName}{c.busy ? ' (trùng lịch)' : ' (rảnh)'}</option>)}
                              </select>
                            )}
                          </td>
                          <td className={styles.td}>
                            {!done[id] && <button type="button" className={styles.btnAction} disabled={!picks[id]} onClick={() => assign(s)}>Giao buổi này</button>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {wholeClasses.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>Hoặc giao cả lớp cho một người</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Người nhận sẽ dạy hết các buổi còn lại của lớp, không chỉ trong khoảng nghỉ. Dùng khi coach nghỉ lâu hoặc không quay lại.</p>
                  {wholeClasses.map((cls) => (
                    <div key={cls.classId} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ minWidth: 220 }}>{cls.className}</strong>
                      <select className={styles.select} value={classPicks[cls.classId] || ''} onChange={(e) => setClassPicks({ ...classPicks, [cls.classId]: e.target.value })}>
                        <option value="">Chọn người nhận cả lớp</option>
                        {classCandidates(cls).map((c) => <option key={c.id} value={c.id} disabled={c.busy}>{c.fullName}{c.busy ? ' (trùng lịch)' : ' (rảnh)'}</option>)}
                      </select>
                      <button type="button" className={styles.btnAction} disabled={!classPicks[cls.classId]} onClick={() => assignClass(cls)}>Giao cả lớp</button>
                    </div>
                  ))}
                </div>
              )}

              {remaining.length > 0 && (
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
                  <label style={{ ...labelStyle, flex: 1, minWidth: 240 }}>{resign ? 'Lý do (không bắt buộc)' : 'Lý do nghỉ (bắt buộc nếu hủy các buổi còn lại)'}
                    <input className={styles.input} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                  </label>
                  <button type="button" className={styles.btnDanger} disabled={!reasonText} onClick={() => setConfirm({
                    title: 'Hủy các buổi chưa có người thay',
                    message: `Hủy ${remaining.length} buổi của coach ${coachName}${resign ? '' : ` từ ${form.from} đến ${form.to}`}? Học viên sẽ được thông báo, sau đó bạn xếp học bù hoặc hoàn tiền ở "Vận hành lớp".`,
                    confirmText: 'Hủy các buổi này',
                    onConfirm: cancelRest,
                  })}>
                    Không có người thay: hủy {remaining.length} buổi còn lại
                  </button>
                </div>
              )}
              {remaining.length === 0 && <p style={{ color: 'var(--success)', marginTop: '1rem' }}>Tất cả các buổi đã có người dạy thay, không phải hủy buổi nào.</p>}
            </>
          )}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{result.length} buổi vừa bị hủy, cần xếp học bù hoặc hoàn tiền</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Học viên đã được thông báo và tặng voucher bù. Bấm vào lớp để chọn ngày học bù hoặc hoàn tiền từng buổi.</p>
          {[...new Map(result.map((r) => [r.classId, r])).values()].map((r) => (
            <div key={r.classId} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span><strong>{r.className}</strong>: buổi {result.filter((x) => x.classId === r.classId).map((x) => `#${x.sessionNo}`).join(', ')}</span>
              <button type="button" className={styles.btnAction} onClick={() => onOpenClass(r.classId)}>Xếp học bù / hoàn tiền</button>
            </div>
          ))}
        </div>
      )}

      {resign && (data || result) && (
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Bước 2: Suất tập 1-1 của coach</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Suất chưa có người đặt sẽ đóng. Suất đã có hội viên đặt sẽ chuyển cho coach khác rảnh cùng giờ (ưu tiên cùng hạng, rồi hạng cao hơn, cuối cùng hạng thấp hơn và hoàn chênh lệch giá). Không ai thay được thì hủy và hoàn đủ tiền.
            Nên xong bước 1 (các buổi học) rồi mới làm bước này.
          </p>
          {slotResult ? (
            <p style={{ color: 'var(--success)' }}>
              Đã xử lý: đóng {slotResult.closedOpenSlots} suất trống, chuyển {slotResult.reassignedBookings} suất đã đặt sang coach khác,
              hủy {slotResult.canceledBookings} suất không ai thay được. Tổng hoàn tiền {formatVND(slotResult.refundTotal)}.
            </p>
          ) : (
            <button type="button" className={styles.btnDanger} onClick={() => setConfirm({
              title: 'Xử lý suất 1-1 của coach nghỉ việc',
              message: `Xử lý mọi suất 1-1 sắp tới của coach ${coachName}? Suất đã đặt sẽ chuyển cho coach khác hoặc hủy và hoàn tiền cho hội viên.`,
              confirmText: 'Xử lý suất 1-1',
              onConfirm: handleSlots,
            })}>
              Xử lý suất 1-1 của coach
            </button>
          )}
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Xong cả hai bước, vào "Tài khoản nhân sự" để khóa tài khoản coach nếu không còn làm việc.</p>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmText={confirm?.confirmText || 'Xác nhận'}
        type="danger"
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
