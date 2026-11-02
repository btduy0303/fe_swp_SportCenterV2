import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { receptionistService } from '../../services/receptionistService'
import styles from '../../css/manager/ManagerDashboard.module.css'

const STATUS_LABEL = { OPEN: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết', CLOSED: 'Đã đóng' }
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
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])

  const load = useCallback(async () => {
    try {
      setRows(await receptionistService.getSupportRequests(token, status))
    } catch (err) {
      toast.error(err.message || 'Không thể tải yêu cầu hỗ trợ')
    }
  }, [token, status, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    receptionistService.searchMembers(token, '').then(setMembers)
  }, [token])

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
    <>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Ghi Nhận Yêu Cầu Hỗ Trợ</h2>
        <form onSubmit={submit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Hội viên</label>
              <select className={styles.select} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                <option value="">-- Chọn hội viên --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>#{m.id} - {m.fullName} ({m.phone || m.email})</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tiêu đề</label>
              <input className={styles.input} required maxLength={200} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nội dung</label>
            <textarea className={styles.textarea} required maxLength={2000} rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">Ghi Nhận</button>
        </form>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Danh Sách Yêu Cầu</h2>
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {rows.length === 0 ? (
          <p className="text-muted">Không có yêu cầu nào.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Hội viên</th>
                  <th className={styles.th}>Yêu cầu</th>
                  <th className={styles.th}>Trạng thái</th>
                  <th className={styles.th}>Tạo lúc</th>
                  <th className={styles.th}>Người xử lý</th>
                  <th className={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={styles.row}>
                    <td className={styles.td}><strong>{r.memberName}</strong><br />{r.memberEmail}</td>
                    <td className={styles.td}><strong>{r.subject}</strong><br />{r.content}</td>
                    <td className={styles.td}>{STATUS_LABEL[r.status]}</td>
                    <td className={styles.td}>{new Date(r.createdAt).toLocaleString('vi-VN')}</td>
                    <td className={styles.td}>{r.handledByName || '—'}</td>
                    <td className={styles.td}>
                      {NEXT[r.status].map(([next, label]) => (
                        <button key={next} type="button" className={styles.btnAction} onClick={() => change(r.id, next)}>{label}</button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
