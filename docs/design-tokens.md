# Design tokens

Nguồn duy nhất: `src/app/globals.css` (khối `@theme`). Tài liệu này giải thích
**giá trị và lý do**, để designer và developer không phải đoán.

## 1. Màu lấy từ logo

Logo được cung cấp dưới dạng PNG nền trong. Màu được trích trực tiếp bằng cách
đếm histogram điểm ảnh:

| Vai trò | Hex | Ghi chú |
| --- | --- | --- |
| Hồng thương hiệu (màu áp đảo) | `#FF0366` | 32.093/… điểm ảnh — màu chủ đạo của logo |
| Cam (điểm dừng gradient) | `#FF7C2C` | |
| Vàng gold (điểm dừng gradient) | `#FFBC0E` | đầu cánh lông |

Gradient `#FF0366 → #FF7C2C → #FFBC0E` là chữ ký thị giác, dùng ở: thanh 1px trên
header, chỉ dấu eyebrow, đường ray lịch trình, hairline khi hover card, và chữ
gradient ở H1 trang chủ. **Không** dùng làm nền toàn trang.

## 2. Vì sao không dùng `#FF0366` cho chữ và nút

Đo tương phản trên nền trắng:

| Màu | Tương phản với `#FFFFFF` | Đạt WCAG AA (4.5:1) |
| --- | --- | --- |
| `#FF0366` (hồng logo) | **3.84:1** | ❌ — chỉ đạt AA cho chữ lớn (≥ 3:1) |
| `#E0005A` (`brand-600`) | **4.87:1** | ✅ |
| `#C4004E` (`brand-700`) | 6.4:1 | ✅ |

Nên:

- `--color-primary` = `#FF0366` → **trang trí, icon, chữ tiêu đề lớn, logotype**.
- `--color-primary-strong` = `#E0005A` → **nền nút, link, chữ cần đọc**.
- `--color-primary-strong-hover` = `#C4004E`.

Đây là lệch màu rất nhỏ so với logo nhưng là điều kiện để đạt WCAG AA.

## 3. Bảng màu semantic

| Token | Giá trị | Dùng ở đâu |
| --- | --- | --- |
| `--color-background` | `#FFFAFC` | Nền trang — trắng ấm, chỉ phảng hồng |
| `--color-surface` | `#FFFFFF` | Card, panel, form |
| `--color-surface-muted` | `#FFF4F8` | Section xen kẽ |
| `--color-surface-sunken` | `#FDF0F5` | Footer, vùng lõm |
| `--color-foreground` | `#211621` | Chữ chính (tương phản ~16:1) |
| `--color-foreground-muted` | `#6E5C68` | Chữ phụ (6.19:1 ✅) |
| `--color-foreground-subtle` | `#8B7684` | Nhãn nhỏ, ghi chú |
| `--color-border` | `#F2DDE7` | Viền mặc định |
| `--color-border-strong` | `#E6C6D6` | Viền input, nút secondary |
| `--color-primary` | `#FF0366` | Nhấn thương hiệu |
| `--color-primary-strong` | `#E0005A` | Hành động (đạt AA) |
| `--color-primary-soft` | `#FFF1F6` | Nền chip/nút ghost |
| `--color-accent` | `#FFBC0E` | Gold, dấu bullet, cảnh báo nhẹ |
| `--color-success` | `#067647` | Trạng thái thành công (5.69:1 ✅) |
| `--color-danger` | `#D92D20` | Lỗi (4.81:1 ✅) |
| `--color-warning` | `#B54708` | Lưu ý |

Dải `brand-50…900` có sẵn cho trường hợp cần sắc độ trung gian.

## 4. Chữ

**Be Vietnam Pro** cho toàn bộ giao diện.

- Được thiết kế cho tiếng Việt: đủ dấu ở mọi weight, không bị "rơi dấu".
- Self-host qua `next/font` → không request tới Google, không layout shift.
- Weight dùng: 400 / 500 / 600 / 700 / 800.

Hệ cỡ chữ (`--text-*`):

