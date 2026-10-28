import { labels, displayDate } from './trainingUtils'
import { cloneElement, useId } from 'react'
import { AlertCircle, Inbox, CalendarDays, ArrowUpRight, Users, UserRound, Pencil, Target } from 'lucide-react'
import styles from '../../css/training/Training.module.css'

export function Badge({ value }) { return <span className={styles.badge} data-status={value}>{labels[value] || value || 'Chưa điểm danh'}</span> }
export function Empty({ children = 'Chưa có dữ liệu.' }) { return <div className={styles.empty}><Inbox size={28} aria-hidden="true" /><p>{children}</p></div> }
export function Loading({ label = 'Đang tải dữ liệu…' }) { return <div className={styles.loading} role="status"><span className={styles.srOnly}>{label}</span><div /><div /><div /></div> }
export function ErrorMessage({ error }) { return error ? <div role="alert" className={styles.error}><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div> : null }
export function FormSection({ number, title, description }) { return <div className={styles.formSection}><span aria-hidden="true">{number}</span><div><h3>{title}</h3>{description ? <p>{description}</p> : null}</div></div> }
export function TrainingTabs({ items, active, onChange, label }) {
  function moveFocus(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const current = items.findIndex(([id]) => id === active)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
    onChange(items[next][0])
    event.currentTarget.querySelectorAll('[role=tab]')[next]?.focus()
  }
  return <div className={styles.tabs} role="tablist" aria-label={label} onKeyDown={moveFocus}>{items.map(([id, title, Icon]) => <button type="button" role="tab" key={id} id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={active === id} tabIndex={active === id ? 0 : -1} onClick={() => onChange(id)}>{Icon ? <Icon size={16} aria-hidden="true" /> : null}{title}</button>)}</div>
}
export function Field({ label, children, wide, hint }) {
  const generatedId = useId()
  const id = children.props.id || generatedId
  return <div className={`${styles.field} ${wide ? styles.wide : ''}`}><label htmlFor={id}>{label}{children.props.required ? <span aria-hidden="true"> *</span> : null}</label>{cloneElement(children, { id, ...(hint ? { 'aria-describedby': `${id}-hint` } : {}) })}{hint ? <small id={`${id}-hint`}>{hint}</small> : null}</div>
}
export function PlanAudience({ memberName, memberId }) { return <span className={styles.targetPill}>{memberId ? <UserRound size={12} aria-hidden="true" /> : <Users size={12} aria-hidden="true" />}{memberId ? memberName || 'Kế hoạch cá nhân' : 'Kế hoạch cả lớp'}</span> }
export function SessionTable({ sessions, onSelect }) {
  if (!sessions.length) return <Empty>Không có buổi tập trong khoảng ngày đã chọn. Thử chọn khoảng ngày hoặc lớp khác.</Empty>
  return <div className={styles.tableWrap} role="region" aria-label="Danh sách buổi tập, có thể cuộn ngang" tabIndex={0}><table><caption className={styles.srOnly}>Lịch tập trong khoảng ngày đã chọn</caption><thead><tr><th scope="col">Ngày / giờ</th><th scope="col">Lớp / buổi</th><th scope="col">Địa điểm · HLV</th><th scope="col">Trạng thái</th>{onSelect ? <th scope="col"><span className={styles.srOnly}>Thao tác</span></th> : null}</tr></thead>
    <tbody>{sessions.map(s => <tr key={s.id}><td><strong>{displayDate(s.date)}</strong><small>{s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}</small></td><td><strong>{s.className}</strong><small>Buổi {s.sessionNo}</small>{s.classStatus === 'CANCELED' ? <small>Lớp đã hủy · Chỉ xem lịch sử</small> : null}</td><td>{s.room}<small>{s.coachName}</small></td><td><Badge value={s.status} /></td>{onSelect ? <td><button onClick={() => onSelect(s.id)} aria-label={`Mở buổi ${s.sessionNo} ngày ${displayDate(s.date)}`}>Mở buổi tập <ArrowUpRight size={14} aria-hidden="true" /></button></td> : null}</tr>)}</tbody></table></div>
}
export function PlanDetails({ plan }) {
  return <div className={styles.planDetail}>{plan.description ? <p>{plan.description}</p> : null}<p><strong>Mục tiêu:</strong> {plan.objective || 'Chưa cập nhật'}</p>
    <p className={styles.muted}><CalendarDays size={13} aria-hidden="true" /> {displayDate(plan.startDate)} – {displayDate(plan.endDate)} · {plan.coachName} · Phiên bản {plan.version}</p>
    {plan.exercises.length ? <ol className={styles.exerciseList}>{plan.exercises.map(e => <li key={e.id}><strong>{e.name}</strong>{e.instructions ? <p>{e.instructions}</p> : null}<div className={styles.metricList}>{e.sets != null ? <span><strong>{e.sets}</strong>hiệp</span> : null}{e.repetitions != null ? <span><strong>{e.repetitions}</strong>lần lặp</span> : null}{e.durationSeconds != null ? <span><strong>{e.durationSeconds}</strong>giây</span> : null}</div></li>)}</ol> : <Empty>Kế hoạch cũ chưa có danh sách bài tập.</Empty>}
    {plan.coachNotes ? <div className={styles.notice}><Target size={17} aria-hidden="true" /><p><strong>Ghi chú HLV:</strong> {plan.coachNotes}</p></div> : null}
  </div>
}
export function Results({ results, onEdit }) {
  if (!results.length) return <Empty>Chưa ghi nhận kết quả tập luyện.</Empty>
  return <div className={styles.stack}>{results.map(r => <article key={r.id} className={styles.record}><div className={styles.row}><div><h3>{r.activityName}</h3><small>{r.memberName} · {r.className} · {displayDate(r.sessionDate)}</small></div><Badge value={r.completionStatus} /></div>
    <div className={styles.metricList}>{r.actualSets != null ? <span><strong>{r.actualSets}</strong>hiệp thực tế</span> : null}{r.actualRepetitions != null ? <span><strong>{r.actualRepetitions}</strong>lần lặp</span> : null}{r.actualDurationSeconds != null ? <span><strong>{r.actualDurationSeconds}</strong>giây tập luyện</span> : null}</div>
    {r.performance ? <p>{r.performance}</p> : null}{r.notes ? <p className={styles.muted}>{r.notes}</p> : null}
    {r.prescription ? <details><summary>Bài tập được giao lúc ghi kết quả · phiên bản {r.prescription.version}</summary><p>{r.prescription.exercise.name}: {r.prescription.exercise.instructions}</p><p>{r.prescription.exercise.sets ?? 'Chưa đặt'} hiệp / {r.prescription.exercise.repetitions ?? 'Chưa đặt'} lần / {r.prescription.exercise.durationSeconds ?? 'Chưa đặt'} giây</p></details> : null}
    <div className={styles.row}><small>Ghi bởi {r.coachName}</small>{onEdit ? <button type="button" onClick={() => onEdit(r)}><Pencil size={14} aria-hidden="true" />Sửa kết quả</button> : null}</div></article>)}</div>
}
export function Evaluations({ evaluations, onEdit, canEdit }) {
  if (!evaluations.length) return <Empty>Chưa có đánh giá tiến bộ.</Empty>
  return <div className={styles.stack}>{evaluations.map(e => <article className={styles.record} key={e.id}><div className={styles.row}><div><h3>{displayDate(e.evaluationDate)}</h3><small>{e.coachName} · {e.className}</small><small>Giai đoạn {displayDate(e.periodStart)} – {displayDate(e.periodEnd)}</small></div><div><span className={styles.rating}>{e.rating}<small>/ 5</small></span><div className={styles.ratingMeter} aria-hidden="true">{[1,2,3,4,5].map(n => <span key={n} data-filled={n <= e.rating} />)}</div></div></div><p>{e.summary}</p>
    <div className={styles.feedbackGrid}>{[['Điểm mạnh', e.strengths], ['Cần cải thiện', e.improvements], ['Khuyến nghị', e.recommendations], ['Nhận xét của HLV', e.feedback]].filter(([, value]) => value).map(([title, value]) => <div key={title}><h4>{title}</h4><p>{value}</p></div>)}</div>
    {onEdit && (!canEdit || canEdit(e)) ? <button type="button" onClick={() => onEdit(e)}><Pencil size={14} aria-hidden="true" />Sửa đánh giá</button> : null}</article>)}</div>
}
export function AttendanceHistory({ attendance }) {
  if (!attendance.length) return <Empty>Chưa có lịch sử điểm danh. Buổi chưa đánh dấu không được tính là vắng.</Empty>
  return <div className={styles.tableWrap} role="region" aria-label="Lịch sử điểm danh, có thể cuộn ngang" tabIndex={0}><table><thead><tr><th scope="col">Ngày</th><th scope="col">Lớp</th><th scope="col">Điểm danh</th><th scope="col">Ghi chú</th><th scope="col">Chốt buổi</th></tr></thead><tbody>{attendance.map(a => <tr key={a.sessionId}><td>{displayDate(a.date)}<small>{a.startTime.slice(0, 5)}</small></td><td>{a.className}</td><td><Badge value={a.status} />{a.sessionStatus === 'CANCELED_BY_CENTER' ? <small>Buổi đã hủy · Không tính thống kê{a.cancelReason ? ` · ${a.cancelReason}` : ''}</small> : null}{a.withdrawnBeforeSession ? <small>Đã rời lớp trước buổi tập · Không tính thống kê</small> : null}</td><td>{a.notes || '—'}</td><td>{a.finalizedAt ? 'Đã chốt' : 'Chưa chốt'}</td></tr>)}</tbody></table></div>
}
