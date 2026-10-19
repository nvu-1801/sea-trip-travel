# SEA TRIP — kế hoạch nâng cấp hình ảnh, scroll và 3D

Ngày: 19/10/2026. Trạng thái: đề xuất, chưa triển khai. Repo chính: sea-trip-travel.
Không thay đổi kế hoạch hiện có tại TRAVEL-MOTION-PLAN.md hoặc cấu hình VPS trong công việc lập kế hoạch này.

## 1. Mục tiêu và đánh giá hiện trạng

- Trang cần một trải nghiệm có dấu ấn khi khách cuộn, đồng thời giữ việc xem tour, đọc giá và gửi tư vấn thuận tiện.
- Code đã có Reveal, CSS view timelines, parallax, hover card và chuyển ảnh hero; chưa có GSAP, Three.js hay một section WebGL.
- Reveal hiện phụ thuộc hỗ trợ CSS scroll timelines; trình duyệt thiếu hỗ trợ hiển thị nội dung tĩnh. Đây có thể là một nguyên nhân khiến người xem thấy ít chuyển động, cần kiểm tra trên trình duyệt thực tế.
- Nhịp bố cục còn lặp: tiêu đề rồi đến grid/card. Thêm animation vào cùng bố cục sẽ chưa đủ; cần chỉnh cả tỷ lệ ảnh, khoảng trắng, thứ bậc chữ và trình tự kể chuyện.
- Chất lượng hình ảnh, nội dung tour, độ tin cậy, khả năng quản trị và vận hành là một phần giá trị bàn giao. Không coi nhiều hiệu ứng là bằng chứng tự động giúp bán giá cao hơn.

## 2. Tài liệu tham khảo và cách ứng dụng

