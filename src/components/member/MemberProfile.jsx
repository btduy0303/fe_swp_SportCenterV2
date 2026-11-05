import React from 'react'
import { tierInfo } from '../../utils/overview'
import PageHead from './PageHead'
import styles from '../../css/member/MemberProfile.module.css'

const GOALS = ['Tăng cơ', 'Giảm mỡ', 'Rèn thể lực', 'Dẻo dai', 'Giữ dáng']

// Chỉ số BMI ước tính từ chiều cao (cm) và cân nặng (kg); thiếu một trong hai thì không tính
function bmiOf(heightCm, weightKg) {
  const h = Number(heightCm) / 100
  const w = Number(weightKg)
  if (!(h > 0) || !(w > 0)) return null
  const value = w / (h * h)
  const label = value < 18.5 ? 'Thiếu cân' : value < 25 ? 'Bình thường' : value < 30 ? 'Thừa cân' : 'Béo phì'
  return { text: value.toFixed(1).replace('.', ','), label, normal: value >= 18.5 && value < 25 }
}

// Hồ sơ cá nhân: thẻ danh tính (tên, gói, BMI) và form hai nhóm. Việc lưu do trang cha xử lý qua onSubmit.
export default function MemberProfile({ user, profileData, setProfileData, savedProfile, onSubmit, activeSubscription, packages }) {
  const dirty = !!savedProfile && JSON.stringify(profileData) !== JSON.stringify(savedProfile)
  const name = profileData.fullName || user?.fullName || ''
  const bmi = bmiOf(profileData.heightCm, profileData.weightKg)
  const { tiers, index } = tierInfo(packages, activeSubscription?.tierLevel)
  const set = (field) => (e) => setProfileData({ ...profileData, [field]: e.target.value })

  return (
    <div className={styles.page}>
      <PageHead title="Hồ sơ cá nhân" lead="Thông tin của bạn giúp huấn luyện viên lên kế hoạch tập phù hợp." />

      <section className={styles.identity} aria-label="Thông tin tài khoản">
        <span className={styles.avatarBox} aria-hidden="true">{(name || '?').trim().charAt(0).toUpperCase()}</span>
        <div className={styles.who}>
          <div className={styles.name}>{name || 'Hội viên'}</div>
          <p className={styles.email}>{user?.email}</p>
          <p className={styles.tags}>
            {activeSubscription ? <span className={styles.tagAccent}>{activeSubscription.packageName}{tiers.length ? ` · Hạng ${index}/${tiers.length}` : ''}</span> : <span className={styles.tag}>Chưa có gói</span>}
            <span className={styles.tag}>Hội viên</span>
          </p>
        </div>
        {bmi ? (
          <div className={styles.bmi}>
            <span>Chỉ số BMI</span>
            <b>{bmi.text}</b>
            <em className={bmi.normal ? styles.good : styles.warn}>{bmi.label}</em>
            <small>Chỉ số ước tính, chỉ để tham khảo</small>
          </div>
        ) : null}
      </section>

      <form onSubmit={onSubmit} className={styles.form}>
        <h2 className={styles.group}>Thông tin cá nhân</h2>
        <div className={styles.card}>
          <div className={styles.grid}>
            <label>Họ và tên
              <input type="text" value={profileData.fullName} onChange={set('fullName')} required />
            </label>
            <label>Số điện thoại
              <input type="tel" value={profileData.phone} onChange={set('phone')} />
            </label>
            <label>Giới tính
              <select value={profileData.gender} onChange={set('gender')}>
                <option value="">Chưa chọn</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </label>
            <label>Ngày sinh
              <input type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={profileData.dateOfBirth} onChange={set('dateOfBirth')} />
            </label>
          </div>
        </div>

        <h2 className={styles.group}>Thể trạng và mục tiêu</h2>
        <div className={styles.card}>
          <div className={styles.grid}>
            <label>Chiều cao (cm)
              <input type="number" step="0.1" min="1" max="300" value={profileData.heightCm} onChange={set('heightCm')} />
            </label>
            <label>Cân nặng (kg)
              <input type="number" step="0.1" min="1" max="500" placeholder="Ví dụ: 68.5" value={profileData.weightKg} onChange={set('weightKg')} />
            </label>
            <label className={styles.wide}>Mục tiêu luyện tập
              <input type="text" placeholder="Tăng cơ, giảm mỡ, rèn thể lực..." value={profileData.fitnessGoal} onChange={set('fitnessGoal')} />
            </label>
          </div>
          <div className={styles.goals} role="group" aria-label="Gợi ý mục tiêu">
            {GOALS.map((g) => (
              <button key={g} type="button" aria-pressed={profileData.fitnessGoal === g} className={profileData.fitnessGoal === g ? styles.goalOn : ''}
                onClick={() => setProfileData({ ...profileData, fitnessGoal: g })}>{g}</button>
            ))}
          </div>
        </div>

        <div className={`${styles.save} ${dirty ? styles.saveDirty : ''}`}>
          <span>{dirty ? 'Bạn có thay đổi chưa lưu' : 'Thông tin đã được lưu'}</span>
          <div className={styles.saveActions}>
            {dirty ? <button type="button" className={styles.cancel} onClick={() => setProfileData(savedProfile)}>Hủy</button> : null}
            <button type="submit" className={styles.submit} disabled={!dirty}>Lưu thay đổi</button>
          </div>
        </div>
      </form>
    </div>
  )
}
