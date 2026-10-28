# Menu avatar hội viên — 27/10/2026

- Thêm avatar vào Navbar cho Member, dùng ảnh hồ sơ nếu có và chữ viết tắt khi chưa có/ảnh lỗi.
- Dropdown chứa Gói tập, Lớp đã đăng ký, Lịch hẹn 1-1, Đánh giá thể lực, Voucher, Hồ sơ, Hành trình tập luyện và Đăng xuất.
- Các mục dashboard dùng `/member?tab=...`; giá trị không hợp lệ về Gói tập. Tải lại trang giữ mục đang xem. Các nút tab cũ được gom vào dropdown cho Member; vai trò khác còn truy cập dashboard vẫn có điều hướng cũ.
- Hỗ trợ Enter/Space, ArrowDown mở và focus liên kết đầu, Tab, Escape đóng/trả focus, bấm ngoài hoặc chuyển trang tự đóng. Nút có nhãn, trạng thái expanded và mục hiện tại.
- Desktop và viewport 390px đã kiểm tra thực tế; dropdown không làm tràn trang và có giới hạn chiều cao/cuộn khi cần.
- Đã mở các mục dashboard, chuyển sang Flow 4 rồi quay lại Hồ sơ, tải lại Hồ sơ và đăng xuất bằng dropdown.

## Lỗi phát hiện khi thử menu

API `/api/member/vouchers` trả `{ tierDiscountAmount, vouchers }`; màn cũ coi cả object là array nên trắng trang tại `myVouchers.map`. Đã lấy đúng `vouchers` trong service (vẫn hỗ trợ response array cũ) và hiển thị theo trường `kind/value/expiresAt/usable` của API. Voucher WELCOME trên DB test hiển thị đúng 10%, hết hạn 22/11/2026. Không đổi cách tính ưu đãi hoặc endpoint backend.

## Kiểm tra

- `npm run build`: qua.
- `npm run lint`: exit 0, 17 cảnh báo có sẵn.
- `git diff --check`: qua.
- Chỉ đọc dữ liệu tài khoản kiểm thử Member; không gửi đăng ký, thanh toán, đổi voucher hoặc cập nhật hồ sơ.

Ảnh: [desktop](screenshots/member-avatar-desktop.png), [mobile](screenshots/member-avatar-mobile.png).
