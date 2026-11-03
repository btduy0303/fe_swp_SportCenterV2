import { useRef, useState } from 'react'

// Chặn bấm đôi: khi một thao tác đang chạy thì bỏ qua lần bấm tiếp theo; busy dùng để làm mờ nút
export function useSingleFlight() {
  const running = useRef(false)
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    if (running.current) return undefined
    running.current = true
    setBusy(true)
    try {
      return await fn()
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  return [run, busy]
}
