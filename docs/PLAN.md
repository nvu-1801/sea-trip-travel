# Kế hoạch SEA TRIP TRAVEL

Tài liệu này là bản kế hoạch và biên bản quyết định đi kèm source. Những gì đã
quan sát được ghi rõ là **quan sát**; những gì là lựa chọn của người lập kế hoạch
ghi rõ là **đề xuất**.

---

## 1. Tóm tắt phương án được chọn

| Quyết định | Lựa chọn | Lý do ngắn |
| --- | --- | --- |
| Framework | **Next.js 16 (App Router) + TypeScript** | Trang nội dung là tĩnh; endpoint nhận lead nằm cùng ứng dụng. Không cần backend riêng. |
| Xử lý email | **Route Handler trong app**, sau một interface `Mailer` | Không dựng service thứ hai; đổi nhà cung cấp = thêm một adapter |
| Nguồn dữ liệu | **File TypeScript + Zod + kiểm tra toàn vẹn khi build** | Có kiểu, có kiểm tra, không cần DB ở MVP; đổi sang CMS chỉ sửa `lib/data` |
| Styling | **Tailwind v4 với design token trong CSS** | Token là CSS variable, không có file config thứ hai |
| Chuyển động | **CSS scroll-driven animation**, không JS | Không bundle, không hydration mismatch, không phá vỡ khi JS lỗi |
| Phương án lead | **Chỉ gửi email**, không lưu DB | Hộp thư sales đã là nơi lưu trữ bền vững; tránh dựng hạ tầng thừa |
| Ngoài phạm vi | Admin, auth, thanh toán, booking, vé máy bay, khách sạn | Chưa có quy trình nghiệp vụ và chưa có người dùng |

Chi tiết: `docs/architecture.md`, `docs/lead-flow.md`, `docs/design-tokens.md`.

---

## 2. Khảo sát và giới hạn chưa xác minh

### 2.1 Website tham khảo — ĐÃ quan sát

Nguồn: `https://saigontimestravel.com/` (truy cập và đọc cấu trúc trang chủ).

**Điều quan sát được (không suy diễn):**

- **Điều hướng cấp 1 gồm 9 mục + hotline** và một số mục trỏ ra ngoài site
  (một microsite riêng, một Zalo Mini App): Giới Thiệu, Nước Ngoài, Ưu đãi,
  Inbound, Tour Đoàn, Vé Máy Bay, Khám Phá Nhật Bản (external), Nội Địa,
  Zalo Mini App (external), Lịch khởi hành, hotline `0916 938 824`.
- **Hero**: ảnh banner toàn chiều rộng, có **ảnh riêng cho mobile** (hai URL khác
  nhau), tiêu đề "Từ Đông Nam Á Đến Thế Giới, Trong Tầm Tay Bạn", và một nút
  "Tìm tour" dẫn tới trang danh mục.