| Token | Cỡ | Dùng |
| --- | --- | --- |
| `display-xl` | 3.5rem, lh 1.04, ls −0.03em | H1 trang chủ (≥ sm) |
| `display-lg` | 2.75rem | H1 phụ |
| `display` | 2.125rem | H1 trang con |
| `display-sm` | 1.625rem | H2 section |
| mặc định Tailwind | — | Chữ nội dung |

Body copy dùng `text-[1.0625rem]` (17px) với `leading-relaxed` — dễ đọc trên
mobile hơn 16px.

## 5. Grid, khoảng cách, bo góc, đổ bóng

- **Container nội dung**: `.container-page` — tối đa `78rem` (1248px), padding
  ngang `1.25 / 1.75 / 2.5rem` theo breakpoint. Một nguồn duy nhất cho nhịp ngang.
- **Container chrome** (header): rộng hơn — `max-w-[88rem]`, padding
  `1.25 / 1.75 / 2.5rem`. Menu cần chỗ thở nên phần chrome rộng hơn phần nội dung.
- **Nhịp dọc section**: `tight` `py-9/12`, `default` `py-12/20`, `loose`
  `py-14/28`. Chọn theo mật độ nội dung, không tuỳ hứng. Giá trị mobile luôn nhỏ
  hơn để trang không bị rời rạc trên điện thoại.
- **Nền section xen kẽ**: `surface-section-muted` / `surface-section-sunken` —
  gradient dọc rất nhẹ thay vì tô phẳng, tạo tầng mà không thành dải màu.
- **Dải cuộn ngang**: `no-scrollbar` cho rail thumbnail và thanh anchor trong
  trang. Vẫn cuộn được bằng bàn phím/lăn chuột, chỉ ẩn thanh cuộn.
- **Bo góc**: `xs 6px` · `sm 8px` · `md 12px` · `lg 16px` · `xl 20px` ·
  `2xl 28px` · `3xl 36px`. Card dùng `2xl`, panel lớn dùng `3xl`.
- **Đổ bóng**: luôn phảng hồng (`rgb(122 0 49 / …)`), không dùng bóng đen.
  - `soft` — card nghỉ
  - `card` — card nổi nhẹ
  - `lifted` — card hover, panel sticky
  - `focus` — vòng focus (`0 0 0 3px` hồng 32%)
- **Vùng chạm trên mobile**: tối thiểu `min-h-10` (40px) cho chip/anchor, `h-11`
  (44px) cho nút tròn. Chip lọc co về `min-h-9` từ `sm` trở lên để gọn hơn.

## 6. Component

