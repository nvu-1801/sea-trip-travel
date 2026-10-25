# Prompt triển khai Sea Trip Travel — Cinematic Coast

> Giao toàn bộ tài liệu này cho agent có quyền đọc/sửa repository và chạy trình duyệt. Đây là yêu cầu triển khai đến bản preview đã kiểm tra, không chỉ viết kế hoạch. Tài liệu là brief, không import vào ứng dụng.

## 1. Nhiệm vụ và phạm vi

Hãy nâng cấp trang chủ Sea Trip Travel theo concept **“Cinematic Coast — Cuộn để bước vào chuyến đi”**. Tạo trải nghiệm cuộn 3D có chiều sâu, hình ảnh biển cao cấp, chuyển cảnh liền mạch và luồng khám phá/đặt tour rõ ràng.

Thực hiện code, chạy kiểm tra, mở preview và sửa các lỗi phát hiện được. Làm từng mốc để kiểm soát chất lượng, nhưng tiếp tục đến khi hoàn thành toàn bộ phạm vi; không dừng sau prototype để chỉ đề xuất bước tiếp theo. Tự quyết định các chi tiết triển khai thông thường, chỉ hỏi khi có thông tin bắt buộc thực sự thiếu.

**Phạm vi lần này: local implementation và preview. Không commit, push, tạo PR, merge hoặc deploy nếu người dùng chưa yêu cầu thêm.** Giữ nguyên thay đổi không thuộc nhiệm vụ. Không thay đổi backend, schema CMS, hạ tầng hoặc workflow release chỉ để thực hiện giao diện.

## 2. Khảo sát bắt buộc trước khi sửa code

- Đọc `AGENTS.md` ở workspace, repository và thư mục liên quan; tuân thủ hướng dẫn hiện hành.
- Chạy `git status --short --branch`, xem diff hiện có và xác định checkout đang làm việc. Không reset, stash hoặc ghi đè công việc khác.
- Đọc `package.json`, lockfile, các script verification và tài liệu liên quan. Với Next.js, đọc hướng dẫn phù hợp trong `node_modules/next/dist/docs/` theo AGENTS.md trước khi viết code ứng dụng.
- Theo dấu trang chủ từ route đến hero, các section, nguồn dữ liệu CMS và localization. Kiểm tra cấu hình các chế độ hero; tránh làm mất chế độ đang được CMS sử dụng.
- Kiểm tra cách hiện tại quản lý motion, giảm chuyển động, idle animation và theme để tránh hai hệ thống cùng điều khiển một thuộc tính.
- Xác minh ảnh nào đang có thật, đường dẫn và metadata; không tự tạo đường dẫn asset không tồn tại.
- Chạy/mở baseline local, ghi lại screenshot desktop/mobile trước khi thay đổi nếu môi trường cho phép.

Các điểm bắt đầu đã được nhận diện, phải kiểm tra lại vì repository có thể thay đổi:

```text
src/features/home/hero.tsx
src/features/home/collage-hero.tsx
src/features/home/hero-carousel.tsx
src/features/home/horizon-canvas.tsx
src/features/home/hero-copy.ts
src/features/home/hero.css
src/features/home/home-editorial.css
src/features/home/home-motion.css
src/features/home/idle-motion-manager.tsx
src/features/home/motion-control.tsx
src/features/home/explore-section.tsx
src/features/home/featured-tours-section.tsx
src/features/home/journey-story.tsx
src/features/home/quick-finder.tsx
src/components/motion/depth-stage.tsx
src/components/motion/tilt-card.tsx
src/components/motion/word-reveal.tsx
```

Trong lần khảo sát ban đầu, `CollageHero` nhận `locale`, `HeroConfig`, `HeroCopy`, dùng `HorizonCanvas` và dữ liệu điểm đến; package.json chưa khai báo GSAP/Three.js. Không coi đây là trạng thái chắc chắn ở thời điểm bạn chạy.

## 3. Art direction

