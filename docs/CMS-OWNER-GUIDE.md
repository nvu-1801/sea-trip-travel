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

- Tour: form chi tiết chia đúng thứ tự các phần trên trang — Thông tin chung, Ảnh & thư viện, Giới thiệu, Điểm nổi bật, Lịch trình, Giá & các gói, Dịch vụ, Lưu ý & chính sách, Di chuyển, SEO, Bản dịch tiếng Anh, Tư vấn và Nâng cao. Mỗi mục nhiều dòng (điểm nổi bật, ngày lịch trình, gói giá, dịch vụ, ảnh) đều thêm/sửa/xoá và đổi thứ tự bằng ↑ ↓. Danh mục, điểm đến và ảnh được chọn bằng tên. Giữ giá liên hệ khi chưa có bảng giá chính thức; không dùng 0 để thay cho giá chưa biết. Lỗi hiện ngay cạnh trường và ở đầu form, kèm nút nhảy tới mục cần sửa.
- Số ngày tour tự tính từ số ngày lịch trình; “Giá từ” tự khớp giá người lớn thấp nhất trong bảng giá. Ảnh đầu tiên là ảnh bìa. Bản dịch EN giữ đúng số ngày lịch trình với bản VI.
- Bài viết: tiêu đề, giới thiệu, nội dung bằng khối đoạn văn/tiêu đề/danh sách/trích dẫn/ghi chú/ảnh, ngày đăng, tác giả, nổi bật và SEO. Không nhập HTML hay script.
- Danh mục/điểm đến: thông tin, thứ tự, hình ảnh và phân nhóm. Danh mục mới có URL `/danh-muc/<slug>`, hoạt động ngay sau xuất bản.
- Website & footer: tên thương hiệu, hotline, email, địa chỉ, giờ làm việc VI/EN, các liên kết footer VI/EN, mạng xã hội và bật/tắt motion. Các liên kết mạng xã hội được quản lý riêng; kiểm tra lại URL Zalo khi thay hotline.
- Nội dung VI/EN: các dòng chữ trên trang chủ, liên hệ, chính sách, nhãn và thông điệp giao diện. Tour/bài viết/danh mục/điểm đến có phần bản dịch riêng trong form; chỉ đánh dấu đã duyệt khi thật sự kiểm tra. Khi sửa nguồn chưa có bản dịch CMS, site không âm thầm dùng lại bản dịch seed đã cũ.

`Thêm mới` tạo bản nháp theo cấu trúc mẫu, không tự xuất bản. Tour mới được xóa giá, ảnh và nguồn tư liệu của mẫu để chủ quản trị chọn lại. Kiểm tra kỹ nội dung lịch trình trước khi xuất bản.

`Lưu bản nháp` giữ bản public trước đó nếu nội dung đã xuất bản; `Xuất bản thay đổi` cập nhật public ngay. Xem bản nháp đã lưu bằng liên kết xem trước. `Ẩn` gỡ khỏi website; `Thùng rác` cho phép khôi phục thành nháp. Slug tự tạo từ tên khi lưu lần đầu (tour bỏ chữ “Tour” và đổi `2N1Đ` thành `2-ngay-1-dem`). Slug tạm `noi-dung-…` còn sửa được; slug đã có tên thật và mã nội dung được giữ ổn định để bảo toàn liên kết, URL cũ tự chuyển hướng 301 sang URL mới. Khi hai phiên cùng sửa, phiên cũ bị từ chối để tránh lưu đè.

### Gợi ý nội dung tour với ChatGPT

Đầu form chi tiết tour có khối **Gợi ý nội dung với ChatGPT** (mở lại bằng nút cùng tên ở cột mục lục bên trái). Khối này gửi nội dung tour đang sửa sang ChatGPT để xin gợi ý cho phần còn thiếu.

1. Chọn các phần cần gợi ý — mặc định Giới thiệu, Điểm nổi bật, Lịch trình, Dịch vụ, Lưu ý & chính sách; có thể bật thêm SEO.
2. Bấm **Copy nội dung & mở ChatGPT**. Nội dung đang sửa (kể cả phần chưa lưu) được copy và ChatGPT mở ở tab mới. Ở tab đó: ô nhập đã có sẵn chữ thì bấm `Enter`; nếu ô trống thì dán bằng `Ctrl + V` (Mac `Cmd + V`) rồi `Enter`.
3. Đọc gợi ý, copy phần muốn dùng, dán lại vào đúng ô trong form (Giới thiệu, Điểm nổi bật, Lịch trình…) rồi bấm **Lưu**.

Không mở được ChatGPT (chặn tab mới, mạng hạn chế): bấm **Chỉ copy nội dung**, tự mở chatgpt.com (hoặc Gemini, Copilot — dán ở đâu cũng được) rồi dán và `Enter`. Không copy tự động được thì mở **Xem nội dung sẽ gửi** → **Chọn tất cả** → `Ctrl + C` để copy tay. Nội dung dài hơn giới hạn của link sẽ không điền sẵn được — hệ thống copy thay thế và báo rõ trong dòng trạng thái.

