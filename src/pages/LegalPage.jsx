import React from 'react'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/600.css'
import '../css/home/landing.css'
import LandingNavbar from '../components/home/LandingNavbar'
import LandingFooter from '../components/home/LandingFooter'
import { LEGAL, LEGAL_UPDATED, CONTACT } from '../data/legal'

// Trang văn bản của trung tâm: kind = 'terms' (Điều khoản sử dụng) hoặc 'privacy' (Chính sách bảo mật)
export default function LegalPage({ kind }) {
  const doc = LEGAL[kind]
  // Chỉ hiện mục Liên hệ khi đã điền thông tin thật trong data/legal.js
  const contact = [['Địa chỉ', CONTACT.address], ['Điện thoại', CONTACT.phone], ['Email', CONTACT.email]].filter(([, v]) => v)

  return (
    <div className="g6">
      <LandingNavbar />
      <main className="legal">
        <div className="wrap">
          <p className="eyebrow">G6 Sport Center</p>
          <h1>{doc.title}</h1>
          <p className="lead">{doc.intro}</p>
          <p className="legal-date">Cập nhật lần cuối: {LEGAL_UPDATED}</p>
          {doc.sections.map((s, i) => (
            <section key={s.h}>
              <h2>{i + 1}. {s.h}</h2>
              <ul>{s.items.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          ))}
          {contact.length > 0 && (
            <section>
              <h2>Liên hệ</h2>
              <ul>{contact.map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
            </section>
          )}
        </div>
      </main>
      <LandingFooter sports={[]} />
    </div>
  )
}
