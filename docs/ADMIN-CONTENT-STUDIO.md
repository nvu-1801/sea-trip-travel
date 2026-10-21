# Admin Content Studio

Nhánh: `feat/admin-content-studio`. Nền source: `main` tại `14350dc`.

## Mục tiêu và luồng quản trị

Người quản trị tìm nội dung theo vị trí trên website, mở modal, sửa bằng biểu mẫu, lưu nháp hoặc xuất bản. Tour và bài viết là dữ liệu dùng chung cho card, danh sách, tìm kiếm và trang chi tiết; không tạo bản sao nội dung cho từng vị trí.

Sidebar gồm Trang chủ, Tour du lịch, Danh mục tour, Điểm đến, Cẩm nang du lịch, Các trang khác, Đầu trang & menu, Chân trang & liên hệ, Thư viện ảnh, Nhãn & thông báo, Yêu cầu tư vấn, Tài khoản & bảo mật. Tổng quan, chăm sóc khách hàng và đổi mật khẩu được giữ lại.

## Ánh xạ nơi sửa

| Vị trí website                  | Mục quản trị                             | Dữ liệu DB                                                                     |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| Ảnh lớn đầu trang               | Trang chủ → Ảnh lớn đầu trang            | `hero/home`                                                                    |
| Bộ tìm chuyến đi                | Trang chủ → Tìm chuyến đi                | `landing/home-sections.finder`, `messages/{vi,en}.home.finder`                 |
| Khám phá điểm đến               | Trang chủ → Khám phá điểm đến            | `landing.explore`; ảnh/tên lấy từ `destinations`                               |
| Tour nổi bật                    | Trang chủ → Tour nổi bật                 | `landing.featured.tourIds`, `messages.home.featured`; dữ liệu tour từ `tours`  |
| Cam kết dịch vụ                 | Trang chủ → Cam kết dịch vụ              | `landing.trust`                                                                |
| Hành trình theo số ngày         | Trang chủ → Chọn hành trình theo số ngày | `landing.story` gồm tiêu đề, mô tả, ảnh và card                                |
| Vùng miền                       | Trang chủ → Du lịch theo vùng miền       | `landing.regions`; card lấy từ `categories`                                    |
| Giá trị thương hiệu             | Trang chủ → Vì sao chọn SEA TRIP         | `landing.values`, `messages.home.values`                                       |
| Cẩm nang nổi bật                | Trang chủ → Cẩm nang nổi bật             | `landing.guides`, `messages.home.guides`; nội dung từ `articles`               |
| Hỏi đáp                         | Trang chủ → Câu hỏi thường gặp           | `landing.planning`                                                             |
| Mời tư vấn                      | Trang chủ → Mời khách gửi yêu cầu tư vấn | `messages.home.consult`                                                        |
| Bật/tắt và thứ tự section       | Trang chủ                                | `landing.display`, `landing.sectionOrder`                                      |
| Đích các nút chính              | Trang chủ → section → Liên kết nút       | `landing.links`                                                                |
| Card và chi tiết tour           | Tour du lịch                             | `tours`                                                                        |
| Card và chi tiết cẩm nang       | Cẩm nang du lịch                         | `articles`                                                                     |
| Trang danh mục mới              | Danh mục tour                            | `categories`, đường dẫn `/danh-muc/<slug>`                                     |
| Liên hệ và biểu mẫu             | Các trang khác → Trang liên hệ           | `messages.contact`, `messages.lead`; liên hệ thực tế lấy từ `settings.contact` |
| Trang danh sách                 | Các trang khác → Các trang danh sách     | `messages.guides`, `messages.tourExplorer`                                     |
| Chính sách bảo mật              | Các trang khác → Chính sách bảo mật      | `pages/page_privacy`, giữ `/chinh-sach-bao-mat`                                |
| Trang nội dung bổ sung          | Các trang khác → Thêm mới                | `pages`, public tại `/trang/<slug>`                                            |
| Logo, menu, menu con            | Đầu trang & menu                         | `settings.logoSrc`, `settings.navigation`, `messages.header`                   |
| Footer, hotline, email, địa chỉ | Chân trang & liên hệ                     | `settings`, `messages.footer`                                                  |

## Biểu mẫu và ảnh

Tour chia thành thông tin chung, hình ảnh, lịch trình, giá/dịch vụ, chính sách, English, hiển thị/tìm kiếm. Bài viết, trang nội dung, danh mục và điểm đến có các nhóm tương ứng. Những mã kỹ thuật được ẩn; đường dẫn được khóa sau lần lưu đầu tiên. Các quan hệ tour, danh mục, điểm đến và bài viết sử dụng bộ chọn tên thay vì nhập ID.

Ảnh được kéo thả hoặc chọn bằng hộp chọn file ngay trong modal; có preview và thư viện ảnh dùng lại. Mỗi ô nhận một ảnh; bộ ảnh được thêm từng mục, có nút lên/xuống. JPEG/PNG/WebP, giới hạn 10 MB, máy chủ xác minh định dạng, xoay đúng chiều, giới hạn kích thước và chuyển WebP. Gỡ ảnh khỏi nội dung không xóa file. File tiếp tục nằm trong volume uploads; DB chỉ lưu đường dẫn và metadata.

