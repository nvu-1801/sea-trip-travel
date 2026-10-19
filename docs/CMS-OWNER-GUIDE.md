# SEA TRIP Studio — sử dụng nội dung và tư vấn

## Bắt đầu

Mở `/admin` sau khi bootstrap tài khoản trên máy chủ. Chỉ có một chủ quản trị, không có đăng ký công khai. Đăng nhập, đổi mật khẩu trong tab Bảo mật; đổi/reset sẽ thu hồi các phiên đang mở. Xem `VPS-DEPLOY.md` để tạo tài khoản và cấu hình môi trường.

## Quên mật khẩu

Không có nút đặt lại công khai hay email reset. Chỉ chủ hệ thống đặt lại được bằng lệnh trên máy chủ; reset thu hồi mọi phiên đăng nhập cũ. Mật khẩu 14–200 ký tự.

Local (không gõ mật khẩu trực tiếp vào lệnh, tránh lưu history):

```powershell
$env:ADMIN_USERNAME="ten-admin"
$env:ADMIN_PASSWORD="mat-khau-14+-ky-tu"
npm run admin -- reset
Remove-Item Env:\ADMIN_PASSWORD
Remove-Item Env:\ADMIN_USERNAME
```

Docker/VPS (xem thêm `VPS-DEPLOY.md`):

```bash
read -r -p 'Admin username: ' ADMIN_USERNAME
read -r -s -p 'Admin password (14+ characters): ' ADMIN_PASSWORD; echo
export ADMIN_USERNAME ADMIN_PASSWORD
docker compose --env-file .env.production exec -T -e ADMIN_USERNAME -e ADMIN_PASSWORD app node scripts/admin.mjs reset
unset ADMIN_PASSWORD ADMIN_USERNAME
```

## Vòng đời nội dung

- `Lưu bản nháp` giữ bản public cũ (nếu đã xuất bản); `Xuất bản thay đổi` cập nhật website ngay.
- `Ẩn khỏi website` gỡ khỏi trang public nhưng giữ bản nháp.
- `Thùng rác` chuyển bản ghi sang trạng thái đã xóa: không hiện ở website, tìm kiếm hay sitemap; mở bộ lọc Thùng rác để xem hoặc khôi phục.
- `Khôi phục` đưa nội dung về lại bản nháp (chưa public); sau khôi phục, danh sách tự chuyển về bộ lọc Tất cả để thấy bản ghi.
- Xóa là xóa mềm, không mất dữ liệu; chỉ Xóa dữ liệu khách (tab Tư vấn) và ảnh chưa được tham chiếu mới là xóa vĩnh viễn.
- Thao tác thùng rác/ẩn/khôi phục không đổi ngày hiển thị của bài viết/tour.

## Nội dung

### Giao diện trang chủ

Trong tab **Giao diện trang chủ**, chọn **Chỉnh sửa** để chọn giữa **Carousel ảnh lớn** và **Bố cục ảnh ghép**. Mỗi kiểu giữ cấu hình riêng; chuyển kiểu không làm mất dữ liệu kiểu còn lại.

Carousel phủ toàn màn hình đầu và chạy ra sau header trong suốt. Khi cuộn xuống hoặc mở menu, header hiện nền sáng để giữ chữ dễ đọc; trở về đầu trang sẽ trong suốt lại.

- Carousel giữ 1–8 slide: chọn ảnh trong thư viện, sửa mô tả ảnh, chỉnh vị trí lấy nét ngang/dọc, chú thích VI/EN và tiêu đề/mô tả riêng của slide. Có thể thêm, đưa lên/xuống và bỏ slide. Bỏ slide chỉ bỏ mục khỏi cấu hình, không xoá file ảnh, không đưa file ảnh vào Thùng rác.
- Ảnh ghép có ảnh chính và ảnh phụ, đều chọn lại được và chỉnh vị trí lấy nét.
- Nội dung dùng chung có bản VI/EN và nhãn/đường dẫn hai nút. Trường chữ để trống sẽ dùng nội dung tương ứng ở tab Nội dung VI / EN; tiêu đề/mô tả riêng của slide ghi đè phần dùng chung.
- Tự chuyển mặc định tắt; nếu bật, mỗi slide giữ 6–20 giây. Trình chiếu dừng khi giảm chuyển động, tab ẩn, hero ngoài màn hình hoặc tương tác bàn phím. Vẫn chuyển ảnh thủ công được.
- Tải ảnh mới tại Thư viện ảnh trước khi chọn. Năm ảnh hero khách cung cấp đã có sẵn, bên cạnh 28 ảnh tour gốc được giữ nguyên.
- **Lưu bản nháp** giữ giao diện public cũ. **Xuất bản thay đổi** cập nhật trang đang mở trong khoảng 5 giây; không cần rebuild. Mục cấu hình hero không có thao tác xoá/ẩn toàn bộ.

