import React, { useEffect, useRef, useState } from 'react'

// Chọn video minh họa từ máy (tùy chọn). Giữ file đang chọn ở component cha qua onChange({ file }).
// Video MP4 hoặc WEBM, tối đa 5 MB và 25 giây (độ dài chỉ kiểm được ở trình duyệt; backend kiểm loại file và dung lượng).
// currentUrl: video đã tải lên trước đó (khi sửa môn); chỉ thay được, không xóa
export const VIDEO_MAX_BYTES = 5 * 1024 * 1024
export const VIDEO_MAX_SECONDS = 25
const TYPES = ['video/mp4', 'video/webm']

export default function VideoPicker({ label = 'Video minh họa (tùy chọn)', currentUrl = null, value, onChange, hint }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const file = value?.file || null

  useEffect(() => {
    if (!file) { setPreview(null); return undefined }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (e) => {
    const chosen = e.target.files?.[0]
    e.target.value = ''
    if (!chosen) return
    if (!TYPES.includes(chosen.type)) { setError('Chỉ nhận video MP4 hoặc WEBM'); return }
    if (chosen.size > VIDEO_MAX_BYTES) { setError(`Video quá nặng (${(chosen.size / 1024 / 1024).toFixed(1)} MB), tối đa ${VIDEO_MAX_BYTES / 1024 / 1024} MB`); return }
    // Đọc độ dài video bằng thẻ video tạm trước khi nhận
    const probe = document.createElement('video')
    const url = URL.createObjectURL(chosen)
    probe.preload = 'metadata'
    const finish = () => {
      URL.revokeObjectURL(url)
      // Video ghi bằng MediaRecorder không ghi độ dài trong file (Infinity): lúc này không đo được thì chấp nhận, backend vẫn giới hạn 5 MB
      if (Number.isFinite(probe.duration) && probe.duration > VIDEO_MAX_SECONDS) {
        setError(`Video dài ${Math.round(probe.duration)} giây, tối đa ${VIDEO_MAX_SECONDS} giây`)
        return
      }
      setError('')
      onChange({ file: chosen })
    }
    probe.onloadedmetadata = () => {
      if (probe.duration === Infinity) {
        // Cách quen thuộc để trình duyệt tính ra độ dài thật: tua tới cuối rồi đọc lại
        probe.onseeked = finish
        probe.currentTime = 1e6
      } else {
        finish()
      }
    }
    probe.onerror = () => { URL.revokeObjectURL(url); setError('Không đọc được video này, hãy thử video khác') }
    probe.src = url
  }

  const shown = preview || currentUrl
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontWeight: 600 }}>{label}</label>
      {shown ? (
        <video key={shown} src={shown} muted loop controls playsInline preload="metadata"
          style={{ width: '100%', maxWidth: 220, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd', background: '#000' }} />
      ) : (
        <div style={{ width: '100%', maxWidth: 220, aspectRatio: '16 / 9', borderRadius: 8, border: '1px dashed #bbb', display: 'grid', placeItems: 'center', color: '#888', fontSize: 14 }}>
          Chưa có video
        </div>
      )}
      <input ref={inputRef} type="file" accept="video/mp4,video/webm" onChange={pick} style={{ display: 'none' }} />
      <div>
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>{shown ? 'Đổi video' : 'Chọn video từ máy'}</button>
      </div>
      {hint && <span style={{ color: '#777', fontSize: 13 }}>{hint}</span>}
      {error && <span style={{ color: '#c0392b', fontSize: 13 }}>{error}</span>}
    </div>
  )
}
