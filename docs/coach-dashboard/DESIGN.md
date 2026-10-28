# Coach dashboard design

HLV đọc bảng điểm danh dài ở quầy sáng đèn và dùng điện thoại cạnh hồ bơi, cần đọc tên và trạng thái rõ trong ánh sáng mạnh. Theo yêu cầu redesign, vùng làm việc chuyển sang nền sáng, sidebar navy vẫn giữ nhận diện cùng xanh dương của project.

- Font: biến `--font-main`, Plus Jakarta Sans và system fallback hiện có.
- Nền neutral hơi xanh `oklch(97% .006 250)`, surface `oklch(99.8% .002 250)`; sidebar navy `oklch(22% .035 255)`; chữ chính `oklch(27% .025 255)` và chữ phụ `oklch(47% .025 255)`.
- Accent: xanh dương `oklch(51% .18 258)` cho hành động, emerald cho hoàn thành, amber cho cần chú ý, đỏ cho lỗi. Không biểu diễn trạng thái chỉ bằng màu.
- Desktop: sidebar 244px cố định theo viewport, thu gọn được; header trắng có ngày, avatar tên viết tắt thật và tên Coach. Nội dung giới hạn 1440px, khoảng trống 24–32px.
- Bốn thẻ số liệu là yêu cầu của brief, dùng icon, tên, số, định nghĩa, không thêm số tăng trưởng giả. Lịch ưu tiên thao tác theo ngữ cảnh; các lớp tách bằng dòng thông tin.
- Mobile: sidebar đóng thành drawer mở bằng nút menu, Escape/backdrop đóng và trả focus. Nội dung một cột, thống kê hai cột; bảng có vùng cuộn có nhãn, không làm trang tràn ngang.
- Form nhóm theo đối tượng, thông tin, bài tập; chỉ tiêu số có đơn vị. Thanh lưu sticky thấp vừa đủ và không che nội dung. Đánh giá dùng dữ liệu thật, không suy diễn đường tiến bộ từ điểm 1–5.
- Thẻ chỉ dùng để nhóm lịch, lớp và tác vụ; nhật ký là danh sách. Không gradient, hiệu ứng kính hoặc chuyển động trang trí.
- Focus rõ, link/button 44px; skeleton, lỗi có thử lại, empty giải thích bước tiếp theo; reduced-motion. Xác nhận dùng lại ConfirmModal với theme Flow 4 và dialog bàn phím. Không chỉnh theme dashboard các vai trò khác.