Chỉ phần chữ trong form được gửi đi: không gửi ảnh, không gửi giá nội bộ, không gửi dữ liệu khách. AI có thể viết đúng văn phong nhưng sai số liệu — chỗ nào ghi `[cần xác nhận: …]` là chỗ phải điền thông tin thật, và luôn kiểm tra lại giá, giờ, chính sách trước khi Xuất bản.

## Đồng bộ giữa các trang đang mở

Khi CMS được bật, trang public và admin tự kiểm tra thay đổi khoảng 5 giây/lần khi tab đang hiển thị. Xuất bản/ẩn/xóa bản public cập nhật các trang đang mở mà không cần F5; lưu nháp chỉ đồng bộ trong admin. Nếu đang sửa nội dung, ghi chú khách hoặc mô tả ảnh, hệ thống giữ phần chưa lưu và báo có cập nhật mới. Chỉ chọn **Tải cập nhật** khi muốn lấy bản trên server; bỏ thay đổi chưa lưu cần xác nhận. Đổi trạng thái/khôi phục vẫn tuân theo vòng đời nội dung ở trên.

Tab ẩn dừng kiểm tra, quay lại tab hoặc nối lại mạng sẽ kiểm tra tiếp. Đây là đồng bộ gần realtime, có độ trễ và không phải chế độ nhiều người cùng sửa một văn bản. Chi tiết kỹ thuật: `LIVE-CONTENT.md`.

## Xem trước khi chỉnh sửa

Trong form tour và bài viết, chọn **Xem trước đang sửa** để xem ảnh và nội dung chưa lưu. Bản xem trước rút gọn cập nhật theo form, không lưu hoặc xuất bản. Muốn xem đầy đủ giao diện thật, lưu nháp rồi mở **Xem bản nháp đã lưu**.

Thanh **Hủy các thay đổi / Lưu bản nháp / Xuất bản thay đổi** bám dưới thanh đầu trang khi cuộn. Hủy các thay đổi yêu cầu xác nhận rồi khôi phục phiên bản đã lưu gần nhất, giữ form đang mở.

Khung gallery chi tiết tour và khung chọn ảnh trong form tour có tỷ lệ vuông, tối đa **500 × 500 px**, tự co trên màn hình nhỏ. Mặc định hiển thị toàn bộ ảnh, không cắt ảnh gốc. Ảnh vừa chọn từ máy hiển thị ngay trong khi tải lên.

## Ảnh

Thư viện giữ đủ 28 ảnh gốc, không sửa byte gốc. Ảnh mới nhận JPEG/PNG/WebP tối đa 10 MB và 25 triệu pixel, đổi thành WebP, bỏ metadata và không phóng lớn ảnh nhỏ. Có thể sửa mô tả ảnh trong thư viện, chọn ảnh trong form hoặc sao chép đường dẫn. Alt của ảnh đã gắn vào nội dung được chỉnh trong form nội dung đó. Ảnh đang được tham chiếu bởi nháp/bản xuất bản/thùng rác không được xóa. Các ảnh seed trong Git được giữ để tránh làm mất dữ liệu gốc; có thể gỡ tham chiếu khỏi nội dung.

## Chăm sóc khách

Yêu cầu tư vấn được lưu trước gửi email; SMTP lỗi vẫn giữ được dữ liệu. Tab Tư vấn có trạng thái mới/đã liên hệ/tiềm năng/đã chốt/chưa phù hợp, ghi chú và nút gửi lại email. Chỉ gửi lại sau khi cấu hình SMTP đúng; không tự gửi lại email đã báo thành công. Dữ liệu và ghi chú mã hóa AES-256-GCM trong SQLite.

Danh sách hiện tải 500 lead gần nhất; khi vận hành lượng lớn cần bổ sung phân trang/xuất dữ liệu theo bộ lọc. SQLite lưu toàn bộ bản ghi trong volume/backup, không xóa các lead cũ ngoài danh sách. Nút **Xóa dữ liệu** chỉ chuyển khách vào **Thùng rác** của tab Tư vấn: dữ liệu còn nguyên (đã mã hóa) trong 60 ngày để khôi phục, hết hạn mới tự xóa vĩnh viễn. Chỉ mục đang ở Thùng rác mới xóa vĩnh viễn được, và thao tác đó có xác nhận riêng.

## Sao lưu & phục hồi

Mục **Bảo mật → Sao lưu & phục hồi** hiển thị lịch (ngày 1 & 16 lúc 03:00 Asia/Bangkok), bản thành công gần nhất, retention, offsite và cho phép tạo backup thủ công / tải bản `.seatar` đã mã hóa sau khi nhập lại mật khẩu. Tạo/tải đều có giới hạn tần suất; mật khẩu không được lưu. Trang **Sức khỏe website** có thêm card cảnh báo khi backup quá hạn, lỗi hoặc chưa cấu hình offsite.

Hệ thống **không** có nút khôi phục đè production. Khôi phục và kiểm tra chạy bằng CLI trên VPS (`manage.sh verify` / `restore-test`), không đụng dữ liệu thật. Backup cùng VPS không bảo vệ trước reset/mất ổ đĩa: phải sao chép file `.seatar` và khóa `archive.key` ra ngoài. Chi tiết: `docs/BACKUP-RESTORE.md`.