- Màu chủ đạo: xanh đại dương, xanh ngọc, trắng cát, điểm nhấn ánh nắng ấm; hòa hợp với nhận diện và theme thực tế.
- Bố cục thoáng, typography lớn nhưng có phân cấp rõ, giữ khả năng đọc tiếng Việt và các locale đang hỗ trợ.
- Một khoảnh khắc 3D chủ đạo ở hero; các section sau dùng ảnh thật, chuyển động có nhịp và chiều sâu nhẹ.
- Dùng ảnh thật hiện có của điểm đến, ưu tiên nguồn CMS và component ảnh hiện tại.
- Cảnh biển 3D là lớp không khí thương hiệu. Không mô phỏng địa hình rồi trình bày như ảnh thật của Quy Nhơn, Phú Yên hoặc điểm đến khác.
- Tránh neon, vật thể nổi ngẫu nhiên, kính mờ quá mức, nhiều particle, chữ bay liên tục và hiệu ứng lặp ở mọi section.
- Nếu thiếu ảnh/model/poster phù hợp, liệt kê cụ thể asset cần bổ sung. Tiếp tục bằng fallback trung thực từ nguồn hiện có; không tuyên bố đã có asset chưa tồn tại.

## 4. Storyboard cần triển khai

### Hero — biển và lời mời khởi hành

Mặt biển chuyển động nhẹ, đường chân trời rõ, ánh sáng ấm có chiều sâu. Tiêu đề, mô tả, CTA là HTML và xuất hiện ngay cả khi JavaScript/3D chưa sẵn sàng. CTA chính dẫn đến luồng khám phá/tìm tour hiện có, CTA phụ theo nội dung thực tế. Nội dung không phải chờ loader toàn màn hình.

### Chuyển cảnh đầu tiên — tiến về bờ

Cuộn xuống làm camera tiến nhẹ về phía đường bờ theo cảm giác điện ảnh, kết hợp lớp ảnh và typography. Dùng một timeline GSAP có `scrub` để các lớp cùng một nhịp. Cuộn ngược phải phục hồi đúng hình ảnh.

Chỉ pin hero/chuyển cảnh đầu tiên. Điểm xuất phát trên desktop: khoảng 60–100% chiều cao viewport bổ sung; điều chỉnh sau khi xem thực tế. Mobile rút ngắn đáng kể hoặc bỏ pin nếu cần. Khách phải tiếp cận danh sách tour nhanh, có thể đi thẳng bằng CTA/anchor.

### Điểm đến — từ cảnh biển sang ảnh thật

Mở khung ảnh lớn từ cảnh biển sang ảnh điểm đến trong CMS bằng mask/clip hoặc transform phù hợp. Dùng parallax nhẹ, tên điểm đến xuất hiện có nhịp. Tên, liên kết và vùng bấm luôn rõ, không bị canvas che.

### Tour nổi bật — ổn định để lựa chọn

Thẻ tour xuất hiện theo nhịp rồi ổn định trên mặt phẳng dễ đọc, dễ so sánh. Có thể dùng chiều sâu nhẹ trên desktop, không liên tục xoay các thẻ. Bảo toàn giá, lịch trình, dữ liệu CMS, bộ lọc, URL và hành vi đặt tour.

### Câu chuyện thương hiệu và CTA cuối

Ảnh lớn, chuyển động chậm, khoảng thở và sắc nắng ấm tạo cảm xúc. Giảm chuyển động gần form và CTA; không làm nút bấm dịch chuyển dưới con trỏ. Dùng nội dung thật đang có, tránh tự thêm số liệu hoặc cam kết kinh doanh.

## 5. Yêu cầu kỹ thuật

### GSAP + ScrollTrigger là hệ thống cuộn chính

