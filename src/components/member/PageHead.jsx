import styles from '../../css/member/PageHead.module.css'

// Tiêu đề đầu mỗi trang con của hội viên: tên trang và một dòng mô tả
export default function PageHead({ title, lead }) {
  return (
    <header className={styles.head}>
      <div className={styles.title} role="heading" aria-level={1}>{title}</div>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
    </header>
  )
}