| Component | Đặc điểm |
| --- | --- |
| **Button** | `primary` (nền `#E0005A`, chữ trắng), `secondary` (viền, hover hoá hồng), `ghost`, `inverse`. Bo tròn hoàn toàn. Cao 36/44/52px. Nhấc 1px khi active. |
| **Input / Textarea** | **Mọi control cao đúng `h-11` (44px) với `line-height` cố định** — đây là điều kiện để ô trống, ô đã nhập, `select` và ô ngày tháng trùng khít nhau. Viền `border-strong`, hover hoá `brand-200`, focus hoá `primary-strong` + vòng focus. Trạng thái lỗi: viền `danger` + nền `danger-soft` 40%. Textarea giữ cùng padding/line-height, chỉ khác chiều cao (`min-h-28`). |
| **Select** | Giữ `<select>` gốc (trên điện thoại trình chọn của hệ điều hành tốt hơn nhiều so với tự dựng), nhưng thay vỏ: `appearance-none` + cùng hộp 44px + cùng viền/hover/focus + **chevron riêng** đặt tuyệt đối. Không dựng listbox tuỳ biến. |
| **Chọn ngày** | Component riêng (`components/ui/date-picker.tsx`), **không** dùng `<input type="date">`. Popup lịch của trình duyệt nằm trong shadow DOM nên không thể tô màu: Chrome luôn vẽ ngày được chọn bằng màu xanh của nó bất kể `accent-color`. Popup tự dựng dùng token thương hiệu: ngày chọn = viền tròn hồng đậm, hôm nay = viền `brand-300`, ngày ngoài tháng mờ 55%, hover = `primary-soft`. Nhãn tháng/ngày bằng tiếng Việt (tuần bắt đầu Thứ Hai). Có nút nhanh **Xoá / Hôm nay / Ngày mai**. Bàn phím: `←→↑↓` theo ngày/tuần, `PageUp/PageDown` theo tháng, `Home/End` đầu/cuối tuần, `Enter`/`Space` chọn, `Esc` đóng, `Tab` lặp trong popup. Giá trị vẫn là chuỗi ISO `YYYY-MM-DD` hoặc `""` — không đổi hợp đồng dữ liệu. |
| **Input số** | Ẩn spinner (`appearance: textfield`): spinner chỉ hiện khi hover/focus nên làm ô đổi trọng lượng giữa chừng. `inputMode="numeric"` + `min`/`max` vẫn giữ. |
| **Checkbox** | `accent-color` theo màu thương hiệu. Ô đồng ý là một khối có viền, tự đổi màu khi tick (`has-checked`). |
| **Field (nhãn + lỗi)** | Khe thông báo **luôn được render** với `min-h-4` và **luôn cùng một `id`** (`{id}-message`). Nhờ vậy: hiện lỗi không đẩy các field bên dưới, các field trong cùng hàng luôn thẳng, và control có thể trỏ `aria-describedby` vô điều kiện. **Nhãn và hint phải ngắn để không xuống dòng** — ở `sm` mỗi cột chỉ rộng ~290px; nếu nhãn hoặc hint wrap, ô đó cao hơn ô bên cạnh và hàng không còn đọc như một hàng. Marker tuỳ chọn dùng chữ "(tuỳ chọn)" và **không** lặp lại ở hint (giải thích gộp một chỗ). |
| **Badge** | `brand`, `sun`, `neutral`, `outline`, `success`, `demo` (viền nét đứt, dùng cho nội dung demo). |
| **Dropdown** | Panel `rounded-xl`, viền, `shadow-lifted`, mở bằng hover/focus/Enter/ArrowDown, đóng bằng Escape, item đầu luôn là "Tất cả <danh mục>". |
| **Card tour** | Ảnh `4:3`, badge thời lượng ở góc, tên, mô tả, tối đa 3 điểm nổi bật, giá, CTA. Hairline gradient chạy vào khi hover, ảnh scale 1.04. |
| **Card bài viết** | Biến thể `feature` (ảnh trái/chữ phải trên desktop) và mặc định. |
| **Card điểm đến / danh mục** | Tile ảnh tràn, scrim gradient, chữ trắng — dùng cho lưới khám phá. |

## 7. Icon và ảnh

**Icon**: bộ inline tự viết trong `components/ui/icons.tsx`. Lưới 24×24, stroke
1.8, cap tròn. Khoảng 25 icon — không kéo cả thư viện icon về chỉ để dùng vài cái.

**Chọn ảnh** (hướng dẫn cho người cập nhật nội dung):

1. Ưu tiên ảnh **ngang**, tối thiểu 1600px cạnh dài, để cắt `4:3` và `16:9` đều đẹp.
2. Chủ thể nằm ở 1/3 trên — vì card phủ badge ở góc và scrim ở đáy.
3. Ánh sáng tự nhiên, tông ấm; tránh ảnh bão hoà quá cao vì sẽ tranh chấp với hồng thương hiệu.
4. Người trong ảnh phải có sự đồng ý; không dùng ảnh có watermark hoặc logo bên thứ ba.
5. Không dùng ảnh AI cho địa danh cụ thể — khách sẽ tới nơi và thấy khác.

**Cắt ảnh**: mọi ảnh đi qua `<AssetImage>` với `sizes` phù hợp để `next/image`
sinh `srcset`. Khi chưa có ảnh, component vẽ placeholder gradient thương hiệu —
một "phong cảnh" cách điệu (gradient + mặt trời + đường chân trời + silhouette
sóng), **không** dùng ảnh stock không có bản quyền và không mô phỏng địa danh.

## 8. Responsive