- Bắt buộc sử dụng **GSAP + ScrollTrigger** cho timeline hero/chuyển cảnh đầu tiên.
- Dùng `scrub` đồng bộ camera 3D, lớp ảnh và typography theo tiến độ cuộn.
- Giữ native scroll. Không thêm Lenis hoặc scroll container riêng khi chưa có lý do thực tế.
- Dùng `gsap.matchMedia()` cho desktop, mobile và `prefers-reduced-motion`.
- Scope selector theo component; cleanup bằng `gsap.context().revert()` hoặc `useGSAP()` nếu chọn dependency đó. Cleanup cả matchMedia, listener và trigger thuộc component, tránh kill trigger toàn ứng dụng.
- Không cập nhật React state theo từng frame/scroll tick. Dùng ref hoặc object chuyển động dùng chung cho renderer và timeline.
- Có một nguồn tiến độ cuộn chính; tránh vòng lặp RAF hoặc hệ thống smoothing chồng nhau.
- Tính lại kích thước/pin khi cần; refresh có kiểm soát sau khi ảnh/font ảnh hưởng layout tải xong. Kiểm tra resize, đổi breakpoint, điều hướng đi/về và cuộn tới anchor.

### Cảnh 3D và tích hợp Next.js

- Chọn Three.js trực tiếp hoặc React Three Fiber sau khi khảo sát. Ưu tiên cách ít dependency và dễ bảo trì nhất đáp ứng cảnh biển thật sự có chiều sâu/camera.
- Không chỉ đặt tên “3D” cho một ảnh nền có parallax. Cần một cảnh render 3D ở chế độ hỗ trợ, kèm fallback phù hợp.
- Kiểm tra phiên bản và peer dependencies trước khi cài; dùng package manager/lockfile của repository, không dùng cờ ép tương thích.
- Chỉ GSAP và renderer cần thiết là bắt buộc; các thư viện phụ phải có lý do rõ. Không bắt buộc dùng WebGPU, model GLB, postprocessing hoặc hệ mô phỏng nước nặng.
- Giữ route/nội dung SEO trong server-rendered HTML khi phù hợp; chỉ tạo client boundary nhỏ cho motion/scene.
- Lazy-load renderer. Có poster hoặc ảnh nền dự phòng thấy được từ đầu, xử lý import lỗi, khởi tạo WebGL thất bại và context loss. Không để lộ vùng trống khi fallback.
- Khi cảnh mới hoạt động, không render chồng `HorizonCanvas` cũ hoặc shader/idle nền khác trong cùng khu vực.
- Giới hạn DPR và độ phức tạp hình học/shader theo thiết bị. Dừng RAF khi cảnh ngoài viewport, tab bị ẩn hoặc chế độ motion tắt; resume đúng khi quay lại.
- Dispose geometry, material, texture và renderer do component sở hữu; hủy RAF và observer/listener khi unmount. Không dispose tài nguyên chia sẻ đang được component khác dùng.

### Accessibility, mobile và nội dung

- Tôn trọng cả `prefers-reduced-motion` và nút điều khiển motion hiện có. Reduced motion bỏ pin/scrub/loop không cần thiết, vẫn hiển thị đầy đủ nội dung.
- Thiết kế mobile riêng: camera di chuyển ít hơn, giảm lớp và độ phân giải, không phụ thuộc hover.
- Không chặn wheel/touch để ép chạy animation; canvas trang trí không bắt pointer và không xuất hiện trong thứ tự Tab.
- CTA, form, điều hướng và liên kết dùng được bằng bàn phím; focus rõ, độ tương phản tốt.
- Không làm animation khiến nội dung bị ẩn vĩnh viễn khi JavaScript lỗi hoặc tắt.
- Giữ cấu trúc heading, alt, localized URL, dữ liệu CMS và luồng tìm/đặt tour. Không hardcode chỉ một ngôn ngữ.
- Không đưa thuật ngữ kỹ thuật như WebGL, shader, FPS hoặc loader debug vào nội dung marketing.

## 6. Các mốc thực hiện

1. **Khảo sát và baseline:** ghi ngắn kiến trúc thực tế, nguồn ảnh, rủi ro tích hợp và file dự kiến sửa. Sau đó bắt tay triển khai.
2. **Prototype hero:** hoàn thành scene, fallback và timeline đầu tiên. Mở trình duyệt kiểm tra desktop/mobile, cuộn hai chiều và CTA; sửa trước khi mở rộng.
3. **Hoàn thiện trang:** tích hợp điểm đến, tour và câu chuyện theo cùng ngôn ngữ mỹ thuật; giữ giao diện chọn tour ổn định.
4. **Tối ưu và kiểm tra:** reduced motion, motion toggle, resize, lỗi WebGL/import, tải chậm, điều hướng và hiệu năng.
5. **Bàn giao preview:** cung cấp URL local đang truy cập được, screenshot và báo cáo kiểm tra. Nếu server còn chạy, nêu cách dừng; không khẳng định vẫn chạy khi đã tắt.

