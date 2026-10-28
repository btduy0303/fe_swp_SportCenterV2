# Coach Dashboard

Trang chính: `/coach` (COACH). Layout dùng chung cho `/coach/training`.

Tài liệu bàn giao đầy đủ: [COACH_DASHBOARD.md](../../../SportCenterManagementSystem_V2/docs/COACH_DASHBOARD.md) trong repository backend cùng workspace. Có định nghĩa thống kê, routes/query params, API mới/tái sử dụng, danh sách file, kết quả test và giới hạn.

API mới: `GET /api/coach/training/dashboard`. Các thao tác điểm danh, kế hoạch, kết quả và đánh giá tiếp tục dùng API Flow 4 hiện có. Cần backend cùng bản và migrations Flow 4 06–07; dashboard không thêm migration.

Kiểm tra frontend: `npm run build` pass; `npm run lint` exit 0 với 17 cảnh báo từ code cũ.

Demo local: `http://127.0.0.1:5173/coach`, tài khoản Coach test `coach01@test.local`; dùng mật khẩu được cấu hình riêng trong môi trường kiểm thử. Chỉ áp dụng cho DB UI test cô lập, không phải môi trường nhóm.
