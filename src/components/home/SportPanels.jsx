import React from 'react'
import { categoryIcon } from '../../utils/sportIcon'
import { LoopVideo, Reveal } from './landingHooks'

const MAX_PANELS = 7

// Tối đa 7 dải môn tập, ưu tiên môn đang có nhiều lớp mở và có khóa kèm 1-1; rê chuột để dải nở ra.
// Các môn còn lại hiện thành hàng tên bên dưới. Môn chưa có video thì dùng nền màu và biểu tượng của môn
export default function SportPanels({ sports, classes = [], oneOnOnePackages = [] }) {
  if (!sports.length) return null
  const score = (s) => classes.filter((c) => c.categoryName === s.name).length * 2
    + (oneOnOnePackages.some((p) => p.sportName === s.name) ? 1 : 0)
  const ranked = sports.map((s, i) => ({ s, i, n: score(s) })).sort((a, b) => b.n - a.n || a.i - b.i).map((x) => x.s)
  const featured = ranked.slice(0, MAX_PANELS)
  const others = ranked.slice(MAX_PANELS)
  return (
    <>
      <section id="mon-tap" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <Reveal className="head">
            <span className="eyebrow">{sports.length} môn</span>
            <h2>Chọn môn<br />bạn mê</h2>
            <p className="lead">Mỗi môn có phòng riêng, coach đúng môn và lớp cho người mới lẫn người đã quen. Rê chuột vào từng môn để xem.</p>
          </Reveal>
        </div>
      </section>
      <div className="panels">
        {featured.map((s, i) => {
          const Icon = categoryIcon(s.name)
          return (
            <div className={`panel ${s.video ? '' : 'noVideo'}`} key={s.id} tabIndex={0}>
              {s.video ? <LoopVideo src={s.video} /> : <Icon className="panelIcon" aria-hidden="true" />}
              <div className="shade" />
              <div className="txt">
                <span className="no">{String(i + 1).padStart(2, '0')}</span>
                <h3>{s.name}</h3>
                <div className="more">
                  <p>{s.desc}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {others.length > 0 && (
        <div className="wrap moreSports">
          <span>Còn có:</span>
          {others.map((s) => <a key={s.id} href="#classes">{s.name}</a>)}
        </div>
      )}
    </>
  )
}