- **Thẻ tour** gồm: ảnh thumbnail vuông 360×360, nhãn danh mục ("Tour Hàn Quốc"
  / "Tour Nhật Bản"), tiêu đề kèm thời lượng, **thành phố khởi hành** ("Tp.Hồ Chí
  Minh"), chip thời lượng có icon đồng hồ, **logo hãng hàng không**, giá
  ("19.990.000đ"), và nhãn marketing ("Giá tốt", "Hoàn 100% nếu rớt visa").
- **Trường hợp chưa có giá** hiển thị **"Chưa cập nhật"** rồi **"0đ"** ở dòng giá.
- **Danh mục** có đếm số tour: Châu Âu 154, Nhật Bản 969, Hàn Quốc 497,
  Trung Quốc 2403, Thái Lan 1653, Singapore 760.
- **Cấu trúc trang chủ** theo thứ tự: banner → Ưu Đãi → Tour mùa thu → Tour nước
  ngoài (theo danh mục) → Tour trong nước → Đối tác chiến lược → Báo chí nói gì →
  Sự kiện/cộng đồng → đăng ký nhận ưu đãi → footer.
- **Footer** có khối pháp lý đầy đủ: tên công ty, MST `0314620212`, số giấy phép
  kinh doanh dịch vụ lữ hành quốc tế, logo Bộ Công Thương, 4 văn phòng, email,
  hotline 24/7, link Facebook/TikTok/Zalo/YouTube, QR Zalo Mini App.
- **Có đăng ký nhận tin** ("Đăng ký ngay để nhận nhiều ưu đãi").
- Trang con quan sát thấy trong điều hướng: `/ve-chung-toi`, `/danh-sach-uu-dai`,
  `/lich-khoi-hanh`, `/lien-he`, `/kinh-nghiem-du-lich`, `/nhat-ky-hanh-trinh`,
  `/chinh-sach-bao-mat`, `/danh-gia-khach-hang`, `/su-kien`, `/tuyen-dung`,
  `/dang-ky-doi-tac`, `/visa`, `/tour-du-lich/[slug]`, `/tour-nuoc-ngoai/[danh-muc]`.

**Điểm phù hợp để kế thừa về mặt trải nghiệm (đề xuất):**

1. Thẻ tour có **thành phố khởi hành** và **chip thời lượng** ngay trên ảnh — khách
   lọc rất nhanh. SEA TRIP giữ cả hai.
2. **Đếm số tour theo danh mục** giúp khách biết danh mục có gì trước khi bấm.
   SEA TRIP hiển thị số tour **tính từ dữ liệu thật của mình**.
3. **Hero có ảnh riêng cho mobile** — đúng và nên làm. SEA TRIP dùng `sizes` +
   `next/image` để sinh `srcset` thay vì hai file thủ công.
4. **Khối pháp lý ở footer** là bắt buộc với đơn vị lữ hành. SEA TRIP đã có chỗ
   và đánh dấu là thông tin bắt buộc phải bổ sung (`docs/CONTENT-TODO.md` A6).
5. **Khu cẩm nang tách khỏi khu bán tour** — SEA TRIP giữ tách biệt nhưng có
   cross-link hai chiều (cẩm nang → tour, tour → cẩm nang liên quan).

**Điểm cải thiện có căn cứ (đề xuất):**

| Vấn đề quan sát được | Cách SEA TRIP làm khác | Vì sao |
| --- | --- | --- |
| Giá chưa có hiển thị `0đ` | Hiển thị **"Liên hệ tư vấn"**, kiểu dữ liệu `priceFrom: Money \| null`, và có test tự động chặn giá ≤ 0 | `0đ` vừa sai vừa làm khách mất niềm tin |
| Thẻ tour có **logo hãng hàng không** và nhiều nhãn marketing | Bỏ logo hãng (MVP không bán vé); thay bằng **3 điểm nổi bật ngắn** | Logo hãng là nhiễu thị giác nếu không bán vé; điểm nổi bật trả lời "tour này có gì" |
| Điều hướng 9 mục, có mục trỏ ra ngoài site | **Đúng 5 mục** theo yêu cầu, 2 mục có dropdown | Menu dài làm loãng lựa chọn; mục ra ngoài site làm mất khách |
| Nút "Tìm tour" trong hero | **Không có ô tìm kiếm** ở MVP; thay bằng lưới danh mục và lối vào tuyến trọng tâm | Không làm ô tìm kiếm chỉ để trang trí — nó cần dữ liệu và hành vi thật |
| Đăng ký nhận tin ở footer | **Không có** | Khách chưa đồng ý nhận marketing; form tư vấn đã đủ mục đích |
| Tường logo đối tác + "Báo chí nói gì" | **Không có** | Không được bịa đối tác, chứng nhận hay trích dẫn báo chí |
| Nhiều section dạng lưới card giống nhau | Đa dạng nhịp: lưới card → danh sách xen kẽ ảnh/chữ → bố cục editorial 2 cột → rail lịch trình | Giữ trang dài mà không đơn điệu |
| Toàn bộ trang nước ngoài, vé máy bay, visa | Chỉ tour trong nước | Đúng phạm vi yêu cầu |

**Không sao chép**: SEA TRIP dùng nhận diện riêng (logo, màu, chữ), nội dung do
mình viết, và không dùng lại hình ảnh, layout nguyên bản hay thương hiệu của
website tham khảo.

### 2.2 Nguồn tham khảo cấu trúc code — CHƯA xác minh

Đã thử truy cập `https://github.com/vupn-sdt-ai/sdt-corp-web`:

| Kiểm tra | Kết quả |
| --- | --- |
| `GET https://api.github.com/repos/vupn-sdt-ai/sdt-corp-web` | **404** |
| `raw.githubusercontent.com/…/main/README.md` | **404** |
| `raw.githubusercontent.com/…/main/AGENTS.md` | **404** |

⇒ Repo **không truy cập được** (private, đã đổi tên, hoặc đã xoá). Vì vậy:

- **Không thể** đọc branch `main`, commit SHA, `package.json`, `.cursor/rules/*`,
  `SDT_Website_SRS.md` hay `docs/brand-tokens.md`.
- **Không đưa ra mô tả nào về cây thư mục của SDT** — mọi cấu trúc trong tài liệu
  này là **đề xuất độc lập**, không phải mô tả repo SDT.
- Cấu trúc dưới đây được thiết kế cho một website du lịch **chưa có admin**, và
  được đánh dấu rõ là đề xuất.

> Nếu chủ dự án cung cấp quyền truy cập repo SDT, nên đối chiếu lại ba thứ:
> quy ước đặt tên thư mục feature, cách tổ chức content, và quy tắc trong
> `.cursor/rules/*` — rồi mới quyết định đồng bộ hay giữ nguyên đề xuất này.

### 2.3 Repo SEA TRIP trong workspace — đã kiểm tra

- Trạng thái ban đầu: workspace chỉ có `plant-codebase.md`, file logo PNG và một
  ảnh JPG. **Không có repo git**, không có branch, không có working tree cần bảo
  toàn.
- Đã tạo mới project `sea-trip-travel/` bằng `create-next-app` với
  `--disable-git`. **Chưa** tạo branch, chưa commit, chưa push, chưa deploy.

### 2.4 Thông tin chưa xác minh khác

| Nội dung | Trạng thái |
| --- | --- |
| Mã màu logo | **Đã xác minh** bằng histogram điểm ảnh: `#FF0366` (áp đảo), `#FF7C2C`, `#FFBC0E` |
| Logo dạng vector | **Chưa có.** Đang tách từ PNG do khách cung cấp, chưa phải bản gốc thiết kế |
| Giá/hạn mức dịch vụ email | **Chưa xác minh** — thay đổi theo thời điểm |
| Điểm Lighthouse / Core Web Vitals | **Chưa đo** — không khẳng định đạt ngưỡng nào |
| Hotline, email, domain, pháp nhân | **Chưa có** — xem `docs/CONTENT-TODO.md` |
| Giá tour, chính sách huỷ, ảnh thật | **Chưa có** — mọi bản ghi đang `contentStatus: "demo"` |

---

## 3. Phạm vi MVP và ngoài phạm vi

### Trong phạm vi

- Trang chủ, 8 trang danh mục (2 cấp 1 + 6 cấp 2), trang chi tiết tour.
- Danh sách cẩm nang + chi tiết bài viết.
- Trang liên hệ, trang chính sách xử lý thông tin, 404, error boundary.
- Form yêu cầu tư vấn dùng chung cho trang liên hệ và trang chi tiết tour.
- Gửi email thông báo cho sales + bản plain-text.
- SEO: metadata từng trang, canonical, sitemap, robots, Open Graph, JSON-LD.
- Responsive 360px → desktop, accessibility, animation có tôn trọng
  `prefers-reduced-motion`.
- Test cho các rủi ro thật (validate, escape, toàn vẹn dữ liệu, format giá).

### Ngoài phạm vi (có chủ đích)

Đặt tour trực tuyến · thanh toán · tài khoản khách · admin/CMS · phân quyền ·
vé máy bay · khách sạn · visa · tìm kiếm · đa ngôn ngữ · đăng ký nhận tin
marketing · so sánh tour · wishlist.

Mỗi mục đều có lý do: chưa có quy trình nghiệp vụ, chưa có dữ liệu để nuôi tính
năng, hoặc chưa có hậu thuẫn pháp lý. Xem mục 5 của `docs/admin-roadmap.md`.

---

## 4. Sitemap và user flow

### 4.1 Sitemap

```
/                                         Trang chủ
/tour-quy-nhon-phu-yen                    Danh mục cấp 1  ← tuyến trọng tâm
  /tour-quy-nhon-1-ngay                   Danh mục cấp 2
  /tour-quy-nhon-dai-ngay                 Danh mục cấp 2
/tour-trong-nuoc                          Danh mục cấp 1
  /tour-mien-bac                          Danh mục cấp 2
  /tour-mien-trung                        Danh mục cấp 2
  /tour-mien-nam                          Danh mục cấp 2
  /tour-tay-nguyen                        Danh mục cấp 2
/tour/[slug]                              Chi tiết tour          (x15)
/cam-nang-du-lich                         Danh sách cẩm nang
  /cam-nang-du-lich/[slug]                Chi tiết bài viết      (x5)
/lien-he                                  Liên hệ
/chinh-sach-bao-mat                       Chính sách xử lý thông tin
/api/leads                                POST — nhận yêu cầu tư vấn
/sitemap.xml  /robots.txt  /icon.png  /opengraph-image.png
```

URL tiếng Việt không dấu, dễ đọc, ổn định — và **được coi là bất biến**: đổi slug
làm hỏng link và SEO (đã ghi trong `domain/*`).

### 4.2 User flow chính

**Flow 1 — Khám phá rồi gửi yêu cầu (đường chính)**

```
Landing (quảng cáo / organic / Facebook)
   → Trang chủ  hoặc  Trang danh mục (từ Google)
      → thấy thẻ tour (ảnh, thời lượng, giá hoặc "Liên hệ tư vấn")
         → Chi tiết tour (gallery, tổng quan, lịch trình, dịch vụ, lưu ý)
            → Form tư vấn ĐÃ tự điền tên tour + slug tour
               → 200 accepted → "Đã tiếp nhận yêu cầu" + mã STT
                  → Sales nhận email → gọi lại
```

**Flow 2 — So sánh trong danh mục**

```
Danh mục → dùng chip lọc nhu cầu / sắp xếp theo thời lượng
   → (không có kết quả) → trạng thái rỗng + "Xoá bộ lọc" + CTA tư vấn
   → chọn 1 tour → chi tiết
```

**Flow 3 — Đọc cẩm nang trước khi quyết định**

```
Google → Bài cẩm nang → cuối bài có "Tour liên quan" → chi tiết tour → form
```

**Flow 4 — Có nhu cầu nhưng không thấy tour phù hợp**

```
Bất kỳ trang nào → CTA "Nhận tư vấn" (header / section / thanh cố định mobile)
   → Trang liên hệ hoặc section form → form (để trống tour quan tâm) → sales tư vấn
```

**Flow lỗi**

```
Gửi lỗi validate → lỗi từng trường + focus trường đầu + GIỮ NGUYÊN dữ liệu
Gửi lỗi hệ thống → 502/503 + giữ dữ liệu + đưa hotline ra trước
Sai URL          → 404 có 3 gợi ý đúng nhu cầu, không phải lời xin lỗi
```

---

## 5. Art direction, design token và wireframe

### 5.1 Ba hướng đã cân nhắc

| Hướng | Mô tả | Kết luận |
| --- | --- | --- |
| **A. Coastal editorial** | Nền trắng ấm, ảnh lớn, chữ đậm, nhịp section xen kẽ, hồng chỉ xuất hiện ở điểm nhấn | ✅ **Chọn** |
| B. Tropical gradient | Nền gradient hồng–cam đậm, khối kính mờ, glow | ❌ Phủ hồng nhiều, nhanh lỗi thời, khó đạt tương phản |
| C. Tối giản Thụy Sĩ | Lưới nghiêm, chữ nhỏ, ít ảnh | ❌ Không phù hợp: bán tour cần ảnh là trọng tâm |

### 5.2 Hướng được chọn

**Mood**: nắng sớm trên biển miền Trung. Ấm, sáng, thoáng, tự tin — không ngọt
gắt, không "sale off".

**Ngôn ngữ hình ảnh**

- Ảnh là trọng tâm; chữ đứng trên nền sáng, không đè lên ảnh trừ khi có scrim.
- Hồng thương hiệu **chỉ** ở: thanh 1px header, chỉ dấu eyebrow, dòng chữ gradient
  ở H1, đường ray lịch trình, hairline khi hover card, nút chính.
- Gradient là **điểm dấu**, không phải nền.
- Một thiết bị trang trí duy nhất lặp lại: **gradient hairline** — nó mã hoá nhận
  diện và đồng thời là phản hồi tương tác, nên không phải trang trí suông.

**Wireframe từng trang** — mô tả khối, không mô tả pixel.

**Trang chủ** (nhịp: khám phá → quan tâm → xem tour → gửi yêu cầu)

```
┌ Header: logo + 5 mục menu (2 có dropdown) + hotline + CTA ────┐
├ Hero: 2 cột                                                    │
│   trái: nhãn · H1 (2 dòng, dòng 2 gradient) · mô tả · 2 CTA · 3 điểm tin
│   phải: collage — ảnh lớn 4:5 + tile vuông lệch dưới-trái + thẻ badge tuyến
├ Khám phá nhanh: 2 card danh mục lớn (tile ảnh + scrim chữ trắng)
│   + cụm "Điểm đến nổi bật" 4 card
├ Tour Quy Nhơn – Phú Yên nổi bật: lưới 3 cột (6 tour), nền muted
├ Tour trong nước theo vùng: DANH SÁCH xen kẽ ảnh nhỏ / chữ (nhịp khác lưới)
├ Vì sao chọn SEA TRIP: editorial 2 cột — ảnh dọc 4:5 trái, 4 nguyên tắc đánh số phải
├ Cẩm nang: 1 bài feature lớn trái + 3 bài nhỏ phải
├ Form tư vấn: 5/7 — trái là 3 cam kết + hotline, phải là form card
└ Footer: logo + mô tả + 3 cột điều hướng + khối liên hệ + dòng bản quyền
```

Xử lý khi thiếu nội dung: số tour lấy từ dữ liệu thật (không hardcode); section
nào không có dữ liệu thì `return null` và **không** render khung rỗng.

**Trang danh mục**

```
Breadcrumb
Header danh mục (nền muted + bloom hồng): eyebrow vùng · H1 · mô tả
   · chip danh mục con kèm số tour (anchor trong trang)
Bộ lọc thật: chip nhu cầu (từ tag của tour trong danh mục) + select sắp xếp
   + đếm kết quả (aria-live) + nút "Xoá lọc" khi đang lọc
Lưới tour 3 cột (hoặc trạng thái rỗng có nút xoá lọc + CTA)
Nếu là danh mục cha: section "Chọn theo thời lượng" — 2 card danh mục con
Section "Xem thêm": các danh mục cùng cấp
Section form tư vấn
```

**Trang chi tiết tour**

```
Breadcrumb
2 cột 7/5:
  trái : nhãn demo · nhãn danh mục · H1 · mô tả · chip điểm đến
         · Gallery (panel 16:10 + dải thumbnail role=tablist, điều hướng bằng ←/→/Home/End)
  phải (sticky top-28 trên desktop):
         · bảng thông tin nhanh (thời lượng, khởi hành, số điểm đến)
         · khối giá: giá hoặc "Liên hệ tư vấn" + điều kiện + ghi chú "chưa hỗ trợ đặt online"
         · card CTA neo tới #tu-van
Thanh anchor trong trang: Tổng quan · Điểm nổi bật · Lịch trình · Dịch vụ · Lưu ý · Tư vấn
Tổng quan (đoạn văn) → Điểm nổi bật (lưới 2 cột) →
Lịch trình (timeline có đường rail gradient, mốc số, chip địa điểm + bữa ăn) →
Dịch vụ bao gồm / không bao gồm (2 cột) →
Lưu ý + Chính sách (ẩn nếu rỗng) + Thông tin nhanh →
Tour liên quan (3 card) → Form tư vấn (đã điền tour)
Mobile: thanh CTA cố định đáy — chỉ hiện khi đã cuộn qua intro, TỰ ẨN khi form vào khung
```

**Cẩm nang** — danh sách: 1 bài feature ngang + lưới 3 cột; chi tiết: breadcrumb,
header, ảnh cover, thân bài render từ block có cấu trúc, tour liên quan, bài liên
quan, form.

**Liên hệ** — 3 card kênh liên hệ + khối "Sau khi bạn gửi yêu cầu" (3 bước) +
form ở cột 7.

**Chính sách** — văn bản có mục lục đánh số, ghi rõ bản dự thảo ở đầu trang.

**404** — không phải lời xin lỗi: 3 gợi ý đúng nhu cầu + link về trang chủ.

Chi tiết token, component, responsive, motion: **`docs/design-tokens.md`**.

---

## 6. Kiến trúc, cây thư mục và quy tắc phụ thuộc

**Đánh giá hai phương án**

| Phương án | Kết luận |
| --- | --- |
| Next.js + xử lý email trong chính ứng dụng | ✅ **Chọn.** Một lần deploy, một repo, không có network hop giữa FE và BE, không có CORS, không có phiên bản API để đồng bộ |
| FE riêng + backend riêng (NestJS…) | ❌ Chỉ có một endpoint. Dựng service thứ hai là thêm hạ tầng, monitoring, deploy, và hai nơi để sửa một schema |

Cây thư mục, trách nhiệm từng phần, chiều phụ thuộc và bất biến: xem
**`docs/architecture.md`**. Ba bất biến quan trọng nhất:

1. Chỉ `lib/data` đọc `content/` → đổi nguồn dữ liệu không sửa UI.
2. `components/ui` không biết domain → primitive dùng lại được ở mọi màn hình.
3. UI không import `server/` → `server-only` làm build đỏ nếu vi phạm.

---

## 7. Data model và API contract

Định nghĩa thật nằm ở `src/domain/*.ts` (Zod là nguồn sự thật, TypeScript suy ra).
Đây là bản tóm tắt; **đây là schema đề xuất, không phải mô tả database** vì MVP
chưa có database.

### 7.1 Quan hệ

```
TourCategory ──parent──► TourCategory        (tự tham chiếu, 1 cấp)
    ▲
    │ categoryIds[]  (n-n)
 Tour ──destinationIds[]──► Destination (n-n)
    │
    └── itinerary: ItineraryDay[]           (1-n, nằm trong Tour)

TravelArticle ──destinationIds[]──► Destination   (n-n)
              ──relatedTourSlugs[]──► Tour        (n-n theo slug)

ContactLead   (độc lập, chỉ tồn tại trong email ở MVP)
```

### 7.2 Quy ước biểu diễn

| Khái niệm | Cách biểu diễn | Lý do |
| --- | --- | --- |
| **Tiền** | `{ amount: number (int), currency: "VND" }` | Số nguyên đồng. Không dùng float, không lưu chuỗi đã format |
| **Giá chưa xác định** | `priceFrom: Money \| null` | `null` ⇒ "Liên hệ tư vấn". **Không** dùng `0`. Có test chặn giá ≤ 0 |
| **Thời lượng** | `{ days: int > 0, nights: int ≥ 0 }` | Format ra "1 ngày" / "3 ngày 2 đêm"; cũng dùng để sắp xếp |
| **Ngày (hiển thị)** | `YYYY-MM-DD` (`z.iso.date()`) | Không kèm giờ, không lệch múi giờ |
| **Thời điểm (audit)** | ISO datetime **có offset** (`{ offset: true }`) | Ghi rõ `+07:00`; đã từng bị lỗi vì Zod mặc định chỉ nhận `Z` |
| **Ảnh** | `{ src?: "/…", alt: string, caption?: string }` | `src` bỏ trống ⇒ vẽ placeholder thương hiệu. Đây là ranh giới "có ảnh thật hay chưa" |
| **Trạng thái nội dung** | `contentStatus: "demo" \| "verified"` | Metadata theo dõi nội bộ (không hiển thị lên giao diện) |

### 7.3 Ranh giới ba loại dữ liệu

| Loại | Ở đâu | Có được ra client? |
| --- | --- | --- |
| **Dữ liệu hiển thị** (Tour, Article, Category, Destination) | `content/` → `lib/data` | Có, qua projection `TourCardModel` (đã lược bỏ trường thừa) |
| **Dữ liệu form** (LeadInput) | `domain/lead.ts` | Có — schema dùng chung cho cả client và server |
| **Dữ liệu server quản lý** (người nhận email, `From`, `requestId`, salt, hash IP) | `server/`, `.env` | **Không.** Có `server-only`; body request không có trường người nhận |

### 7.4 Hợp đồng `POST /api/leads`

Request (JSON, ≤ 16 KB):

```jsonc
{
  "fullName": "Nguyễn Văn A",        // bắt buộc, 2–80
  "phone": "0987 654 321",            // bắt buộc
  "email": "a@example.com",           // tuỳ chọn
  "interest": "Quy Nhơn – Phú Yên",   // tuỳ chọn
  "tourSlug": "quy-nhon-phu-yen-3-ngay-2-dem", // tuỳ chọn, phải tồn tại
  "travelDate": "2026-12-01",         // tuỳ chọn, YYYY-MM-DD
  "partySize": 2,                     // tuỳ chọn, 1–60
  "message": "…",                     // tuỳ chọn, ≤ 2000
  "consent": true,                    // bắt buộc
  "sourcePage": "/tour/…",            // tuỳ chọn, đường dẫn nội bộ
  "utm": { "source": "facebook" },    // tuỳ chọn, 5 khoá chuẩn
  "submissionId": "uuid",             // tuỳ chọn, khoá idempotency
  "company": ""                       // honeypot, phải rỗng
}
```

| HTTP | `code` | Ý nghĩa |
| --- | --- | --- |
| 200 | — | `{ ok: true, requestId: "STT-YYYYMMDD-XXXX", status: "accepted", receivedAt }` |
| 400 | `VALIDATION_ERROR` | Kèm `fieldErrors: { trường: [thông báo] }` |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 16 KB |
| 429 | `RATE_LIMITED` | Kèm `retryAfterSeconds` |
| 502 | `MAIL_DELIVERY_FAILED` | Transport từ chối |
| 503 | `MAIL_NOT_CONFIGURED` | Chưa cấu hình (kể cả `MAIL_TRANSPORT=log` ở production) |
| 500 | `INTERNAL_ERROR` | Kèm `requestId` để tra log |

Chi tiết, bao gồm chống spam và xử lý lỗi: **`docs/lead-flow.md`**.

---

## 8. Luồng form/email, wireframe email và xử lý lỗi

Xem **`docs/lead-flow.md`**: sơ đồ luồng, bảng ràng buộc, hợp đồng API đầy đủ, 5
lớp chống spam, giới hạn đã biết, so sánh SMTP với dịch vụ API, wireframe email,
mẫu subject/HTML/plain-text, và lộ trình nâng cấp.

Điểm quan trọng nhất về ngữ nghĩa: hệ thống bảo đảm **"email đã được transport
chấp nhận"**, không bảo đảm **"email đã vào hộp thư"**. Vì vậy giao diện luôn nói
"Đã tiếp nhận yêu cầu" kèm mã `STT…`, và không bao giờ nói "đã gửi email".

---

## 9. SEO, hiệu năng, accessibility và deploy

### 9.1 SEO

- `metadataBase` + metadata riêng từng trang qua `buildMetadata()` (title,
  description, canonical, OG, Twitter, keywords).
- Template title: `%s | SEA TRIP TRAVEL`.
- `sitemap.ts` sinh từ dữ liệu thật (4 trang tĩnh + 8 danh mục + 15 tour + 5 bài);
  `lastModified` lấy từ `updatedAt` của nội dung, **không** dùng `new Date()`.
- `robots.ts` chặn `/api/`.
- JSON-LD: `TravelAgency`, `WebSite`, `BreadcrumbList`, `CollectionPage`,
  `TouristTrip`, `Article`.
  **`offers` chỉ xuất hiện khi có giá thật.** Không có `aggregateRating`, không
  có `review`, không có giải thưởng hay chứng nhận bịa.
- Mỗi trang một `h1`; breadcrumb hiển thị và breadcrumb JSON-LD khớp nhau.
- Liên kết nội bộ hai chiều: cẩm nang ↔ tour, danh mục cha ↔ con, tour ↔ tour
  liên quan.

### 9.2 Hiệu năng

Đã áp dụng: hero `priority` + `sizes`, ảnh còn lại lazy mặc định của
`next/image`, font self-host với `display: swap`, **không** thư viện animation,
**không** thư viện icon, reveal bằng CSS scroll-driven nên không tốn JS, và trang
nội dung là static shell nên phục vụ trực tiếp từ CDN.

**Chưa đo bằng công cụ** — vì vậy tài liệu này không khẳng định đạt ngưỡng nào.
Cách đo và mục tiêu đề ra: `docs/acceptance-checklist.md` mục 10.

### 9.3 Accessibility

- Mọi input đều có `<label>`; lỗi gắn qua `aria-describedby` + `aria-invalid` và
  là `role="alert"`.
- Dropdown: `aria-expanded`, `aria-haspopup`, mở bằng Enter/Space/`ArrowDown`,
  đóng bằng Escape và trả focus về trigger.
- Mobile drawer dùng `<dialog>` + `showModal()` → có focus trap và inert nền sẵn.
- Gallery theo ARIA tabs, điều hướng bằng `←` `→` `Home` `End`.
- Skip link là phần tử focus đầu tiên.
- Vòng focus luôn hiển thị (`:focus-visible`).
- Tương phản: màu chữ/hành động đã được chọn để đạt WCAG AA (bảng đo ở
  `docs/design-tokens.md` mục 2).
- `prefers-reduced-motion: reduce` vô hiệu mọi animation.

### 9.4 Deploy

**Phương án chính — Vercel (hoặc nền tảng serverless tương đương):**

- Trang nội dung: static shell trên CDN.
- `POST /api/leads`: serverless function (Node runtime, cần cho SMTP).
- Vì sao **không** dùng static hosting thuần (S3/Netlify static): không có chỗ
  chạy endpoint gửi email, và **không được** nhúng API key vào frontend. Static
  thuần buộc phải thêm dịch vụ form bên thứ ba — thêm một bên xử lý dữ liệu khách
  và thêm một điểm hỏng.

**Phương án thay thế — VPS + Docker:**

- Chạy `next start` sau reverse proxy (Caddy/Nginx) có HTTPS tự động.
- Dùng khi cần kiểm soát dữ liệu hoặc đã có sẵn hạ tầng.
- Khi đó rate limit trong bộ nhớ hoạt động ổn định hơn (một instance), nhưng cần
  tự lo chứng chỉ, backup, monitoring.

**Biến môi trường**: xem `.env.example` và bảng ở `docs/lead-flow.md` mục 6.
Không có secret nào trong source; `server-only` bảo vệ ranh giới.

**Domain và email**

- Domain chính + `www` redirect 301 về một origin duy nhất (khớp
  `NEXT_PUBLIC_SITE_URL`).
- HTTPS bắt buộc.
- Email: dùng subdomain riêng (ví dụ `mail.`) để cấu hình SPF/DKIM/DMARC mà không
  ảnh hưởng email công việc. `From` phải thuộc domain đã xác minh.
- `Reply-To` luôn là email khách (khi hợp lệ) để sales trả lời trực tiếp.

**Preview/staging**

- `SALES_RECIPIENTS` ở preview/staging trỏ tới **hộp thư nội bộ test**, không bao
  giờ tới hộp thư sales thật.
- `NEXT_PUBLIC_SITE_URL` là domain preview để link trong email không trỏ nhầm về
  production.

**Theo dõi lỗi gửi mail**

- Log có `requestId`, transport, số người nhận, lý do lỗi — **không** có dữ liệu
  cá nhân.
- Cần theo dõi tỉ lệ `MAIL_DELIVERY_FAILED` và `MAIL_NOT_CONFIGURED` (hai mã này
  là dấu hiệu vận hành, không phải lỗi người dùng).
- Nếu triển khai serverless: thêm cảnh báo khi tỉ lệ lỗi gửi mail tăng.

**Chi phí định kỳ cần dự trù**: hosting, domain, dịch vụ email (nếu vượt bậc miễn
phí), và (tuỳ chọn) dịch vụ lưu cache/rate limit dùng chung. **Không nêu giá cụ
thể** vì chưa kiểm tra bảng giá hiện hành của các nhà cung cấp.

---

## 10. Roadmap, backlog và acceptance checklist

### 10.1 Các giai đoạn (1–9 đã xong về phần source)

| # | Giai đoạn | Đầu ra | Tiêu chí nghiệm thu | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | Khảo sát, nội dung, xác nhận nhận diện | Tài liệu này + token màu trích từ logo | Màu lấy từ pixel logo; ghi rõ phần chưa xác minh | ✅ |
| 2 | Design system | `globals.css`, `components/ui/*` | Token đủ dùng; tương phản đạt AA | ✅ |
| 3 | Cấu trúc source + data contract | `domain/`, `content/`, `lib/data/` | Build đỏ khi dữ liệu sai khoá ngoại | ✅ |
| 4 | Trang chủ | `app/page.tsx` + 6 section | Đủ 9 khối; mọi CTA có đích thật | ✅ |
| 5 | Danh mục + chi tiết tour | 8 trang danh mục + `tour/[slug]` | Tour vào đúng danh mục; link chi tiết đúng | ✅ |
| 6 | Cẩm nang + liên hệ + chính sách + 404 | 5 trang | Không có trạng thái rỗng xấu | ✅ |
| 7 | Form + email + tích hợp | `api/leads`, mailer, template | Test pass; không báo thành công giả; không chèn được HTML | ✅ |
| 8 | SEO, responsive, accessibility, test | sitemap/robots/JSON-LD + 64 test | typecheck/lint/test/build đều xanh | ✅ |
| 9 | Chuẩn bị deploy và bàn giao | README + 7 tài liệu | Người mới đọc README là chạy được | ✅ |
| 10 | Lộ trình admin/CMS | `docs/admin-roadmap.md` | Chỉ thiết kế điểm mở rộng, không code admin | ✅ (tài liệu) |

### 10.2 Backlog sau MVP (ưu tiên giảm dần)

| Ưu tiên | Việc | Phụ thuộc |
| --- | --- | --- |
| P0 | Điền toàn bộ mục 🔴 trong `docs/CONTENT-TODO.md` | Chủ website |
| P0 | Cấu hình SPF/DKIM/DMARC, gửi thử tới Gmail + Outlook | Chủ website |
| P1 | Ảnh thật cho tour và điểm đến | Chủ website |
| P1 | Logo SVG | Nhà thiết kế |
| P2 | Đo Lighthouse/CWV và tối ưu theo số đo | Sau khi có ảnh thật |
| P2 | Email xác nhận cho khách | Sau khi luồng chính ổn định |
| P3 | Lưu lead vào DB + retry | Khi lượng lead đủ để cần quản lý |
| P3 | Admin/CMS | Khi nội dung cập nhật thường xuyên |
| P4 | Rate limit dùng chung qua Redis/KV | Khi phát hiện spam phân tán |
| P4 | Turnstile | Khi spam vượt ngưỡng |

### 10.3 Ước lượng cho phần còn lại

Giả định: 1 developer, đã quen codebase.

| Việc | Ước lượng | Giả định |
| --- | --- | --- |
| Điền nội dung thật (A1–A10) | 2–4 ngày | Nội dung do chủ website cung cấp, không phải viết mới |
| Ảnh thật + thay vào dữ liệu | 1–2 ngày | Ảnh đã được chọn và xử lý |
| Cấu hình email + kiểm thử đa hộp thư | 0.5–1 ngày | Có quyền quản trị DNS |
| Deploy + kiểm thử staging | 0.5 ngày | |
| Đo và tối ưu hiệu năng | 1–2 ngày | Sau khi có ảnh thật |
| **Tổng tới lúc xuất bản** | **≈ 5–9 ngày** | |

### 10.4 Acceptance checklist

Xem **`docs/acceptance-checklist.md`** — 9 nhóm tiêu chí, mỗi mục có cách kiểm
chứng cụ thể và trạng thái. Kết quả đã kiểm:

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run typecheck` | ✅ không lỗi |
| `npm run lint` | ✅ 0 lỗi, 0 cảnh báo |
| `npm test` | ✅ 64/64 pass |
| `npm run build` | ✅ 42 trang, tất cả trang nội dung là static |
| 12 URL kiểm qua HTTP | ✅ 200; URL sai trả 404 |
| API: hợp lệ / lỗi validate / honeypot / idempotency | ✅ 200 / 400 kèm fieldErrors / drop im lặng / không gửi trùng |

**Chưa kiểm** (cần môi trường thật hoặc thao tác tay): kiểm thử bàn phím trên
trình duyệt thật, không tràn ngang ở 360px, email tới hộp thư Gmail/Outlook thật,
đo Lighthouse/CWV, và toàn bộ mục 🔴 của `docs/CONTENT-TODO.md`.

---

## 11. Danh sách thông tin cần chủ website cung cấp

Xem **`docs/CONTENT-TODO.md`**. Tóm tắt nhóm chặn xuất bản (🔴):

1. Hotline chính thức.
2. Email nhận yêu cầu tư vấn + danh sách người nhận email sales.
3. Domain thật + email gửi đi thuộc domain đã xác minh (kèm SPF/DKIM/DMARC).
4. Tên pháp nhân, mã số thuế, địa chỉ đăng ký, và (nếu có) số giấy phép lữ hành.
5. Chính sách xử lý thông tin đã được duyệt.
6. Duyệt nội dung tour: lịch trình, dịch vụ bao gồm/không bao gồm, lưu ý.
7. Giá tour — hoặc xác nhận giữ nguyên "Liên hệ tư vấn".
8. Điều kiện và chính sách huỷ/thanh toán (nếu muốn công bố).

Nhóm 🟠 (nên có trước khi chạy quảng cáo): ảnh thật, giờ làm việc, logo SVG, kênh
social chính thức, ảnh Open Graph theo tour, điểm khởi hành thật.

---

## 12. Những điều KHÔNG được làm trong dự án này

Ghi lại để lần sau không vô tình vi phạm:

- Không hiển thị `0 ₫` thay cho giá chưa cập nhật.
- Không bịa đánh giá khách hàng, số lượng khách, chứng nhận, đối tác, giải thưởng.
- Không dùng nhãn "Đặt ngay" khi hệ thống chỉ nhận yêu cầu tư vấn.
- Không tạo bộ lọc, tìm kiếm hay CTA chỉ để trang trí — mọi thứ phải có dữ liệu và
  hành vi thật.
- Không báo "đã gửi email thành công" khi mới xử lý ở giao diện.
- Không để lộ secret ra client.
- Không chèn được HTML từ nội dung khách nhập.
- Không thêm đăng ký nhận tin marketing khi chưa có sự đồng ý riêng.
- Không dựng admin, auth, database, queue "để phòng tương lai".
- Không đưa ra mô tả về cấu trúc repo SDT khi chưa truy cập được.
