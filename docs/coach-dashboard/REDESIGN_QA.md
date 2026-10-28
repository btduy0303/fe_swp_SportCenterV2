# Flow 4 UI/UX redesign

Ngày kiểm tra: 27/10/2026.

## Phạm vi thực hiện

- Coach workspace: sidebar navy thu gọn, menu di động bằng native dialog, header ngày/tên/avatar thật, liên kết bỏ qua điều hướng.
- Dashboard: bốn thống kê từ API, lịch hôm nay, lớp phụ trách, tác vụ nhanh, trạng thái cần chốt và nhật ký thao tác thật.
- Lịch và điểm danh: bộ lọc có nhóm, bảng có vùng cuộn riêng, số liệu đã lưu phân biệt biểu mẫu chưa lưu, điểm danh hàng loạt, thanh lưu bám dưới màn hình.
- Kế hoạch: phân biệt cá nhân/cả lớp, bài tập có thứ tự và đơn vị, form chia ba phần, thêm bài tập, trạng thái và phiên bản giữ nguyên.
- Kết quả: form có nhóm, số liệu thực tế có đơn vị, lịch sử và bản chụp bài tập được giao vẫn được giữ.
- Tiến bộ: hồ sơ học viên, mục tiêu thật, lịch sử mở rộng, biểu thị điểm đánh giá 1–5, nhận xét và form đánh giá theo kỳ.
- Hội viên: chỉ trang Flow 4 dùng theme sáng và các thành phần mới; lịch, kế hoạch, điểm danh, kết quả, nhận xét giữ nguyên dữ liệu API.
- Skeleton, trạng thái rỗng/lỗi, focus, điều hướng tab bằng bàn phím, giảm chuyển động theo thiết lập hệ thống.
- ConfirmModal và toast có biến thể `training` riêng. Các nơi dùng biến thể cũ tiếp tục giữ giao diện cũ.

Không thêm dependency. Không thay đổi backend, endpoint, phân quyền hoặc quy tắc nghiệp vụ trong đợt redesign này. Các thay đổi chức năng từ đợt triển khai Flow 4 trước đó vẫn được giữ trong working tree.

## Kiểm tra frontend

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run build` | Đạt, Vite tạo bundle thành công |
| `npm run lint` | Exit 0, không có lỗi; 17 cảnh báo đã tồn tại từ baseline |
| Console trình duyệt | Không có log error trong lượt kiểm tra cuối |
| `git diff --check` | Không có lỗi whitespace; Git thông báo chuyển LF/CRLF |

17 cảnh báo thuộc AuthContext, ToastContext, phần legacy của ConfirmModal, authService, ClassSection và dashboard Member/Manager/Receptionist. Hai cảnh báo mới trong lúc thiết kế (import chưa dùng, Date trong render) đã được xử lý.

## Kiểm tra thủ công trên trình duyệt

Thực hiện với FE `http://127.0.0.1:5173`, BE `http://127.0.0.1:18080`, database kiểm thử riêng `scms_flow4_fix_ui_20261027`.

| Luồng | Kết quả quan sát |
| --- | --- |
| Đăng nhập Coach và Member | Vào đúng dashboard; đăng xuất và đăng nhập lại hoạt động |
| Dashboard/lớp phụ trách | Hiện dữ liệu thật; mở chi tiết lớp, lịch lớp và hồ sơ Coach thành công |
| Tác vụ nhanh | Tạo kế hoạch mở đúng form; ghi kết quả lọc đúng các buổi DONE |
| Bộ lọc lịch | Tìm kiếm không có kết quả hiện trạng thái rỗng; xóa bộ lọc trả lại 9 buổi |
| Sidebar | Thu gọn về 80px và mở rộng hoạt động |
| Menu mobile | Mở, Escape đóng, trả focus về nút menu; chọn mục điều hướng đóng menu |
| Điểm danh | Lưu ghi chú buổi 3 thành công, tải lại vẫn giữ giá trị |
| Ghi kết quả | Lưu hoạt động kiểm thử với 300 giây; hiển thị trong lịch sử Coach và Member |
| Kế hoạch | Tạo bản nháp hai bài tập thành công; mở form chỉnh sửa và chi tiết được |
| Đánh giá | Lưu đánh giá 4/5 thành công, xuất hiện ở Coach và Member |
| Lịch sử hội viên | Đọc được kế hoạch đã giao, điểm danh, kết quả, nhận xét; bản nháp không xuất hiện |
| Phân trang | Tải thêm đánh giá từ 50 lên 53 bản ghi, hiện đã tải toàn bộ |
| Tabs bàn phím | ArrowRight và Home chọn/focus đúng tab; Ctrl+Home cuộn trang và giữ nguyên tab |
| Xác nhận chốt | Nút xác nhận khóa lúc đếm ngược, sau đó được mở; Escape đóng và trả focus về nút chốt |
| Gate nghiệp vụ | Buổi chưa chốt khóa ghi kết quả; trước giờ kết thúc khóa chốt buổi; buổi DONE được ghi/sửa kết quả theo quyền API |
| Lịch 1-1 | Mở đúng giao diện rỗng từ API, chưa có fixture lịch hẹn để kiểm thử hủy |

