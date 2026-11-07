import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { receptionistService } from '../../services/receptionistService'
import styles from '../../css/receptionist/Reception.module.css'

const STATUS_LABEL = { OPEN: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết', CLOSED: 'Đã đóng' }
const TONE = { OPEN: 'warn', IN_PROGRESS: 'warn', RESOLVED: 'ok', CLOSED: '' }
// Bước tiếp theo hợp lệ của từng trạng thái (khớp luật ở BE)
const NEXT = {
  OPEN: [['IN_PROGRESS', 'Nhận xử lý'], ['RESOLVED', 'Đã giải quyết']],
  IN_PROGRESS: [['RESOLVED', 'Đã giải quyết']],
  RESOLVED: [['CLOSED', 'Đóng']],
  CLOSED: [],
}

// Ghi nhận yêu cầu hỗ trợ của hội viên tại quầy và theo dõi xử lý
export default function SupportRequestsTab() {
  const { token } = useAuth()
  const toast = useToast()
  const [members, setMembers] = useState([])
  const [form, setForm] = useState({ memberId: '', subject: '', content: '' })
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState('')
  const [all, setAll] = useState([])

  // Tải mọi yêu cầu một lần rồi lọc ở máy để chip có số đếm của từng trạng thái
  const load = useCallback(async () => {
    try {
      setAll(await receptionistService.getSupportRequests(token, ''))
    } catch (err) {
      toast.error(err.message || 'Không thể tải yêu cầu hỗ trợ')
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    receptionistService.searchMembers(token, '').then(setMembers)
  }, [token])

  const counts = useMemo(() => Object.fromEntries(Object.keys(STATUS_LABEL).map((k) => [k, all.filter((r) => r.status === k).length])), [all])
  const rows = status ? all.filter((r) => r.status === status) : all

  const submit = async (e) => {
    e.preventDefault()
    if (!form.memberId) {
      toast.error('Vui lòng chọn hội viên')
      return
    }
    try {
      await receptionistService.createSupportRequest(token, { ...form, memberId: Number(form.memberId) })
      toast.success('Đã ghi nhận yêu cầu hỗ trợ')
      setForm({ memberId: '', subject: '', content: '' })
      setCreating(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Không thể ghi nhận yêu cầu hỗ trợ')
    }
  }

  const change = async (id, next) => {
    try {
      await receptionistService.changeSupportStatus(token, id, next)
      toast.success('Đã cập nhật yêu cầu')
      load()
    } catch (err) {
      toast.error(err.message || 'Cập nhật thất bại')
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.chips} role="group" aria-label="Lọc theo trạng thái" style={{ flex: 1 }}>
          <button type="button" aria-pressed={!status} className={!status ? styles.on : ''} onClick={() => setStatus('')}>Tất cả <em>{all.length}</em></button>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <button key={k} type="button" aria-pressed={status === k} className={status === k ? styles.on : ''} onClick={() => setStatus(k)}>{v} <em>{counts[k]}</em></button>
          ))}
        </div>
        <button type="button" className={creating ? styles.btnOutline : styles.btn} onClick={() => setCreating(!creating)}>{creating ? 'Đóng' : '+ Ghi nhận yêu cầu'}</button>
      </div>

      {creating && (
        <form className={styles.panel} onSubmit={submit}>
          <h3>Ghi nhận yêu cầu hỗ trợ</h3>
          <div className={styles.fields}>
            <label className={styles.field}>Hội viên
              <select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                <option value="">Chọn hội viên</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.fullName} · {m.phone || m.email}</option>)}
              </select>
            </label>
            <label className={styles.field}>Tiêu đề
              <input required maxLength={200} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.wide}`}>Nội dung
              <textarea required maxLength={2000} rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </label>
          </div>
          <div className={styles.foot}>
            <button type="button" className={styles.btnOutline} onClick={() => setCreating(false)}>Đóng</button>
            <button type="submit" className={styles.btn}>Ghi nhận</button>
          </div>
        </form>
      )}

      {rows.length === 0 ? <p className={styles.empty}>Không có yêu cầu nào.</p> : rows.map((r) => (
        <article key={r.id} className={styles.ticket}>
          <div className={styles.ticketTop}>
            <div className={styles.name}>{r.subject}<span className={styles.meta}>{r.memberName} · {r.memberEmail} · {new Date(r.createdAt).toLocaleString('vi-VN')}</span></div>
            <span className={`${styles.tag} ${styles[TONE[r.status]] || ''}`}>{STATUS_LABEL[r.status]}</span>
          </div>
          <p className={styles.body}>{r.content}</p>
          <div className={styles.acts} style={{ justifyContent: 'flex-start', alignItems: 'center' }}>
            {NEXT[r.status].map(([next, label], i) => (
              <button key={next} type="button" className={`${i === 0 ? styles.btn : styles.btnOutline} ${styles.sm}`} onClick={() => change(r.id, next)}>{label}</button>
            ))}
            {r.handledByName ? <span className={styles.meta} style={{ margin: 0 }}>Người xử lý: {r.handledByName}</span> : null}
          </div>
        </article>
      ))}
    </div>
  )
}
