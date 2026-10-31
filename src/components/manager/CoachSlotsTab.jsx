import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { managerService } from '../../services/managerService'
import ConfirmModal from '../common/ConfirmModal'
import styles from '../../css/manager/ManagerDashboard.module.css'

const labelStyle = { display: 'grid', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)' }
const DAYS = [[1, 'T2'], [2, 'T3'], [3, 'T4'], [4, 'T5'], [5, 'T6'], [6, 'T7'], [7, 'CN']]
const STATUS = { OPEN: 'Còn trống', HELD: 'Đang giữ chỗ', BOOKED: 'Đã đặt', CANCELED: 'Đã hủy' }
const EMPTY = { coachId: '', sportCategoryId: '', roomId: '', fromDate: '', toDate: '', days: [], timeSlotIds: [] }
const when = (v) => new Date(v).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

// Trung tâm quyết định lịch 1-1: manager mở suất cho coach (hàng loạt), xóa suất trống, hủy suất đã có người đặt
export default function CoachSlotsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [coaches, setCoaches] = useState([])
  const [rooms, setRooms] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [result, setResult] = useState(null)
  const [slots, setSlots] = useState([])
  const [filter, setFilter] = useState({ coachId: '', status: '' })
  const [target, setTarget] = useState(null)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    Promise.all([managerService.getAccounts(token), managerService.getRooms(token), managerService.getTimeSlots(token)])
      .then(([accounts, r, t]) => {
        setCoaches(accounts.filter((u) => u.role === 'COACH' && u.active !== false))
        setRooms(r)
        setTimeSlots(t.filter((x) => x.active))
      })
      .catch((err) => toast.error(err.message || 'Không thể tải dữ liệu'))
  }, [token])

  const load = useCallback(async () => {
    try {
      setSlots(await managerService.getCoachSlots(token, filter))
    } catch (err) {
      toast.error(err.message || 'Không thể tải lịch 1-1')
    }
  }, [token, filter])

  useEffect(() => {
    load()
  }, [load])

  const coach = coaches.find((c) => String(c.id) === form.coachId)
  const coachSports = coach?.sports || []
  const roomsForSport = rooms.filter((r) => (r.sports || []).some((s) => String(s.id) === form.sportCategoryId))
  const toggle = (key, value) => setForm((f) => ({
    ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
  }))

  const create = async (e) => {
    e.preventDefault()
    try {
      const res = await managerService.createCoachSlots(token, {
        coachId: Number(form.coachId),
        sportCategoryId: Number(form.sportCategoryId),
        roomId: form.roomId ? Number(form.roomId) : null,
        fromDate: form.fromDate,
        toDate: form.toDate,
        daysOfWeek: form.days,
        timeSlotIds: form.timeSlotIds,
      })
      setResult(res)
      if (res.created > 0) toast.success(`Đã mở ${res.created} suất 1-1`)
      else toast.error('Không mở được suất nào, xem lý do bên dưới')
      load()
    } catch (err) {
      toast.error(err.message || 'Mở suất 1-1 thất bại')
    }
  }

  const act = async () => {
    setConfirm(false)
    try {
      if (target.status === 'OPEN') await managerService.deleteCoachSlot(token, target.id)
      else await managerService.cancelCoachSlot(token, target.id, reason.trim())
      toast.success(target.status === 'OPEN' ? 'Đã xóa suất' : 'Đã hủy suất, hội viên được hoàn tiền')
      setTarget(null)
      setReason('')
      load()
    } catch (err) {
      toast.error(err.message || 'Thao tác thất bại')
    }
  }

  const skippedLabel = (s) => {
    const t = timeSlots.find((x) => x.id === s.timeSlotId)
    return `${new Date(s.date).toLocaleDateString('vi-VN')}${t ? ` khung ${t.slotNo}` : ''}: ${s.reason}`
  }

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Mở Lịch 1-1 Cho Coach</h2>
        <form onSubmit={create} style={{ display: 'grid', gap: '1rem' }}>
          <div className="row-wrap-end">
            <label style={labelStyle}>Coach
              <select required className={styles.select} value={form.coachId}
                onChange={(e) => setForm({ ...form, coachId: e.target.value, sportCategoryId: '', roomId: '' })}>
                <option value="">Chọn coach</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Môn
              <select required className={styles.select} value={form.sportCategoryId} disabled={!coach}
                onChange={(e) => setForm({ ...form, sportCategoryId: e.target.value, roomId: '' })}>
                <option value="">{coach && coachSports.length === 0 ? 'Coach chưa được gán môn' : 'Chọn môn'}</option>
                {coachSports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Phòng
              <select className={styles.select} value={form.roomId} disabled={!form.sportCategoryId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                <option value="">Tự chọn phòng trống</option>
                {roomsForSport.map((r) => <option key={r.id} value={r.id}>{r.roomName}{r.floor ? ` · ${r.floor}` : ''}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Từ ngày
              <input required type="date" className={styles.input} value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
            </label>
            <label style={labelStyle}>Đến ngày
              <input required type="date" className={styles.input} value={form.toDate} min={form.fromDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <fieldset style={{ border: 0, padding: 0 }}>
              <legend style={labelStyle}>Các thứ trong tuần</legend>
              <div className="row-wrap">
                {DAYS.map(([v, l]) => (
                  <label key={v}><input type="checkbox" checked={form.days.includes(v)} onChange={() => toggle('days', v)} /> {l}</label>
                ))}
              </div>
            </fieldset>
            <fieldset style={{ border: 0, padding: 0 }}>
              <legend style={labelStyle}>Khung giờ</legend>
              <div className="row-wrap">
                {timeSlots.map((t) => (
                  <label key={t.id}>
                    <input type="checkbox" checked={form.timeSlotIds.includes(t.id)} onChange={() => toggle('timeSlotIds', t.id)} />
                    {' '}Khung {t.slotNo} ({String(t.startTime).slice(0, 5)}–{String(t.endTime).slice(0, 5)})
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div>
            <button type="submit" className={styles.btnAction} disabled={!form.days.length || !form.timeSlotIds.length}>Mở Suất 1-1</button>
          </div>
        </form>
        {result && result.skipped.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Đã mở {result.created} suất, bỏ qua {result.skipped.length} ô:</strong>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {result.skipped.map((s, i) => <li key={i}>{skippedLabel(s)}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Lịch 1-1 Của Trung Tâm</h2>
        <div className="toolbar">
          <select className={styles.select} value={filter.coachId} onChange={(e) => setFilter({ ...filter, coachId: e.target.value })}>
            <option value="">Tất cả coach</option>
            {coaches.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <select className={styles.select} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {slots.length === 0 ? (
          <p className="text-muted">Chưa có suất 1-1 nào.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Coach</th>
                  <th className={styles.th}>Môn</th>
                  <th className={styles.th}>Phòng</th>
                  <th className={styles.th}>Thời gian</th>
                  <th className={styles.th}>Hội viên</th>
                  <th className={styles.th}>Trạng thái</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.id} className={styles.row}>
                    <td className={styles.td}>{s.coachName}</td>
                    <td className={styles.td}>{s.sportName || '—'}</td>
                    <td className={styles.td}>{s.roomName ? `${s.roomName}${s.floor ? ` · ${s.floor}` : ''}` : '—'}</td>
                    <td className={styles.td}>{when(s.startAt)}</td>
                    <td className={styles.td}>{s.memberName || '—'}</td>
                    <td className={styles.td}>{STATUS[s.status] || s.status}</td>
                    <td className={styles.td}>
                      {s.status === 'OPEN' && (
                        <button type="button" className={styles.btnDanger} onClick={() => { setTarget(s); setConfirm(true) }}>Xóa</button>
                      )}
                      {(s.status === 'HELD' || s.status === 'BOOKED') && (
                        <button type="button" className={styles.btnDanger} onClick={() => { setTarget(s); setReason('') }}>Hủy</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {target && target.status !== 'OPEN' && (
          <form onSubmit={(e) => { e.preventDefault(); setConfirm(true) }} style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem', maxWidth: 480 }}>
            <label style={labelStyle}>Lý do hủy buổi {when(target.startAt)} của {target.coachName}
              <input required minLength={3} maxLength={255} className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <p className="text-hint">Hội viên được hoàn đủ tiền, nhận voucher đền bù và được thông báo.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className={styles.btnDanger} disabled={reason.trim().length < 3}>Tiếp tục hủy</button>
              <button type="button" className={styles.btnAction} onClick={() => setTarget(null)}>Quay lại</button>
            </div>
          </form>
        )}
      </div>

      <ConfirmModal
        isOpen={confirm}
        title={target?.status === 'OPEN' ? 'Xóa suất trống' : 'Hủy buổi 1-1'}
        message={target?.status === 'OPEN' ? `Xóa suất ${target ? when(target.startAt) : ''} của ${target?.coachName}?` : 'Xác nhận hủy buổi này? Hội viên sẽ được hoàn đủ tiền.'}
        confirmText="Xác nhận"
        type="danger"
        onConfirm={act}
        onCancel={() => setConfirm(false)}
      />
    </>
  )
}