## Kiểm tra hoạt động

Mở **Kiểm tra hoạt động** ở nhóm đầu tiên của menu Studio. Trang này chỉ đọc audit log, không sửa hay xóa log.

- Thẻ trạng thái phía trên cho biết **Hoạt động bình thường**, **Có hoạt động cần xem lại** hoặc **Chưa đủ dữ liệu để đánh giá**.
- Các chỉ số đếm thao tác, admin, thành công, thất bại và số sự kiện cần xem lại trong khoảng thời gian đã chọn.
- Bộ lọc gồm khoảng thời gian, admin, loại thao tác, kết quả và ô tìm theo tên admin/đối tượng. Bấm một dòng để xem người thực hiện, thời gian, IP, lý do đánh dấu và thông tin trước/sau nếu có.
- Quy tắc đánh dấu chỉ dựa trên bằng chứng trong log: thao tác thất bại, xóa dữ liệu, thay đổi mật khẩu/quyền, hoặc từ 3 lần đăng nhập thất bại từ cùng IP trong 15 phút. Trang không kết luận admin có ý định xấu.
- Log trống, thiếu người thực hiện/IP hoặc tải lỗi đều hiện **Chưa đủ dữ liệu để đánh giá**; không coi thiếu log là hệ thống bình thường.
- Bản ghi tạo trước khi nâng cấp có thể thiếu người thực hiện/IP. Thao tác chạy trực tiếp trên máy chủ (script quản trị) và khung giờ làm việc của admin chưa được cấu hình nên chưa được đánh giá. Thời gian hiển thị theo giờ Việt Nam.

## Sức khỏe website

Mở **Sức khỏe website** ở nhóm đầu tiên của menu Studio. Trang chỉ đọc, không sửa nội dung; số liệu được giữ tối đa 60 giây và có nút **Làm mới**.

- **Dung lượng**: tổng dung lượng thư mục dữ liệu, tách database (SQLite + WAL), ảnh/tệp trong thư mục uploads và phần còn lại — so với hạn mức dự án **5 GB**. Ngưỡng cảnh báo dùng chung 88% (vàng) và 95% (đỏ) của hạn mức. Thư viện ảnh hiển thị cùng hạn mức này ngay dưới số ảnh. Trên Vercel serverless không có volume bền vững nên mục này báo không áp dụng.
- **Bộ nhớ**: RSS và heap của tiến trình Node, kèm % của hạn mức cảnh báo 5 GB.
- **Tốc độ tải**: p75 của TTFB, FCP, LCP, INP và CLS từ khách truy cập thật trong 7 hoặc 28 ngày, kèm 5 trang chậm nhất theo LCP. Cần ít nhất 20 lượt đo mới kết luận Tốt/Cần cải thiện; dưới ngưỡng đó trang ghi **Chưa đủ dữ liệu**. Số liệu được gửi ẩn danh: không cookie, không visitor id, không lưu IP; trình duyệt tự động (bot, test) bị bỏ qua.
- **SEO**: điểm 0–100 theo metadata (title/description, trùng lặp), nội dung/liên kết (ảnh bìa, alt, danh mục rỗng, tour/điểm đến, bài viết thiếu tour liên quan), kỹ thuật (slug tạm, sitemap, robots) và độ phủ bản dịch EN đã duyệt. Mỗi lỗi có số lượng; bấm **Chi tiết** (hoặc **Xem chi tiết … nhóm lỗi** trên card SEO) để mở bảng liệt kê từng trang bị ảnh hưởng, mỗi dòng có nút **Sửa** mở đúng form tour/bài viết/danh mục, còn **Sửa ngay** mở trang đầu tiên. Bấm vào dòng “Bản dịch EN đã duyệt” để xem các trang còn thiếu bản dịch. Điểm ≥80 là Tốt, 55–79 Cần cải thiện, dưới 55 Có vấn đề.
- Bảng **Máy chủ** hiển thị thời gian hoạt động, bộ nhớ, độ trễ truy vấn database và phiên bản Node — chỉ để chẩn đoán, không phải số liệu kinh doanh.

Không xoá file trực tiếp trong volume để “giảm GB”: xoá ảnh qua **Thư viện ảnh** và dọn tour/bài viết qua **Thùng rác** để hệ thống cập nhật liên kết đúng.

## Trước phát hành

Kiểm tra trên mobile, VI/EN, giá/chính sách và ảnh; xem lại tìm kiếm, form tư vấn, email và footer. Backup SQLite + uploads + lưu khóa mã hóa ở nơi riêng. Không đưa mật khẩu, khóa mã hóa, `.env.production` hoặc SSH key vào Git/chat.

## SEO

Xem `docs/SEO-QNPY.md` d? bi?t b?n d? t? kh�a ? URL, c�ch �p d?ng SEO v�o DB production b?ng `npm run seo:apply` (dry-run m?c d?nh) v� quy t?c hreflang/sitemap. Home SEO s?a trong **Website & footer ? SEO**; category/tour SEO s?a trong form tuong ?ng.
