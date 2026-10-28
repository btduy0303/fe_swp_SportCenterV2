import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZES, pageNumbers } from './paginationUtils'
import styles from '../../css/training/Pagination.module.css'

export default function Pagination({ page, pages, pageSize, start, end, total, hasMore = false, busy = false, onPageChange, onPageSizeChange, label = 'danh sách' }) {
  if (!end) return null
  return <nav className={styles.pagination} aria-label={`Phân trang ${label}`} aria-busy={busy}>
    <div className={styles.summary} role="status" aria-live="polite" aria-atomic="true">
      {busy ? 'Đang tải trang…' : <>Hiển thị {start + 1}–{end}{total != null ? ` / ${total}` : ''} bản ghi <span>· Trang {page}{!hasMore ? ` / ${pages}` : ''}</span></>}
    </div>
    <div className={styles.controls}>
      <label className={styles.size}>Số dòng
        <select aria-label={`Số dòng mỗi trang ${label}`} value={pageSize} disabled={busy} onChange={e => onPageSizeChange(Number(e.target.value))}>
          {PAGE_SIZES.map(size => <option key={size} value={size}>{size} / trang</option>)}
        </select>
      </label>
      <div className={styles.pages}>
        <button type="button" disabled={busy || page === 1} aria-label={`Trang trước ${label}`} onClick={() => onPageChange(page - 1)}><ChevronLeft size={15} aria-hidden="true" /><span>Trước</span></button>
        {pageNumbers(page, pages).map(number => typeof number === 'number'
          ? <button type="button" key={number} data-near={Math.abs(number - page) <= 1} aria-label={`Trang ${number} ${label}`} aria-current={number === page ? 'page' : undefined} disabled={busy} onClick={() => onPageChange(number)}>{number}</button>
          : <span className={styles.gap} key={number} aria-hidden="true">…</span>)}
        {hasMore ? <span className={styles.gap} title="Có thêm trang; chọn Sau để xem tiếp" aria-label="Còn trang tiếp theo">…</span> : null}
        <button type="button" disabled={busy || (page === pages && !hasMore)} aria-label={`Trang sau ${label}`} onClick={() => onPageChange(page + 1)}><span>Sau</span><ChevronRight size={15} aria-hidden="true" /></button>
      </div>
    </div>
  </nav>
}
