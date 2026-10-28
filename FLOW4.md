# Flow 4 — Training and Attendance

Rà soát logic (27/10/2026): sửa bộ lọc buổi đã lên lịch và lỗi ngày đánh giá lệch múi giờ server; 69/69 tests backend Flow 4 qua. Đợt bổ sung phân trang sau đó: **12/12 tests frontend qua** (8 phân trang + 4 bộ lọc), build qua, lint exit 0 với 17 cảnh báo có sẵn. Xem [kiểm tra phân trang](docs/coach-dashboard/FLOW4_PAGINATION_QA.md) và báo cáo backend `docs/FLOW4_LOGIC_RECHECK_2026-10-27.md`. Các số liệu audit cuối tài liệu là kết quả của đợt trước.

Coach: `/coach/training`. Member: `/member/training`. Có link từ Navbar và cả hai dashboard. Dùng JWT và dữ liệu thật từ backend.

Tài liệu thiết kế/schema/API/quyền/quy tắc/kiểm thử/danh sách file: repository backend, `docs/FLOW4_TRAINING_ATTENDANCE.md`.

Backend cần áp `database/v3_06_flow4_training_attendance.sql` sau v3_05, tiếp theo **`database/v3_07_flow4_revision.sql`** trước khi dùng. Migration 07 thêm version của buổi tập. Triển khai frontend/backend cùng phiên bản vì các danh sách đã chuyển sang `{ items, nextCursor }`. Vite mặc định proxy `/api` về localhost:8080; đổi bằng `SCMS_API_TARGET` khi chạy backend cổng riêng. CORS backend cần khớp origin frontend.

```powershell
npm ci
npm run dev
npm run build
npm run lint
```

Module có CSS Modules responsive, loading/error/empty states, xác nhận khi chốt điểm danh, fetch lại sau lưu và nút Tải lại. Thời lượng bài tập/kết quả dùng **giây**. Bài bị bỏ khỏi kế hoạch vẫn được giữ trong snapshot kết quả đã ghi.

- Điểm danh và kết quả gửi `session.version`; tab cũ nhận 409 và dùng Tải lại buổi tập trước khi lưu tiếp. Cùng một revision bảo vệ cả điểm danh, chốt và kết quả.
- Các danh sách có Trước/Sau, số trang, khoảng bản ghi và chọn 10/20/50 dòng. Lịch tập lọc trước khi phân trang; đổi bộ lọc hoặc số dòng trở về trang 1. Điểm danh giữ toàn bộ biểu mẫu khi chuyển trang; đánh dấu tất cả và chốt áp dụng mọi trang.
- `PagedRecords` phân trang kế hoạch/lịch sử qua API cursor hiện có. Tận dụng lô đầu 50 dòng, chỉ tải phần còn thiếu khi chuyển trang, có loading/error/thử lại và hủy request khi unmount. Số trang được mở dần qua Sau; tổng số bản ghi chỉ hiện khi xác định đã tới cuối. Không cắt ngầm ở 1.000 dòng. Thứ tự mới ghi trước theo ID; bản ghi mới xuất hiện sau Tải lại.
- Tiếp nối lịch sử: `/api/member/training/history/{kind}` và `/api/coach/training/classes/{classId}/members/{memberId}/history/{kind}`; kế hoạch Coach dùng `/api/coach/training/plans`. Gửi cursor từ response, limit 1–100 (mặc định 50). Member lấy danh tính từ JWT.
- Buổi bị hủy giữ bản lưu và lý do, hiển thị Không tính thống kê. Đăng ký lại hợp lệ không bị lần hủy cũ khóa. Coach vẫn xem đánh giá của học viên đã rời lớp dù chưa từng điểm danh.

Sau sửa sáu lỗi audit ngày 27/10/2026: **57/57 tests Flow 4 qua** (30 unit + 27 integration); frontend build qua, lint exit 0 với 20 warnings sẵn có ngoài Flow 4. Toàn backend 187/188 qua; còn một lỗi AuthServiceTest sẵn có thuộc Flow 1. UI đã thử hai tab, lưu/chốt/sửa kết quả, giao kế hoạch, nhận xét, Tải thêm ở Coach/Member và mobile 390px trên DB riêng. Chi tiết nằm ở `docs/FLOW4_FIXES_2026-10-27.md` trong backend. DB nhóm chưa được áp migration bởi đợt sửa này.
