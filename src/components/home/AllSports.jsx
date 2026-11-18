import React, { useEffect, useRef, useState } from 'react'
import { categoryIcon } from '../../utils/sportIcon'
import { Reveal } from './landingHooks'

// Một thẻ môn. Video chỉ được tải khi thẻ sắp hiện trên màn hình (cách mép màn hình 200 px), trước đó chỉ hiện ảnh bìa hoặc biểu tượng,
// để mở trang chủ không phải tải cùng lúc video của mọi môn. Có video thì rê chuột sẽ phát
function SportCard({ sport }) {
  const boxRef = useRef(null)
  const [near, setNear] = useState(false)
  const Icon = categoryIcon(sport.name)

  useEffect(() => {
    const el = boxRef.current
    if (!el || !sport.video) return undefined
    if (!('IntersectionObserver' in window)) { setNear(true); return undefined }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); io.disconnect() }
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [sport.video])

  let media
  if (sport.video && near) {
    // Môn có video: giữ video; ảnh manager tải lên chỉ làm ảnh bìa khi video chưa phát
    media = (
      <video src={sport.video} poster={sport.imageUrl || undefined} muted loop playsInline preload="metadata" aria-hidden="true"
        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
        onMouseLeave={(e) => e.currentTarget.pause()} />
    )
  } else if (sport.imageUrl) {
    media = <img src={sport.imageUrl} alt={`Minh họa môn ${sport.name}`} loading="lazy" />
  } else {
    media = <Icon className="sportCardIcon" aria-hidden="true" />
  }

  return (
    <article className="sportCard">
      <div className="sportCardImg" ref={boxRef}>{media}</div>
      <div className="sportCardTxt">
        <h3>{sport.name}</h3>
        {sport.desc ? <p>{sport.desc}</p> : null}
      </div>
    </article>
  )
}

// Tất cả môn của trung tâm dạng thẻ: ảnh minh họa do manager tải lên; môn có video thì hiện khung hình đầu (rê chuột thì phát);
// không có gì thì dùng biểu tượng. Môn mới thêm luôn hiện ở đây dù không nằm trong dải video phía trên
export default function AllSports({ sports }) {
  if (!sports.length) return null
  return (
    <section id="tat-ca-mon" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Reveal className="head">
          <span className="eyebrow">Tất cả môn</span>
          <h2>Môn nào<br />cũng có lớp</h2>
        </Reveal>
        <div className="sportCards">
          {sports.map((s) => <SportCard key={s.id} sport={s} />)}
        </div>
      </div>
    </section>
  )
}