- Tour: thông tin, ảnh, lịch trình, thời lượng, danh mục/điểm đến, gói giá, bao gồm/không bao gồm, chính sách và SEO. Danh mục, điểm đến và ảnh được chọn bằng tên. Giữ giá liên hệ khi chưa có bảng giá chính thức; không dùng 0 để thay cho giá chưa biết.
- Bài viết: tiêu đề, giới thiệu, nội dung bằng khối đoạn văn/tiêu đề/danh sách/trích dẫn/ghi chú/ảnh, ngày đăng, tác giả, nổi bật và SEO. Không nhập HTML hay script.
- Danh mục/điểm đến: thông tin, thứ tự, hình ảnh và phân nhóm. Danh mục mới có URL `/danh-muc/<slug>`, hoạt động ngay sau xuất bản.
- Website & footer: tên thương hiệu, hotline, email, địa chỉ, giờ làm việc VI/EN, các liên kết footer VI/EN, mạng xã hội và bật/tắt motion. Các liên kết mạng xã hội được quản lý riêng; kiểm tra lại URL Zalo khi thay hotline.
- Nội dung VI/EN: các dòng chữ trên trang chủ, liên hệ, chính sách, nhãn và thông điệp giao diện. Tour/bài viết/danh mục/điểm đến có phần bản dịch riêng trong form; chỉ đánh dấu đã duyệt khi thật sự kiểm tra. Khi sửa nguồn chưa có bản dịch CMS, site không âm thầm dùng lại bản dịch seed đã cũ.

`Thêm mới` tạo bản nháp theo cấu trúc mẫu, không tự xuất bản. Tour mới được xóa giá, ảnh và nguồn tư liệu của mẫu để chủ quản trị chọn lại. Kiểm tra kỹ nội dung lịch trình trước khi xuất bản.

`Lưu bản nháp` giữ bản public trước đó nếu nội dung đã xuất bản; `Xuất bản thay đổi` cập nhật public ngay. Xem bản nháp đã lưu bằng liên kết xem trước. `Ẩn` gỡ khỏi website; `Thùng rác` cho phép khôi phục thành nháp. Slug/path và mã nội dung được giữ ổn định sau khi tạo để bảo toàn liên kết. Khi hai phiên cùng sửa, phiên cũ bị từ chối để tránh lưu đè.

## Đồng bộ giữa các trang đang mở

Khi CMS được bật, trang public và admin tự kiểm tra thay đổi khoảng 5 giây/lần khi tab đang hiển thị. Xuất bản/ẩn/xóa bản public cập nhật các trang đang mở mà không cần F5; lưu nháp chỉ đồng bộ trong admin. Nếu đang sửa nội dung, ghi chú khách hoặc mô tả ảnh, hệ thống giữ phần chưa lưu và báo có cập nhật mới. Chỉ chọn **Tải cập nhật** khi muốn lấy bản trên server; bỏ thay đổi chưa lưu cần xác nhận. Đổi trạng thái/khôi phục vẫn tuân theo vòng đời nội dung ở trên.

Tab ẩn dừng kiểm tra, quay lại tab hoặc nối lại mạng sẽ kiểm tra tiếp. Đây là đồng bộ gần realtime, có độ trễ và không phải chế độ nhiều người cùng sửa một văn bản. Chi tiết kỹ thuật: `LIVE-CONTENT.md`.

## Ảnh

Thư viện giữ đủ 28 ảnh gốc, không sửa byte gốc. Ảnh mới nhận JPEG/PNG/WebP tối đa 10 MB và 25 triệu pixel, đổi thành WebP, bỏ metadata và không phóng lớn ảnh nhỏ. Có thể sửa mô tả ảnh trong thư viện, chọn ảnh trong form hoặc sao chép đường dẫn. Alt của ảnh đã gắn vào nội dung được chỉnh trong form nội dung đó. Ảnh đang được tham chiếu bởi nháp/bản xuất bản/thùng rác không được xóa. Các ảnh seed trong Git được giữ để tránh làm mất dữ liệu gốc; có thể gỡ tham chiếu khỏi nội dung.

## Chăm sóc khách

Yêu cầu tư vấn được lưu trước gửi email; SMTP lỗi vẫn giữ được dữ liệu. Tab Tư vấn có trạng thái mới/đã liên hệ/tiềm năng/đã chốt/chưa phù hợp, ghi chú và nút gửi lại email. Chỉ gửi lại sau khi cấu hình SMTP đúng; không tự gửi lại email đã báo thành công. Dữ liệu và ghi chú mã hóa AES-256-GCM trong SQLite.

Danh sách hiện tải 500 lead gần nhất; khi vận hành lượng lớn cần bổ sung phân trang/xuất dữ liệu theo bộ lọc. SQLite lưu toàn bộ bản ghi trong volume/backup, không xóa các lead cũ ngoài danh sách. Xóa dữ liệu khách là thao tác vĩnh viễn có xác nhận.

## Trước phát hành

Kiểm tra trên mobile, VI/EN, giá/chính sách và ảnh; xem lại tìm kiếm, form tư vấn, email và footer. Backup SQLite + uploads + lưu khóa mã hóa ở nơi riêng. Không đưa mật khẩu, khóa mã hóa, `.env.production` hoặc SSH key vào Git/chat.
