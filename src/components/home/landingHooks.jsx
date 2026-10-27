import { useEffect, useRef, useState } from 'react'

export function useInView(once = true) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true)
        if (once) io.disconnect()
      }
    }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [once])
  return [ref, seen]
}

// Khối hiện dần khi cuộn tới. delay tính bằng ms
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div', style }) {
  const [ref, seen] = useInView()
  return (
    <Tag ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  )
}

// Video nền chạy lặp, câm. Chỉ phát khi đang hiện trên màn hình; người bật giảm chuyển động thì đứng yên ở khung đầu
export function LoopVideo({ src, className = 'vid' }) {
  const ref = useRef(null)
  useEffect(() => {
    const v = ref.current
    if (!v || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {})
      else v.pause()
    }, { threshold: 0.1 })
    io.observe(v)
    return () => io.disconnect()
  }, [])
  return <video ref={ref} className={className} src={src} muted loop playsInline preload="metadata" aria-hidden="true" />
}

export function CountUp({ to, ms = 1200 }) {
  const [ref, seen] = useInView()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    const t0 = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min((t - t0) / ms, 1)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to, ms])
  return <span ref={ref}>{n}</span>
}