Modal dùng native dialog để quản lý focus; Escape/đóng yêu cầu xác nhận nếu chưa lưu. Khóa lưu/đóng khi tải ảnh hoặc đang ghi dữ liệu. Thay đổi ở phiên khác không ghi đè biểu mẫu đang nhập; người quản trị chủ động tải cập nhật. Phiên bản cũ bị từ chối khi lưu.

## Dữ liệu và xuất bản

Giữ SQLite và bảng `records` hiện có. Collection `pages` sử dụng các khối nội dung có cấu trúc, không chạy HTML do người dùng nhập. Các trường section mới và logo/menu có giá trị mặc định tương thích bản cũ. `INSERT OR IGNORE` chỉ bổ sung seed còn thiếu, không ghi đè nội dung đã sửa, revision hoặc bản đã xuất bản.

`POST /api/admin/batch` yêu cầu session, cùng origin và CSRF; tất cả thay đổi trong một modal được ghi trong một giao dịch SQLite. Nếu một bản ghi xung đột hoặc sai dữ liệu, toàn bộ giao dịch và bộ đếm phiên bản được rollback.

Với cấu hình dùng chung (`landing`, `settings`, `messages`), trình sửa gửi các đường dẫn trường thuộc phần đang chỉnh. Khi xuất bản, máy chủ chỉ ghép các trường này vào snapshot public; bản nháp đã lưu của phần khác tiếp tục ở trạng thái riêng tư. Trình sửa toàn bộ nhãn có thể xuất bản toàn bộ bản ghi khi chọn rõ mục đó. Thao tác API cũ không gửi phạm vi vẫn giữ hành vi xuất bản toàn bộ bản ghi để tương thích.

Tour/bài viết được ghim trên trang chủ phải được gỡ ghim khỏi bản nháp và bản public trước khi xóa. Trang mới có nháp/xuất bản/ẩn/thùng rác/khôi phục; trang ẩn trả 404 và được gỡ khỏi sitemap. URL chính sách bảo mật được dành riêng cho bản ghi hiện có. Bản dịch trang mới chưa duyệt không được lập chỉ mục.

## Kiểm tra và chạy local

Dùng Node >= 22.13, `npm ci`, cấu hình `.env.local` theo `.env.example`, bật `CMS_ENABLED=1`, đặt khóa mã hóa theo hướng dẫn dự án và tạo tài khoản bằng lệnh bootstrap hiện có. Không commit tài khoản hoặc DB thật.

```sh
npm run lint
npm run typecheck
npm test
npm run test:cms
npm run build
npm run verify:ui
npm run verify:tour-import
npm run verify:cms
npm run verify:hero
npm run verify:admin-studio
```

Các script trình duyệt dùng DB/uploads và tài khoản ngẫu nhiên trong thư mục tạm. Cài Chrome hoặc đặt `CHROMIUM_EXECUTABLE_PATH` tới Chromium tương thích. `verify:admin-studio` kiểm tra thực tế modal, lưu nháp/xuất bản, ảnh, trang mới, CSRF, rollback, bật/tắt/sắp xếp, menu, viewport và lỗi JavaScript. Không dùng DB production để chạy QA.

## Phạm vi và lưu ý review

- Giữ các kiểu bố cục section và hệ thống responsive trong code; quản trị viên sửa nội dung, danh sách, ảnh, liên kết, thứ tự và hiển thị của các section đã hỗ trợ. Đây không phải công cụ tạo mọi kiểu bố cục tùy ý.
- Một số nhãn trợ năng/thông báo hệ thống vẫn ở mục Nhãn & thông báo. Nội dung nghiệp vụ thông thường có lối vào theo trang/section.
- Chính sách bảo mật được chuyển từ JSX sang các khối nội dung; cảnh báo dự thảo pháp lý hiện có vẫn được giữ. Các token `{siteName}`, `{address}`, `{email}`, `{hotline}` lấy từ cấu hình liên hệ, không cần nhập lại.
- Sao lưu SQLite và uploads trước khi đưa lên máy chủ. Không có thay đổi cấu trúc bảng hay thay công nghệ DB trong bản này.
- Nhánh không tự triển khai VPS: workflow deploy chỉ cho `main` theo cấu hình hiện có. Chủ repo tạo MR/PR để review trước khi merge.

## Kết quả kiểm tra bản bàn giao

- `lint`, `typecheck`, production `build`: thành công.
- Unit tests: 137/137; CMS tests: 25/25.
- Browser CMS: 47/47; hero: 35/35; admin studio mới: 31/31; UI: 174/174.
- Tour import: 88 tổ hợp route/viewport/ngôn ngữ thành công.
- Đã xem ảnh chụp desktop và modal mobile; kiểm tra cả chiều rộng nội dung bên trong modal ở 360/390/768px.
- Kiểm thử dùng Node 24.19, Chromium 153 và dữ liệu tạm; dự án tiếp tục yêu cầu Node >=22.13. Không kiểm thử trên DB production.
- Môi trường không có Docker; bước Docker build/smoke test vẫn nằm trong workflow để chạy khi tạo PR.

Kiểm tra cũ được cập nhật theo UI hiện tại: tên nút modal, điều khiển motion qua cấu hình, số ảnh gốc đối chiếu seed, đo tap target ở trạng thái không chuyển động và chờ banner hoàn tất kiểm tra visibility trước khi đo animation. Ô nhập/chọn thời lượng của bộ tìm nhanh được tăng vùng bấm lên 44px.