Đã sửa hai lỗi phát hiện trong QA: focus của hộp xác nhận không trở về nút mở, và tab bắt nhầm Ctrl+Home. Đã kiểm tra lại cả hai.

### Responsive

- 1280px: dashboard, điểm danh, form kế hoạch, tiến bộ và bảng lịch.
- 820px: điểm danh, menu tablet và trang hội viên.
- 390px: dashboard, menu, form kế hoạch, điểm danh, xác nhận và kết quả hội viên.
- Các màn hình đã đo có `document.documentElement.scrollWidth <= innerWidth`. Bảng rộng cuộn bên trong vùng có nhãn, không đẩy trang tràn ngang.
- Form chuyển một cột trên mobile, input 16px, nút chính ít nhất 44px. Thanh lưu kế hoạch nằm cuối form để không che nội dung; điểm danh tiếp tục dùng thanh sticky.

## Giới hạn xác minh

- Đây là QA giao diện và các hành trình chính trên dữ liệu thử, không phải cam kết không còn mọi lỗi trong toàn hệ thống.
- Không chạy lại toàn bộ backend test suite vì đợt này không sửa backend. Kết quả audit chức năng trước đó được lưu trong tài liệu backend riêng.
- Chưa chạy ma trận trình duyệt Safari/Firefox, thiết bị vật lý hoặc công cụ kiểm thử accessibility tự động.
- Không tạo lỗi mạng giả trong lượt QA này; đã giữ xử lý lỗi/thử tải lại và thêm kiểu hiển thị lỗi có `role=alert`.
- Không phát hành lại kế hoạch, hủy lịch 1-1 hoặc thao tác thanh toán trong QA redesign.
- Manager/Receptionist không được redesign. Kiểm tra source xác nhận CSS mới được scope trong CoachLayout/MemberTraining; không thực hiện lại toàn bộ hành trình của hai vai trò này.

## Dữ liệu thử đã ghi

Các thay đổi chỉ nằm trong database UI riêng: ghi chú buổi 3, kết quả `ui-check-swim`, bản nháp `UI QA · kỹ thuật bơi`, một đánh giá kiểm thử 4/5. Không có dữ liệu giả trong frontend. Giờ buổi 2 được tạm đổi để mở hộp xác nhận rồi khôi phục về 14:08–15:08, không thực hiện chốt buổi này.

## Ảnh giao diện

- [Trước redesign](screenshots/dashboard-before.jpg)
- [Dashboard desktop](screenshots/dashboard-desktop.png)
- [Dashboard mobile](screenshots/dashboard-mobile.png)
- [Điểm danh desktop](screenshots/attendance-desktop.png)
- [Form kế hoạch](screenshots/plan-editor-desktop.png)
- [Tiến bộ học viên](screenshots/progress-desktop.png)
- [Xác nhận trên mobile](screenshots/confirmation-mobile.png)
- [Kết quả hội viên trên mobile](screenshots/member-results-mobile.png)

## Chạy thử

FE và BE được giữ chạy trên các địa chỉ ở trên. Coach: `coach01@test.local`; Member: `member001@test.local`. Dùng mật khẩu được cấu hình riêng trong môi trường kiểm thử, không lưu mật khẩu trong repository. Tài khoản này chỉ dành cho database kiểm thử cục bộ.