Breakpoint: `sm 640` · `md 768` · `lg 1024` · `xl 1280`.

| Vùng | Mobile 360–390px | Tablet | Desktop |
| --- | --- | --- | --- |
| Header | logo + nút menu; drawer toàn màn hình | như mobile đến 1024px | nav ngang + dropdown + hotline |
| Hero | 1 cột, ảnh 4:5 | 1 cột | 6/6, collage lệch |
| Lưới tour | 1 cột | 2 cột | 3 cột |
| Chi tiết tour | gallery → nội dung → thanh CTA cố định đáy | như mobile | 7/5, panel tư vấn sticky |
| Form | 1 cột | 1 cột | 2 cột cho các trường ngắn |

Đã kiểm tra không tràn ngang ở 360px: `body { overflow-x: clip }` là lưới an
toàn cuối, nhưng nguyên nhân thật đã được xử lý ở từng component.

## 9. Chuyển động

| Loại | Cách làm | Thời lượng |
| --- | --- | --- |
| Hover card / nút | `transform` + `box-shadow` | 200–300ms |
| Nút primary | vệt sáng `-skew-x-12` quét qua (`-z-10`, nằm trên nền và dưới chữ) | 900ms |
| Ảnh trong card | `scale(1.04)` | 700ms `ease-out` |
| Hairline gradient | `scaleX(0 → 1)` | 300ms |
| Nav: gạch chân gradient | `scaleX(0 → 1)` từ trái, theo hover và `aria-current` | 300ms |
| Dropdown panel | `fade` + `translateY(-0.5rem)` + `scale(0.98 → 1)` | 200ms |
| Popup chọn ngày | `stt-reveal` origin-top khi mở; chevron xoay 180° | 180ms |
| Drawer mobile | panel rơi xuống + backdrop mờ dần; accordion bằng `grid-template-rows` | 300ms |
| Reveal khi cuộn | CSS `animation-timeline: view()`, `range: entry 0% cover 30%` | theo cuộn |
| Parallax hero | `animation-timeline: view()`, `range: cover`, drift ±2.5% + `scale(1.07)` | theo cuộn |
| Hero xuất hiện | `stt-reveal` một lần, so le 80ms | 800ms |
| Header condense | đổi bóng/viền/nền + chiều cao hàng theo `scrollY` | 300ms |
| Thanh tiến trình cuộn | `scaleX` theo `progress`, gắn ở cạnh dưới header | 100ms |
| Header ẩn/hiện | `translateY(-100%)` khi cuộn xuống qua 720px, hiện lại khi cuộn lên | 300ms |
| Nút liên hệ nổi | vòng `stt-pulse-ring` lan ra (chỉ khi đang đóng); các kênh fan lên so le 55ms | 2.8s / 300ms |

### Vì sao không có JavaScript cho chuyển động cuộn

`animation-timeline: view()` được gói trong `@supports`, nên:

- Không có IntersectionObserver, không state, không thêm JS vào bundle.
- Không lệch hydration vì server và client render giống hệt nhau.
- **Nội dung hiển thị mặc định.** Trình duyệt không hỗ trợ, hoặc người dùng bật
  giảm chuyển động, hoặc JavaScript không chạy — trang vẫn đọc được bình thường,
  chỉ là không có hiệu ứng. Không có nhánh dự phòng để bảo trì và không có nguy cơ
  nội dung bị kẹt ở trạng thái `opacity: 0`.

Trạng thái cuộn của header đọc qua `useSyncExternalStore` (không phải
`useEffect` + `useState`), và `progress` được lượng tử hoá 1% để không re-render
theo từng pixel.

**Bắt buộc:**

- Mọi animation bị vô hiệu khi `prefers-reduced-motion: reduce` (khối CSS cuối
  cùng trong `globals.css`), và reveal chỉ chạy trong
  `@supports (animation-timeline: view())`.
- Không scroll hijacking, không video tự chạy, không carousel tự chuyển.
- Nội dung **không** phụ thuộc animation để hiển thị: nếu JS/CSS hỏng, trang vẫn
  đọc được bình thường.