Không tự mở rộng sang refactor toàn website. Cập nhật tiến độ ngắn ở mỗi mốc và ghi lại quyết định quan trọng để có thể tiếp tục khi context bị rút gọn.

## 7. Kiểm tra và tiêu chí nghiệm thu

### Hành vi và hình ảnh

- Một khoảnh khắc 3D nổi bật, gắn rõ với du lịch biển và Sea Trip.
- Không nhảy bố cục, tràn ngang, pin mắc kẹt hoặc lớp ảnh che CTA.
- Cuộn xuống/lên, cuộn nhanh, reload giữa trang, resize và đổi breakpoint hoạt động ổn định.
- Danh sách tour tiếp cận nhanh; giá, liên kết, tìm kiếm và luồng đặt tour còn hoạt động.
- Không có lỗi console/hydration mới do thay đổi.
- Nội dung/CTA vẫn dùng được khi 3D chưa tải, tải lỗi, WebGL không hỗ trợ và khi giảm chuyển động.
- Kiểm tra desktop và viewport mobile thực tế bằng browser; screenshot ít nhất hero, chuyển cảnh, điểm đến và tour. Kiểm tra locale đang hỗ trợ và theme bị ảnh hưởng.

### Hiệu năng — báo bằng chứng, không suy đoán

- Mục tiêu: 60fps desktop, ít nhất 30fps trên thiết bị mobile thử nghiệm.
- Đo trong cùng một đoạn cuộn hero có thể lặp lại; ghi browser, viewport, phần cứng/thiết bị nếu biết, build dev hay production, thời lượng mẫu và phương pháp.
- Phân biệt nhịp RAF với thời gian GPU render; số đo RAF chỉ là chỉ báo, không đủ để kết luận toàn bộ trải nghiệm mượt.
- Nếu chỉ có mobile emulation trên desktop, ghi rõ đó là giả lập, không xác nhận đã đạt trên điện thoại thật.
- Nếu không có công cụ đo hoặc không đạt mục tiêu, báo giới hạn và tối ưu đã làm; không tự ghi “đạt 60fps”.

### Verification repository

- Xác minh script đang có trước khi chạy. Chạy lint, typecheck, test/build và kiểm tra UI/hero/depth phù hợp phạm vi theo hướng dẫn repository.
- Nếu chạy full preflight, dùng `npm run verify:preflight -- --full`. Khi người dùng yêu cầu push ở bước sau, full preflight là bắt buộc trước push.
- Không dùng `PREFLIGHT_SKIP`, nới assertion hoặc sửa check để che lỗi. Khi giao diện thay đổi có chủ đích, chỉ cập nhật kiểm tra dựa trên yêu cầu hành vi mới và giải thích lý do.
- Không thêm test chỉ để lặp lại implementation. Ưu tiên kiểm tra fallback, điều hướng, nội dung và hành vi tương tác có giá trị.
- Phân biệt lỗi baseline với lỗi phát sinh; báo chính xác lệnh đã chạy, kết quả và phần chưa kiểm tra.

## 8. Nội dung bàn giao cuối

Trả lời ngắn, có bằng chứng:

1. Đã thay đổi gì và lý do chọn cách dựng scene/timeline.
2. File chính và dependency đã thêm, nếu có.
3. URL preview local và screenshot trước/sau khi có thể.
4. Kiểm tra đã chạy, kết quả và vấn đề còn lại.
5. Số đo hiệu năng cùng điều kiện đo, phân biệt desktop/mobile giả lập/thiết bị thật.
6. Asset còn thiếu và giới hạn thực tế, nếu có.
7. Xác nhận phạm vi bàn giao local; chưa thực hiện release.

**Bắt đầu bằng khảo sát repository, rồi thực hiện các mốc đến bản preview hoàn chỉnh.**
