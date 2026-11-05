import styles from '../../css/member/TierLadder.module.css'

// Bậc thang hạng: mỗi hạng đang bán là một bậc, tô cam từ bậc đầu đến hạng của hội viên
export default function TierLadder({ count, index }) {
  return (
    <div className={styles.ladder} role="img" aria-label={`Hạng ${index} trên ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i < index ? styles.on : ''} style={{ height: `${14 + (i * 32) / Math.max(1, count - 1)}px` }} />
      ))}
    </div>
  )
}
