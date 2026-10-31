import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { bookingService } from '../../services/bookingService'
import { classService } from '../../services/classService'
import { apiRequest } from '../../services/apiHelper'
import { formatVND } from '../../utils/format'
import ConfirmModal from '../common/ConfirmModal'
import styles from '../../css/member/MemberDashboard.module.css'

const LEVELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' }

// Chọn và đăng ký lớp ngay trong trang hội viên: lọc theo môn, trình độ, từ khóa; hết chỗ thì vào hàng chờ
export default function ClassBrowser({ onChanged }) {
  const { token } = useAuth()
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ sportCategoryId: '', level: '', keyword: '', hasSeats: false })
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState({ isOpen: false })

  useEffect(() => {
    apiRequest('GET', '/api/sport-categories').then(setCategories).catch(() => setCategories([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setClasses(await classService.getOpenClasses(filters))
    setLoading(false)
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const ask = (cls, waitlist) => {
    const extra = cls.advancedWarning
      ? ` Lớp này thuộc trình độ nâng cao${cls.prerequisiteCourseName ? ` và yêu cầu đã học "${cls.prerequisiteCourseName}"` : ''}, bạn xác nhận đã đủ điều kiện.`
      : ''
    setConfirm({
      isOpen: true,
      title: waitlist ? 'Vào Danh Sách Chờ' : 'Đăng Ký Lớp Học',
      message: waitlist
        ? `Lớp "${cls.name}" đã đủ sĩ số. Bạn vào danh sách chờ để được mời khi có chỗ?${extra}`
        : `Đăng ký lớp "${cls.name}"? Chỗ được giữ trong thời gian chờ thanh toán, bạn thanh toán ngay bên dưới ở mục lớp đã đăng ký.${extra}`,
      confirmText: waitlist ? 'Vào Danh Sách Chờ' : 'Xác Nhận Đăng Ký',
      type: 'primary',
      action: async () => {
        try {
          if (waitlist) await bookingService.joinWaitlist(token, cls.id, true)
          else await bookingService.registerClass(token, cls.id, true)
          toast.success(waitlist ? 'Đã vào danh sách chờ' : 'Đăng ký thành công, hãy thanh toán để giữ chỗ')
          load()
          onChanged()
        } catch (err) {
          toast.error(err.message || 'Không thực hiện được')
        }
      },
    })
  }

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Lớp Đang Mở Đăng Ký</h2>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
        <select className={styles.input} style={{ maxWidth: 180 }} value={filters.sportCategoryId} onChange={set('sportCategoryId')}>
          <option value="">Tất cả môn</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={styles.input} style={{ maxWidth: 160 }} value={filters.level} onChange={set('level')}>
          <option value="">Mọi trình độ</option>
          {Object.entries(LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className={styles.input} style={{ maxWidth: 220 }} placeholder="Tìm theo tên lớp" value={filters.keyword} onChange={set('keyword')} />
        <label style={{ fontSize: '0.9rem' }}>
          <input type="checkbox" checked={filters.hasSeats} onChange={set('hasSeats')} /> Chỉ lớp còn chỗ
        </label>
      </div>

      {loading ? (
        <p className="text-muted">Đang tải danh sách lớp...</p>
      ) : classes.length === 0 ? (
        <p className="text-muted">Không có lớp nào phù hợp bộ lọc.</p>
      ) : (
        <div className={styles.grid}>
          {classes.map((cls) => {
            const full = cls.seatsLeft <= 0
            return (
              <div key={cls.id} className={styles.packageCard}>
                <h3 className={styles.packageTitle}>{cls.name}</h3>
                <p className={styles.packageDesc}>{cls.categoryName} · {LEVELS[cls.level] || cls.level}</p>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Huấn luyện viên:</span>
                  <span className={styles.metaValue}>{cls.coachName}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Số buổi:</span>
                  <span className={styles.metaValue}>{cls.totalSessions}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Khai giảng:</span>
                  <span className={styles.metaValue}>{cls.startDate}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Chỗ trống:</span>
                  <span className={styles.metaValue} style={{ color: full ? 'var(--danger)' : 'var(--success)' }}>{full ? 'Hết chỗ' : `${cls.seatsLeft} / ${cls.maxCapacity}`}</span>
                </div>
                <div className={styles.packagePrice} style={{ marginTop: '0.5rem' }}>{formatVND(cls.tuition)}</div>
                <button type="button" className={full ? styles.btnSecondary : styles.btnPrimary} style={{ marginTop: '1rem', width: '100%' }} onClick={() => ask(cls, full)}>
                  {full ? 'Vào Danh Sách Chờ' : 'Đăng Ký Lớp Này'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        type={confirm.type}
        onConfirm={() => {
          const action = confirm.action
          setConfirm({ ...confirm, isOpen: false })
          if (action) action()
        }}
        onCancel={() => setConfirm({ ...confirm, isOpen: false })}
      />
    </div>
  )
}
