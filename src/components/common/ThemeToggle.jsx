import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import styles from '../../css/common/ThemeToggle.module.css'

// Nút đổi giao diện sáng/tối, đặt ở thanh trên của các trang sau đăng nhập
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const toLight = theme === 'dark'
  const label = toLight ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
  return (
    <button type="button" className={styles.toggle} onClick={toggleTheme} aria-label={label} title={label}>
      {toLight ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}
