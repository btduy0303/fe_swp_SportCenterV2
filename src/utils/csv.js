// Tải một bảng dưới dạng file CSV. Có dấu BOM UTF-8 ở đầu để Excel đọc đúng tiếng Việt; ô chứa dấu phẩy, nháy hoặc xuống dòng được đặt trong nháy kép.
const BOM = String.fromCharCode(0xfeff)

const cell = (v) => {
  const text = v == null ? '' : String(v)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([BOM, csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
