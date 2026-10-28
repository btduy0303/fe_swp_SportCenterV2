# Phân trang Flow 4

Ngày thực hiện: 27/10/2026.

## Phạm vi

- Coach: danh sách lớp đầy đủ, lịch hôm nay/cần điểm danh, lịch tập, bảng học viên điểm danh, kết quả của buổi, kế hoạch, lịch sử điểm danh/kết quả/đánh giá học viên.
- Member: lịch tập, kế hoạch, lịch sử điểm danh, kết quả, đánh giá và nhận xét.
- Bản tóm tắt ba lớp trên dashboard vẫn có liên kết đến danh sách đầy đủ. Dropdown chọn lớp/học viên và các bài tập trong biểu mẫu giữ cách hiển thị phù hợp với thao tác chọn/nhập liệu.

## Hành vi

- Mặc định 10 dòng; chọn 10/20/50 dòng, có Trước/Sau và số trang. Màn hình nhỏ chỉ giữ các số trang gần trang hiện tại.
- Danh sách đã có đủ dữ liệu dùng `PaginatedList`; lọc toàn bộ dữ liệu trước khi chia trang. Đổi bộ lọc hoặc số dòng trở về trang 1; dữ liệu giảm thì tự điều chỉnh về trang hợp lệ.
- Kế hoạch/lịch sử dùng `PagedRecords` và API cursor hiện có. Lô đầu có tối đa 50 bản ghi; chuyển trang tái sử dụng cache và chỉ tải phần còn thiếu. Số trang được mở dần khi chọn Sau, dấu … biểu thị còn dữ liệu. Chỉ hiển thị tổng số bản ghi/trang sau khi nhận được trang cuối; không suy đoán tổng số từ lô đầu.
- Chuyển ngược trang đã tải không gọi lại API. Lỗi tải giữ trang hiện tại và cho thử lại; cache được làm mới sau lưu/tải lại/đổi nguồn hoặc tài khoản. Hủy request khi unmount.
- Dữ liệu điểm danh nằm ở `SessionEditor`, bên ngoài phần chia trang: ghi chú/trạng thái ở trang khác vẫn được giữ trong payload. Đánh dấu tất cả có mặt và chốt buổi áp dụng toàn bộ học viên; giao diện ghi rõ phạm vi mọi trang.
- Không sửa schema, migration, endpoint hoặc quy tắc quyền truy cập backend trong đợt này.

## Kiểm thử tự động

```powershell
node --test src/pages/training/trainingUtils.test.js src/pages/training/paginationUtils.test.js
npm run build
npm run lint
```

12/12 ca qua: 4 ca bộ lọc và 8 ca phân trang. Ca phân trang kiểm tra danh sách rỗng/giảm dữ liệu, số trang lớn, cache, ranh giới 50 bản ghi khi chọn 20 dòng, duyệt đủ 1.037 bản ghi không lặp/mất, thử lại sau lỗi từng phần, cursor không tiến và hủy request.

Build thành công; lint exit 0 với 17 cảnh báo có sẵn. Không chạy lại backend suite trong đợt này vì không thay đổi backend.

## Kiểm thử trình duyệt

FE `http://127.0.0.1:5173`, BE `http://127.0.0.1:18080`; dùng DB kiểm thử riêng `scms_flow4_fix_ui_20261027`.

| Tình huống | Kết quả |
| --- | --- |
| Coach: lịch 12 buổi | Trang 1 có 10; trang 2 có 2, phạm vi 11–12/12 |
| Đổi trạng thái khi đang ở trang 2 | Về trang 1, lọc DONE còn 2 buổi |
| Coach: lịch sử 53 đánh giá | Trang 6 tải qua cursor và có đúng 3 bản ghi, 51–53/53; Sau bị vô hiệu hóa |
| Chọn 20 dòng từ lô đầu 50 | Trang 3 tải phần còn thiếu, có 13 bản ghi, 41–53/53 |
| Chuyển 10/20 dòng | Về trang 1, số dòng và số trang tương ứng |
| Member: đánh giá | Tới trang 6, hiện 51–53/53; không có nút sửa đánh giá |
| Member: kế hoạch/điểm danh/kết quả/lịch tập | Thanh phân trang đúng từng danh sách, không lẫn dữ liệu khi đổi tab |
| Mobile viewport 390px | Không tràn trang; các nút gần trang hiện tại vừa trong thanh phân trang |
| Biểu mẫu dùng component thật với 21 học viên trong bộ nhớ | Nhập ghi chú ở trang 1 và 2; quay lại vẫn giữ giá trị; payload có cả hai ghi chú; đổi bộ lọc ở trang 3 về trang 1 |

Biểu mẫu kiểm thử trong bộ nhớ được mở bằng trang QA tạm, không ghi dữ liệu vào DB; trang và mã QA tạm đã được xóa sau kiểm tra.

Console trình duyệt không ghi nhận lỗi trong lượt kiểm tra cuối. Viewport kiểm thử đã được trả về mặc định.

Ảnh: [desktop](screenshots/pagination-desktop.png), [mobile](screenshots/pagination-mobile.png).
