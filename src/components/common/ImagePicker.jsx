import React, { useEffect, useRef, useState } from 'react'

// Chọn ảnh minh họa từ máy (tùy chọn). Giữ file đang chọn ở component cha qua onChange({ file, removed }).
// Ảnh phải là JPG, PNG hoặc WEBP và không quá 500 KB (backend cũng kiểm lại). currentUrl: ảnh đang lưu
export const IMAGE_MAX_BYTES = 500 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ImagePicker({ label = 'Ảnh minh họa (tùy chọn)', currentUrl = null, value, onChange, hint }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const file = value?.file || null
  const removed = !!value?.removed

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
    if (!TYPES.includes(chosen.type)) { setError('Chỉ nhận ảnh JPG, PNG hoặc WEBP'); return }
    if (chosen.size > IMAGE_MAX_BYTES) { setError(`Ảnh quá lớn (${Math.round(chosen.size / 1024)} KB), tối đa ${IMAGE_MAX_BYTES / 1024} KB`); return }
    setError('')
    onChange({ file: chosen, removed: false })
  }

  const shown = preview || (removed ? null : currentUrl)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontWeight: 600 }}>{label}</label>
      {shown ? (
        <img src={shown} alt="Ảnh minh họa" style={{ width: '100%', maxWidth: 220, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
      ) : (
        <div style={{ width: '100%', maxWidth: 220, aspectRatio: '16 / 9', borderRadius: 8, border: '1px dashed #bbb', display: 'grid', placeItems: 'center', color: '#888', fontSize: 14 }}>
          Chưa có ảnh
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>{shown ? 'Đổi ảnh' : 'Chọn ảnh từ máy'}</button>
        {(file || (currentUrl && !removed)) && (
          <button type="button" className="btn-secondary" onClick={() => { setError(''); onChange({ file: null, removed: !!currentUrl }) }}>Xóa ảnh</button>
        )}
      </div>
      {hint && <span style={{ color: '#777', fontSize: 13 }}>{hint}</span>}
      {error && <span style={{ color: '#c0392b', fontSize: 13 }}>{error}</span>}
    </div>
  )
}

// Lưu ảnh sau khi môn hoặc lớp đã có id: có file thì tải lên, bấm Xóa ảnh thì xóa, không đổi gì thì bỏ qua
export async function applyImage(service, token, kind, id, value) {
  if (value?.file) return service.uploadImage(token, kind, id, value.file)
  if (value?.removed) return service.deleteImage(token, kind, id)
  return null
}
