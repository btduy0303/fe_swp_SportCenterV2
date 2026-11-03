import { useEffect, useRef } from 'react'

// Đưa người dùng tới kết quả vừa tạo: cuộn mượt tới phần tử rồi nháy viền vài giây để họ thấy ngay nó ở đâu.
// Chờ một nhịp ngắn vì trang thường vừa tải lại dữ liệu và phần tử mới chưa kịp vẽ. Trang còn đổi chiều cao trong lúc cuộn
// (danh sách tải xong) làm hoạt ảnh cuộn mượt bị lệch, nên sau đó kiểm tra lại và cuộn thẳng nếu chưa tới nơi.
export function revealById(id, delay = 150) {
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const goTo = (smooth) => document.getElementById(id)?.scrollIntoView({ behavior: smooth && !calm ? 'smooth' : 'auto', block: 'start' })

  setTimeout(() => {
    const el = document.getElementById(id)
    if (!el) return
    goTo(true)
    el.classList.remove('reveal-flash')
    // đọc layout để chạy lại hoạt ảnh nếu phần tử vừa được nháy trước đó
    void el.offsetWidth
    el.classList.add('reveal-flash')
    setTimeout(() => el.classList.remove('reveal-flash'), 2600)

    setTimeout(() => {
      const top = document.getElementById(id)?.getBoundingClientRect().top
      if (top !== undefined && (top < -30 || top > window.innerHeight * 0.4)) goTo(false)
    }, 1100)
  }, delay)
}

// Dùng cho biểu mẫu vừa mở ra (sửa một dòng ở dưới danh sách): gắn ref vào biểu mẫu, nó tự cuộn tới và đặt con trỏ vào ô đầu tiên.
export function useRevealOnMount() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    el.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')?.focus({ preventScroll: true })
  }, [])
  return ref
}