| Nguồn | Điều học được | Ứng dụng đề xuất cho SEA TRIP |
| --- | --- | --- |
| [Codrops — 3D Image Rotations on Scroll](https://tympanus.net/codrops/2026/06/18/exploring-3d-image-rotations-on-scroll/) | Ảnh xoay, di chuyển theo trục Z và tiến trình cuộn | Gallery điểm đến có chiều sâu, giảm góc xoay để ảnh vẫn dễ nhìn |
| [Codrops — WebGL Carousel](https://tympanus.net/Tutorials/WebGLCarousel/) | Tham khảo demo carousel dùng WebGL | Prototype chuyển ảnh và chiều sâu; phải đánh giá trực tiếp trước khi chọn hiệu ứng |
| [Bruno Simon](https://bruno-simon.com/) | Một thế giới 3D có nhận diện riêng, có lựa chọn chất lượng hiển thị | Học tính nhất quán và khả năng giảm chất lượng; giữ điều hướng web du lịch quen thuộc |
| [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | Timeline theo scroll, scrub và pin | Điều phối chuyển cảnh hero, ảnh chồng lớp, đoạn khám phá có điểm bắt đầu/kết thúc rõ |
| [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) | Điều kiện responsive và hoàn tác animation khi điều kiện đổi | Tách desktop/mobile/reduced motion, dọn timeline khi đổi layout |
| [Three.js manual](https://threejs.org/manual/) | Tài liệu triển khai cảnh 3D | Nền tảng cho prototype gallery 3D và quản lý renderer/tài nguyên |

Các liên kết trên là nguồn tham khảo, không có nghĩa đã kiểm thử hiệu năng các demo trên điện thoại. Kiểm tra license từng tài nguyên trước khi sử dụng mã/asset; không sao chép hình ảnh, nhận diện hoặc bố cục nguyên bản.

## 3. Hướng hình ảnh

Biển xanh trong ảnh, nền trắng ấm, màu hồng thương hiệu cho thao tác chính. Ảnh lớn, bố cục lệch có chủ đích, ít khung card trang trí. Chuyển động mềm, có khoảng nghỉ để người xem đọc.

Có hai cấp độ chiều sâu, cần mô tả đúng khi bàn giao:

1. CSS 3D: ảnh/khối HTML nghiêng trong perspective, các lớp chuyển động khác tốc độ. Không phải mô hình địa hình 3D.
2. WebGL 3D: ảnh đặt trên các mặt phẳng ở vị trí X/Y/Z khác nhau, camera và ánh sáng/chất liệu được điều khiển trong không gian 3D. Đây là điểm nhấn riêng của trang; ảnh đầu vào vẫn là ảnh 2D.

Nếu muốn bay quanh một hòn đảo có địa hình thật, cần giai đoạn dựng mô hình và kiểm chứng địa lý riêng. Không thể suy ra mô hình chính xác chỉ từ các ảnh hiện có.

## 4. Kịch bản từ đầu đến cuối trang

| Khu vực | Bố cục và chuyển động | Desktop | Mobile / giảm chuyển động |
| --- | --- | --- | --- |
| Header + hero | Giữ ảnh full màn hình, header trong suốt; tiêu đề vào theo dòng, ảnh dịch chậm khi cuộn; chuyển sang section tiếp theo có nhịp | Parallax giới hạn khoảng 30–60px, chữ chuyển ít hơn ảnh | Parallax nhỏ hoặc tắt; CTA vẫn đọc và bấm được ngay |
| Tìm tour | Thanh tìm kiếm gọn, nằm trong luồng trang sau hero | Xuất hiện cùng nhịp chuyển section | Form tĩnh, không phải chờ animation |
| Khám phá điểm đến | Thay một phần grid bằng gallery bưu thiếp trong không gian 3D; ảnh gần lớn hơn, ảnh xa nhỏ hơn | Một đoạn scroll ngắn điều khiển camera đi qua 4–6 ảnh, caption đổi theo ảnh chính | Danh sách hoặc carousel ngang có nút; reduced motion dùng ảnh tĩnh |
| Tour nổi bật | Grid sạch, giá/lịch trình rõ; card xuất hiện lần lượt và ảnh dịch nhẹ | Stagger 60–90ms, tilt tối đa khoảng 3 độ chỉ với con trỏ chính xác | Card ổn định, phản hồi khi chạm/focus, không phụ thuộc hover |
| Tour theo miền | Thay danh sách card lặp bằng các cảnh ảnh lớn và thông tin đối ứng | Ảnh sticky một bên, nội dung chuyển qua từng miền; giải phóng khi hết đoạn | Các miền xếp dọc, không pin |
| Lý do chọn SEA TRIP | Đường hành trình SVG nối các cam kết đã có nội dung | Nét vẽ đi theo tiến trình cuộn, nội dung vào theo nhóm | Nét tĩnh nếu reduced motion; không tạo số liệu đánh giá giả |
| Cẩm nang | Bố cục tạp chí, một bài nổi bật và bài phụ | Ảnh được mở bằng mask ngắn; tiêu đề dịch 12–20px | Giảm chuyển động, không che nội dung khi JS lỗi |
| Tư vấn + footer | Điểm kết thúc sáng, gọn, tách khỏi gallery ảnh; form là trọng tâm | Đường nét biển nền chuyển rất nhẹ | Nền tĩnh, không có hiệu ứng gây khó nhập liệu |

Không áp dụng cùng một kiểu fade-up cho tất cả section. Không dùng hiệu ứng xoay cả trang, loading dài, con trỏ thay thế hoặc cưỡng ép tốc độ cuộn.

## 5. Điểm nhấn WebGL 3D

Chọn gallery điểm đến là cảnh 3D chính, không chạy đồng thời nhiều canvas toàn màn hình.

- Dùng ảnh CMS trên 4–6 mặt phẳng 3D, bố trí dọc đường cong nhẹ, có khoảng cách thật giữa các lớp.
- Camera dịch và xoay ít khi cuộn; ảnh chính đi gần trực diện để không méo khi đọc.
- Caption, nút xem điểm đến và thông tin tour dùng HTML, không vẽ chữ quan trọng vào canvas.
- Tương tác chuột chỉ thêm độ sâu nhẹ, không làm nút chạy khỏi con trỏ.
- Phần pin desktop nếu dùng phải có giới hạn ban đầu khoảng 1–1,5 chiều cao viewport cuộn thêm; kiểm tra thực tế rồi điều chỉnh. Người dùng luôn đi tiếp được.
- Không giữ pin khi bàn phím đang đưa focus tới nội dung ngoài cảnh. Thứ tự focus theo thứ tự nội dung.
- Chỉ tải engine/texture khi gần section; ảnh hero đầu tiên không chờ cảnh 3D tải.
- Mobile mặc định dùng bản DOM nhẹ; chỉ mở WebGL mobile sau khi đo trên máy thật và đạt ngân sách.
- Khi WebGL không khả dụng, mất context hoặc tải thất bại, thay bằng gallery HTML cùng ảnh/nội dung/đường dẫn.
- Không hứa có sóng nước chân thực ở bản đầu. Shader gợn nước chỉ là thử nghiệm bổ sung sau khi gallery đã mượt và nội dung dễ nhìn.

## 6. Tổ chức kỹ thuật

- Đề xuất GSAP + ScrollTrigger cho timeline chính, CSS cho hover/phản hồi, Three.js cho một cảnh gallery. Không thêm đồng thời nhiều engine chuyển động cho cùng phần tử.
- Các thư viện này chưa có trong package.json. Khi bắt đầu triển khai mới cài `npm install gsap @gsap/react three` và `npm install -D @types/three`, kiểm tra bản tương thích và license tại thời điểm cài.
- Giữ Next.js Server Components cho nội dung; cô lập animation và canvas thành Client Components nhỏ.
- Khởi tạo bằng context/useGSAP, hoàn tác đúng scope; không kill toàn bộ timeline của trang khác.
- Tách wrapper reveal, wrapper tilt và lớp ảnh parallax để tránh nhiều animation tranh cùng thuộc tính transform.
- Không cập nhật React state theo từng pixel cuộn. Timeline/motion giá trị chạy ngoài vòng render React.
- Xử lý ảnh tải xong, font sẵn sàng, thay kích thước và CMS cập nhật; refresh số đo có debounce.
- Xuất bản từ CMS không làm mất vị trí đọc, nhân đôi listener hoặc để canvas/texture cũ tồn tại. Hủy geometry, material, texture và renderer khi thay cảnh/unmount.
- CSS view timeline hiện tại được thay có chủ đích ở các section nâng cấp; phần còn lại giữ fallback hiển thị được.
- Dừng render liên tục khi ngoài viewport hoặc tab bị ẩn; cảnh không thay đổi thì không render vô ích.

## 7. Quản trị

- Giữ hai lựa chọn hero carousel/ảnh ghép hiện có và toàn bộ khả năng sửa ảnh/nội dung.
- Thêm hồ sơ chuyển động: Tắt / Nhẹ / Đầy đủ. Reduced motion của thiết bị luôn được ưu tiên.
- Gallery 3D lấy điểm đến đã xuất bản; admin chọn thứ tự 4–6 điểm đến, ảnh, vị trí cắt, caption VI/EN và liên kết hợp lệ.
- Nếu chỉ có 1–3 điểm đến, dùng bố cục gallery tĩnh phù hợp, không chèn dữ liệu giả hoặc nhân đôi ảnh để đủ số lượng.
- Lưu nháp/xuất bản, preview và đồng bộ các tab tuân theo cơ chế CMS hiện có.
- Admin có hướng dẫn ngắn về khác biệt desktop/mobile, ảnh phù hợp và cách tắt chuyển động. Không yêu cầu chủ web chỉnh shader hoặc camera.
- Không đưa lại dòng “Chọn một nhịp đi khác”, nút “Nhận tư vấn” trên header hoặc nút dừng chuyển động lớn mà người dùng đã yêu cầu bỏ. Dùng cài đặt hiển thị nhỏ trong footer nếu cần điều khiển công khai.

## 8. Trình tự triển khai và bàn giao

### Mốc 1 — thiết kế và prototype

- Chụp baseline trang hiện tại trên desktop và mobile, đo tải trang/khả năng tương tác.
- Dựng storyboard toàn trang và prototype gallery CSS 3D so với WebGL 3D bằng ảnh thật.
- Bàn giao bản xem được trong trình duyệt cùng video cuộn ngắn; chốt phương án dựa trên hình ảnh, thao tác và số đo. Không chỉ bàn giao bản mô tả hiệu ứng.

### Mốc 2 — bố cục và chuyển động toàn trang

- Chỉnh nhịp khoảng trắng, tỷ lệ ảnh, tiêu đề, màu nền nối section.
- Triển khai hero, card tour, vùng miền, cam kết, cẩm nang và tư vấn theo kịch bản.
- Hoàn thành cả mobile, bàn phím và reduced motion cho từng phần trước khi thêm phần tiếp theo.

### Mốc 3 — tích hợp 3D và CMS

- Tích hợp phương án gallery đạt yêu cầu vào nội dung thực; lazy load và fallback.
- Hoàn thiện cấu hình admin, kiểm tra draft/publish/live update trong lúc đang cuộn.
- Giới hạn texture theo kích thước hiển thị; không tăng độ phân giải giả cho ảnh nguồn nhỏ.

### Mốc 4 — QA và phát hành

- Quay video trước/sau, đo trên thiết bị thực, sửa giật/chồng lớp/cắt chữ trước khi phát hành.
- Chạy unit/CMS, lint, typecheck, production build, hero/UI/tour checks; mở rộng browser checks cho motion và 3D.
- Kiểm tra Docker production và health. Chỉ ghi nhận đã deploy khi release SHA và health khớp.
- Công việc này không tự thay cấu hình shared proxy/VPS và không bật auto deploy khi HTTPS chưa đạt.

## 9. Tiêu chí nghiệm thu

Các số sau là mục tiêu cần đo, chưa phải kết quả đã đạt:

- Trên profile mobile được ghi rõ: LCP mục tiêu <=2,5s, CLS <=0,1; đánh giá độ trễ tương tác trong lab, xác nhận INP <=200ms bằng dữ liệu thực khi đủ traffic.
- Animation desktop hướng tới 60fps, mobile tương thích hướng tới ít nhất 30fps ổn định. Ghi thiết bị, trình duyệt, viewport và profile thử; không cam kết mọi máy đều đạt.
- Gallery 3D tải thêm JS gzip mục tiêu <=250KB và texture tổng mục tiêu <=1,5MB; đo bản build thực. Vượt ngân sách thì giảm cảnh/texture trước khi thêm hiệu ứng.
- Chỉ một renderer/canvas 3D hoạt động; không rò tài nguyên sau 10 lần đổi trang, layout hoặc xuất bản gallery.
- Đủ 360/390/768/1280/1440px, VI/EN, Chrome/Edge/Firefox/Safari, touch và bàn phím. Không tràn ngang, không mắc kẹt pin, không bị header che CTA.
- Reduced motion, tắt motion trong CMS, WebGL lỗi, mất context, JS lỗi và mạng chậm đều có nội dung và liên kết dùng được.
- Hiệu ứng hiện rõ khi cuộn thật, không chỉ chứng minh bằng ảnh chụp. Có video demo desktop/mobile và bản ghi kiểm tra.
- Không làm mất CRUD, form lead, theo dõi phiên admin, thùng rác, SEO, draft/publish hoặc dữ liệu ảnh hiện có.

## 10. Quyết định đề xuất

Nâng cấp bố cục và chuyển động toàn trang, dùng CSS 3D tiết chế ở card và một gallery WebGL 3D làm dấu ấn. Bắt đầu bằng prototype có thể xem trực tiếp; sau đó mới hoàn thiện toàn bộ website. Đo khả năng sử dụng và tốc độ cùng với độ đẹp để xác định phạm vi bàn giao cho khách hàng.
