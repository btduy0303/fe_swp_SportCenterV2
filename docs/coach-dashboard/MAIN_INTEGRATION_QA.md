# Kiểm tra ghép Flow 4 vào frontend mới

- Base: origin/main tại fe4d4fa.
- Giữ các route đăng ký/xác minh email/quên mật khẩu của team.
- Menu avatar Member dùng query tab, giữ cả điều hướng từ trang chủ qua location.state.tab.
- Thêm lịch sử thanh toán vào avatar; giữ thông báo và mở hộp đổi mật khẩu.
- Không khôi phục chức năng BMI đã được team loại bỏ.
- Coach giữ lịch tuần, cập nhật hồ sơ, xếp loại cuối khóa, mở/xóa suất trống và hủy suất đã đặt kèm lý do.
- Đánh giá tiến bộ của Flow 4 và xếp loại cuối khóa của Flow 2 có lối vào riêng.
- Kiểm tra UI dùng API giả lập trên cổng 15174: Member avatar → payments; avatar → đổi mật khẩu; Coach overview, slots, weekly, profile, reviews. Không gửi thay đổi đến BE.
- Harness kiểm tra và server tạm được dọn sau khi sử dụng.
- Unit tests Flow 4: 12/12 đạt. Production build đạt. Lint không có lỗi; còn cảnh báo trên các thành phần dùng chung và màn của team.
- Chưa chạy lại E2E với backend/database thật trong lần chuẩn bị push này.
