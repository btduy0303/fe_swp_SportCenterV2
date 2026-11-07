import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { UserRoundSearch } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { receptionistService } from '../../services/receptionistService'
import { packageService } from '../../services/packageService'
import MemberDesk from './MemberDesk'
import styles from '../../css/receptionist/Reception.module.css'

const EMPTY = { fullName: '', email: '', phone: '', password: '' }
const initial = (name = '') => name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() || '?'

// Hội viên tại quầy: danh sách bên trái, chi tiết bên phải để thao tác không phải cuộn. Màn hẹp thì hiện từng khung một.
// Hội viên tạo tại quầy phải xác thực email trước khi mua gói hay đăng ký lớp.
export default function MemberCounter() {
  const { token } = useAuth()
  const toast = useToast()
  const [members, setMembers] = useState([])
  const [packages, setPackages] = useState([])
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [selectedId, setSelectedId] = useState(null)

  const load = useCallback(async (key = '') => {
    setLoading(true)
    try {
      const [list, pkgs] = await Promise.all([receptionistService.searchMembers(token, key), packageService.getActivePackages()])
      setMembers(list)
      setPackages(pkgs)
      return list
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách hội viên')
      return []
    } finally {
      setLoading(false)
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  const pick = (id) => {
    setCreating(false)
    setSelectedId(id)
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await receptionistService.registerMemberAtDesk(token, form)
      toast.success('Đã tạo hội viên. Mã xác thực đã gửi tới email, hãy nhập mã để kích hoạt.')
      const email = form.email.trim().toLowerCase()
      setForm(EMPTY)
      setKeyword('')
      const list = await load('')
      const created = list.find((m) => m.email?.toLowerCase() === email)
      if (created) pick(created.id)
      else setCreating(false)
    } catch (err) {
      toast.error(err.message || 'Lỗi khi tạo hội viên')
    }
  }

  const unverified = members.filter((m) => m.emailVerified === false).length
  const shown = useMemo(() => (filter === 'unverified' ? members.filter((m) => m.emailVerified === false) : members), [members, filter])
  const selected = members.find((m) => m.id === selectedId)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const hasRight = creating || !!selected

  return (
    <div className={styles.wrap}>
      <div className={styles.split} data-detail={hasRight}>
        <aside className={styles.listPane} aria-label="Danh sách hội viên">
          <form className={styles.searchBar} onSubmit={(e) => { e.preventDefault(); load(keyword) }}>
            <input type="search" aria-label="Tìm hội viên" placeholder="Tìm theo tên hội viên" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button type="submit" className={styles.btnOutline}>Tìm</button>
          </form>
          <button type="button" className={`${styles.btn} ${styles.block}`} onClick={() => { setSelectedId(null); setCreating(true) }}>+ Tạo hội viên mới</button>
          <div className={styles.chips} role="group" aria-label="Lọc hội viên">
            <button type="button" aria-pressed={filter === 'all'} className={filter === 'all' ? styles.on : ''} onClick={() => setFilter('all')}>Tất cả <em>{members.length}</em></button>
            <button type="button" aria-pressed={filter === 'unverified'} className={filter === 'unverified' ? styles.on : ''} onClick={() => setFilter('unverified')}>Chưa xác thực <em>{unverified}</em></button>
          </div>
          <div className={styles.listScroll}>
            {loading ? <p className={styles.empty}>Đang tải...</p> : shown.length === 0 ? <p className={styles.empty}>Không có hội viên nào khớp.</p> : shown.map((m) => {
              const active = m.active || m.isActive
              return (
                <button key={m.id} type="button" className={`${styles.mrow} ${m.id === selectedId ? styles.sel : ''} ${active ? '' : styles.off}`} aria-pressed={m.id === selectedId} onClick={() => pick(m.id)}>
                  <span className={styles.avatar} aria-hidden="true">{initial(m.fullName)}</span>
                  <span className={styles.mtext}>
                    <span className={styles.name}>{m.fullName}</span>
                    <span className={styles.meta}>{m.phone || m.email}</span>
                  </span>
                  {m.emailVerified === false ? <span className={`${styles.dot} ${styles.warn}`} title="Chưa xác thực email" aria-label="Chưa xác thực email" /> : !active ? <span className={`${styles.dot} ${styles.bad}`} title="Tạm khóa" aria-label="Tạm khóa" /> : null}
                </button>
              )
            })}
          </div>
        </aside>

        <section className={styles.detailPane} aria-live="polite">
          {creating ? (
            <form className={styles.panel} onSubmit={submit}>
              <button type="button" className={styles.back} onClick={() => setCreating(false)}>← Danh sách</button>
              <h3>Tạo hội viên tại quầy</h3>
              <div className={styles.fields}>
                <label className={styles.field}>Họ và tên<input type="text" required placeholder="Nguyễn Văn A" value={form.fullName} onChange={set('fullName')} /></label>
                <label className={styles.field}>Email<input type="email" required placeholder="ten@gmail.com" value={form.email} onChange={set('email')} /></label>
                <label className={styles.field}>Số điện thoại<input type="tel" required placeholder="0912345678" value={form.phone} onChange={set('phone')} /></label>
                <label className={styles.field}>Mật khẩu khởi tạo<input type="password" required minLength={6} placeholder="Tối thiểu 6 ký tự" value={form.password} onChange={set('password')} /></label>
              </div>
              <p className={styles.hint} style={{ margin: '0.8rem 0 0' }}>Hệ thống gửi mã 6 số tới email này. Hội viên đọc mã tại quầy để bạn nhập; chưa xác thực thì chưa đăng ký được gói, lớp hay buổi 1-1.</p>
              <div className={styles.foot}>
                <button type="button" className={styles.btnOutline} onClick={() => setCreating(false)}>Hủy</button>
                <button type="submit" className={styles.btn}>Tạo hội viên</button>
              </div>
            </form>
          ) : selected ? (
            <MemberDesk key={selected.id} member={selected} packages={packages} onChanged={() => load(keyword)} onBack={() => setSelectedId(null)} />
          ) : (
            <div className={styles.emptyPane}>
              <UserRoundSearch size={40} aria-hidden="true" />
              <p>Chọn một hội viên ở bên trái để đăng ký gói, đăng ký lớp và thu tiền.</p>
              <p className={styles.hint}>Khách mới thì bấm "Tạo hội viên mới".</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
