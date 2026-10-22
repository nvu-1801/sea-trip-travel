# Kế hoạch nâng cấp UI/UX & Motion — SEA TRIP TRAVEL

> Người lập: Senior Product Designer / Frontend Architect / Motion Designer.
> Ngày khảo sát: 2026-10-14.

---

## Trạng thái thực hiện

| Đợt | Nội dung | Trạng thái |
| --- | --- | --- |
| **1** | Baseline + lỗi tương tác/accessibility (T1.0–T1.5) | ✅ **hoàn thành** — xem §0 |
| 2 | Design tokens, typography, layout (T2.1–T2.7) | 🟡 **một phần** — typography đã làm & kiểm chứng (xem §Typo dưới); T2.1–T2.7 còn lại chưa làm |
| 3 | Hero, trang chủ, card (T3.1–T3.5) | ⬜ chưa làm |
| 4 | Danh mục, chi tiết tour, cẩm nang, form (T4.1–T4.7) | ⬜ chưa làm |
| 5 | Chuẩn hoá motion + tương tác đã chọn (T5.1–T5.5) | ⬜ chưa làm |
| 6 | Responsive, a11y, hiệu năng, nghiệm thu (T6.1–T6.6) | ⬜ chưa làm |

### 0. Đợt 1 — kết quả

Branch: **`fix/ui-interaction-a11y`** (từ `e6f69ff`). **Chưa commit, chưa push.**

| ID | Việc | Trạng thái | Bằng chứng |
| --- | --- | --- | --- |
| T1.0 | Chốt baseline an toàn | ✅ phần bảo toàn, ⬜ chưa commit | Branch tạo từ HEAD; working tree giữ nguyên; snapshot 7 file ra ngoài repo (`baseline/files/*`) |
| T1.1 | Chip ≥44px, đồng nhất | ✅ | 5 chỗ: `tour-explorer.tsx` (chip tag 34px + "Tất cả" + "Xoá lọc"), `category-page-view.tsx` (chip danh mục con), `tour-detail-view.tsx` (anchor). Kiểm `verify:ui` mục 10 |
| T1.2 | Rail không nuốt tap | ✅ | `pointer-events-none` trên wrapper + `pointer-events-auto` trên control; Escape đóng + trả focus; đóng khi bấm ngoài. Kiểm `verify:ui` mục 11 |
| T1.3 | Link liên hệ ≥44px | ✅ | `site-footer.tsx` (hotline 20px, email 20px, 3 pill social 30px), `consult-section.tsx` (hotline 28px) |
| T1.4 | Anchor nav mobile | ✅ **đổi cách** | Bỏ cuộn ngang ở mobile → **wrap 2 hàng (390) / 3 hàng (360)**, không cuộn ngang, không mục nào bị ẩn, nav không sticky. Kiểm `verify:ui` mục 12 |
| T1.5 | Print | ✅ | `@media print` + `[data-print-hidden]` cho rail/CTA bar/progress; `verify:ui` mục 13 dùng `emulateMedia('print')` + xuất PDF thật |
| — | Phát sinh thêm | ✅ | Logo link 42px, breadcrumb link 20px, nhãn danh mục ở chi tiết tour 16px → ≥44/≥36px. Kiểm `verify:ui` mục 10 |

**Kiểm tra:** `typecheck` 0 · `lint` 0 · `test` 110/110 · `build` 42 trang · `verify:ui` **160/160**
(trước Đợt 1: 104/104 → thêm 56 kiểm tra hồi quy hành vi).

**Điểm lệch so với kế hoạch, có lý do:**

1. **T1.4 đổi từ "cuộn ngang + dải fade" sang "wrap nhiều hàng".** Đo được: 6 nhãn tiếng
   Việt cao 44px cần 2 hàng ở 390px và 3 hàng ở 360px. Wrap loại bỏ hẳn nguyên nhân
   (mục bị ẩn) thay vì chỉ báo hiệu, và xoá luôn yêu cầu "dấu hiệu cuộn ngang" vì
   không còn cuộn ngang. Thanh cao 110px (390) / 158px (360), không sticky nên
   không che nội dung.
2. **Tap target tách 2 tầng.** Yêu cầu 44px áp cho nhóm thao tác chính (chip, anchor,
   liên hệ, social, logo, breadcrumb, form). Phần còn lại theo WCAG 2.5.8 (≥24px).
   Áp 44px cho mọi link sẽ phá nhịp chữ trong bài viết.
3. **Thêm 2 miễn trừ trong phép kiểm**, đúng chuẩn chứ không vì tiện: link `display:
   inline` trong câu, và checkbox có `<label>` bao ngoài ≥44px (label chính là target).
4. **Honeypot bị loại khỏi phép kiểm kích thước** — ô `input[name="company"]` cố tình
   vô hình, không phải control cho người dùng.

### 0b. Rà soát bug logic + UI (cùng lượt)

| Việc | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Nhảy bậc heading `h1 → h3` ở **9 trang** danh sách | ✅ sửa | Thêm `h2.sr-only` ở `category-page-view.tsx` (8 trang) và `cam-nang-du-lich/page.tsx` (1 trang). `heading-audit-live`: **0/32 route lỗi** (trước: 9). `.sr-only` = `position:absolute; 1×1px; clip-path` → không đổi layout |
| Token `--color-foreground-subtle` fail AA ở **mọi** nền sáng | ✅ sửa | `#8b7684` → `#756063` (đợt luxury): 5.41 (trang), 5.03 (`surface-muted`), 4.74 (`surface-sunken`) |
| Token `--color-primary-strong` fail AA trên nền pha màu | ✅ sửa | `#e0005a` → `#a81455` (đợt luxury): 6.74 trên nền trang, 6.17 trên `primary-soft`, 5.91 trên nền sand tối nhất |
| Code chết: **18 export** không được tham chiếu ở đâu | ✅ xoá | gồm `getToursByIds` — hàm này lọc trên `tour.slug` trong khi tên nói `Id` (bug tên). Giữ 3 type schema (`ContentStatus`, `SeoMeta`, `IsoDate`). Scan lại chỉ còn 3 type đó |
| Hero: chữ `g` bị cắt trong tiêu đề gradient | ✅ sửa | `background-clip: text` chỉ vẽ trong border box; `line-height 1.04` khiến đuôi `g` và dấu dưới `ệ` rơi ra ngoài. Thêm `padding-bottom: .16em` + `margin-bottom: -.16em` vào `brand-gradient-text` |
| Hero: làm mềm + thêm subtitle | ✅ | Dòng gradient nhẹ hơn (`font-semibold` thay vì extrabold), gradient êm hơn (`brand-600 → brand-400 → sun-400`), thêm subtitle |
| Rà tự động: ARIA trỏ sai, id trùng, control thiếu tên, ảnh thiếu `alt`, field thiếu label, số `h1` | ✅ sạch | `browser-audit` trên 7 route × 2 viewport: 0 lỗi (chỉ 404 của chính trang `not-found`) |
| 12 nhãn chữ 10–11px | ⬜ để Đợt 2 | Đây là quyết định typography |
| `clientIp()` lấy `x-forwarded-for` phần tử đầu (client tự khai) | ⬜ ghi nhận | Rate limit có thể bị xoay bucket. Cần chốt theo nền tảng triển khai |
| `Badge` tone `sun` / `success` không dùng | ⬜ ghi nhận | Tone `sun` nếu dùng sẽ fail 4.09:1 |

**Kiểm tra sau rà soát:** `typecheck` 0 · `lint` 0 lỗi 0 cảnh báo · `test` **110/110** ·
`verify:ui` **chưa chạy lại được** (xem hạn chế bên dưới).

**Phạm vi Đợt 1 — thay đổi có chủ đích ngoài kế hoạch ban đầu:** đổi **2 token màu**
(`foreground-subtle`, `primary-strong`) và **phần hero** (`brand-gradient-text`, `h1`,
subtitle) — cả hai do yêu cầu riêng của chủ dự án sau khi xem số liệu, không phải
tự ý mở rộng. Không thêm dependency, không thêm thư viện animation, không giảm
section/tour nào.

**Hạn chế chưa kiểm chứng được trong lượt này:** `npm run build` **không chạy được**
vì `next/font` không tải được Be Vietnam Pro (`fonts.googleapis.com` lỗi TLS trong
môi trường thực thi). Hệ quả: không chạy lại được `verify:ui` (cần `.next/BUILD_ID`)
và không chạy audit trên HTML prerender. Đã bù bằng `next dev` (dev tự fallback font)
→ kiểm được 32 route thật, 7 route × 2 viewport cho a11y/tương phản. Vẫn chưa kiểm:
Safari/Firefox, trình đọc màn hình thật, Lighthouse/LCP/CLS/INP.

---

## 1. Tóm tắt phương án được chọn

**Giữ và tinh chỉnh "Coastal Editorial", không đổi hướng.** Hướng hiện tại đúng:
nền trắng ấm, hồng thương hiệu cho CTA, ảnh là trọng tâm, nhịp section xen kẽ.
Vấn đề không nằm ở hướng thiết kế mà ở **mật độ và tính nhất quán**: trang chủ quá
dài trên mobile, khối ảnh lặp lại, motion không đồng đều giữa các trang, và một
số lỗi tap-target/che khuất có thật.

**5 quyết định chính của kế hoạch:**

| # | Quyết định | Vì sao |
| --- | --- | --- |
| 1 | **Sửa 7 lỗi P0 trước khi thêm bất kỳ hiệu ứng nào** | Có lỗi chặn click và tap-target dưới 44px. Thêm animation lên nền lỗi là sai thứ tự |
| 2 | **Giảm độ dài trang chủ trên mobile từ ~22 màn xuống ~13–14 màn** | `home@390` cao 16.360px; riêng khối "Tour nổi bật" 4.634px |
| 3 | **Chuẩn hoá motion thành một thang duy nhất, không thêm hiệu ứng mới trước** | Đang có 12 mốc thời lượng khác nhau cho cùng một loại tương tác |
| 4 | **Giảm gradient và hiệu ứng lặp; tăng khoảng nghỉ** | `brand-gradient` xuất hiện 12 chỗ, pulse vô hạn, sheen mọi nút primary |
| 5 | **Chỉ thêm 5 tương tác mới, mỗi cái trả lời một câu hỏi trạng thái** | Xem §6 — không thêm 3D tilt, magnetic, count-up, confetti, marquee |

**Không làm:** booking, thanh toán, admin, đa ngôn ngữ, đổi URL, đổi schema,
đổi luồng gửi yêu cầu.

---

## 2. Baseline và giới hạn khảo sát

### 2.1 Repo

| | |
| --- | --- |
| Đường dẫn | `C:\Users\Nguyen Vu\Downloads\Landingpage Tourist\sea-trip-travel` |
| Remote | `https://github.com/nvu-1801/sea-trip-travel.git` |
| Branch | `main` |
| HEAD (SHA) | `e6f69ffa8c9482b8b5e93c32f8641784ce6c19e2` — "first commit", 2026-10-13 14:46 +0700 |
| Working tree | **36 file đã sửa + 5 file chưa track = 41 mục chưa commit**, không có gì đã stage |
| File mới chưa track | `docs/verification.md`, `scripts/`, `src/server/leads/store.ts`, `tests/lead-store.test.ts`, `tests/mail-transport.test.ts` |

> ⚠️ **Toàn bộ công việc trước đó chưa được commit.** Mọi task trong kế hoạch này
> phải bắt đầu từ working tree hiện tại, không `git checkout`/`reset`. Nên commit
> baseline trước khi làm việc mới (đề xuất: `chore: baseline before UI upgrade`).

### 2.2 Đã chạy được

| Việc | Kết quả |
| --- | --- |
| `npm run build` | ✅ 42 trang |
| `npm run verify:ui` (Chrome thật, production) | ✅ **104/104** |
| Audit riêng: 6 trang × 4 viewport (360/390/768/1440) | ✅ server chạy được, đo 24 tổ hợp |
| Probe riêng: pointer-interception, sticky CTA, affordance dải cuộn | ✅ |
| Ảnh baseline | 16 ảnh trong `…\.opencode\plan\audit\shots\` |

Script audit (read-only, không nằm trong project):
`C:\Users\Nguyen Vu\.opencode\plan\audit\audit.mjs`, `probe2.mjs`,
`audit-report.json`, `audit-probe2.json`.

### 2.3 Đã nhìn bằng mắt

- `home-390.png` — trang chủ mobile (toàn trang).
- `tour-1440.png` — chi tiết tour desktop (toàn trang).
- Ảnh full-page trang chủ desktop từ lần chạy `verify:ui` trước đó.

### 2.4 Chưa kiểm — nói rõ

| Chưa kiểm | Ghi chú |
| --- | --- |
| Trạng thái **in** (`@media print`) | Có rule CSS nhưng **chưa đo**. Lần đo đầu tôi quên `emulateMedia('print')` nên số liệu đó vô nghĩa — phải đo lại trong đợt 6 |
| Safari / Firefox | `verify:ui` chạy Chrome. Chưa mở máy thật |
| Trình đọc màn hình (NVDA/VoiceOver) | Chưa chạy |
| LCP / CLS / INP | **Chưa đo.** Không tuyên bố đạt ngưỡng nào |
| Ảnh thật | Toàn bộ 23 ảnh trên trang chủ là placeholder gradient |
| Tablet 768 chi tiết tour | Chỉ đo số, không xem ảnh |
| Điện thoại thật (cảm ứng) | Chỉ mô phỏng viewport trong Chrome |

---

## 3. Audit UI có bằng chứng

Bảng dưới chỉ gồm vấn đề **đo được**. Cột "Bằng chứng" ghi số liệu thật.

### P0 — phải sửa trước khi thêm hiệu ứng

| # | Vấn đề | Trang / component | Bằng chứng | Ảnh hưởng | Đề xuất |
| --- | --- | --- | --- | --- | --- |
| **A1** | **Chip lọc 34px**, trong khi "Tất cả" và "Xoá lọc" 40px | `src/features/tours/tour-explorer.tsx:95` | Đo cùng trang `category@390`: `'Đảo' 59×34`, `'Khám phá' 100×34` vs `'Tất cả' 76×40`, `'1 ngày' 74×40`. Grep: dòng 95 còn `py-1.5`, dòng 79/138 đã có `min-h-10` | Tap-target dưới 44px ở tương tác chính trên mobile; hai hàng chip cùng chức năng mà khác chiều cao | Thêm `inline-flex min-h-10 items-center … sm:min-h-9` cho dòng 95 (đây là chỗ sửa dở của lần trước — `replaceAll` chỉ khớp 1 trong 2 vì thụt lề khác nhau) |
| **A2** | **Rail liên hệ nổi nuốt tap ở dải 52×268px** | `src/components/layout/floating-contact.tsx` | Probe: wrapper `52×268px`, `pointer-events: auto`; **5/5 điểm dò** trong vùng rail đều nhận vào chính rail. 0 control bị chặn ở tâm, nhưng dải mép phải là vùng chết | Tap vào mép phải nội dung (thumbnail gallery, mép CTA) không có tác dụng | `pointer-events-none` trên wrapper + `pointer-events-auto` trên từng nút; và cho `<ul>` khi đóng **không chiếm layout** (`grid-rows-[0fr]` + `overflow-hidden`) để hộp 268px biến mất |
| **A3** | **Link liên hệ ở footer cao 20px** | `src/components/layout/site-footer.tsx` | `a '0969 297 064' 102×20`, `a 'seatriptravel@gmail.com' 174×20` (mọi trang, mọi viewport) | Hotline/email là hành động chuyển đổi chính, dưới 44px | Thêm `inline-flex min-h-11 items-center` (hoặc `py-2.5`) cho hai link này |
| **A4** | **Hotline lớn trong khối tư vấn cao 28px** | `src/features/leads/consult-section.tsx` | `a 176×28` | Cùng lý do A3 | `inline-flex min-h-11 items-center` |
| **A5** | **Thanh anchor tour: 1/6 mục mất hẳn, không có dấu hiệu còn nội dung** | `src/features/tours/tour-detail-view.tsx` (nav `#…` + `no-scrollbar`) | Probe: `ul.no-scrollbar.-mx-5.flex` tràn **+232px** ở 360, `+202px` ở 390; **mục cuối lộ 0%** | Ở 360px khách không biết có mục "Tư vấn" → mất đường tới CTA | Thêm dấu hiệu cuộn: fade mép phải + để lộ ~20% mục kế tiếp; hoặc thu gọn thành 2 hàng nếu ≤ 6 mục |

### P1 — nên sửa trong đợt này

| # | Vấn đề | Trang / component | Bằng chứng | Ảnh hưởng | Đề xuất |
| --- | --- | --- | --- | --- | --- |
| **B1** | **Trang chủ mobile quá dài** | `src/app/page.tsx` + các section home | `home@390` = **16.360px** ≈ 22 màn. Từng section: khám phá **2.886px**, tour nổi bật **4.634px**, vùng **2.041px**, giá trị 1.429px, cẩm nang 1.218px, form 1.983px | Khách phải cuộn rất lâu mới tới form; tỉ lệ tới CTA thấp | Mobile: tour nổi bật còn **4 card** + nút "Xem tất cả"; hàng vùng thu thành danh sách gọn (ảnh nhỏ 96×96 bên trái); khám phá gộp danh mục + điểm đến thành 1 khối |
| **B2** | **20 khối ảnh+chữ lặp cùng một dạng** | Home | Đo `imgs` mỗi section: 2+6+6+4+1+4 = **23 ảnh**; cấu trúc lặp: 6 tour card, 4 card cẩm nang, 4 hàng vùng, 4 tile điểm đến, 2 tile danh mục | Nhàm, mất nhịp điệu; nhìn ảnh mobile thấy rõ "bức tường hồng" | 3 dạng bố cục khác nhau: **lưới card** (tour) · **hàng danh sách** (vùng) · **editorial ảnh lớn + chữ** (giá trị/cẩm nang). Giảm số khối ảnh còn ~15 |
| **B3** | **Độ đo dòng bài viết 81 ký tự** | `src/app/cam-nang-du-lich/[slug]/page.tsx` (`max-w-3xl`) | `proseInfo.approxCharsPerLine`: 34 @360 · 37 @390 · 75 @768 · **81 @1440** | Dòng quá dài, mắt khó bám dòng khi đọc bài dài | Giảm measure xuống `max-w-[42rem]` (672px ≈ 70 ký tự). Giữ 17px/1.85 |
| **B4** | **Card không đồng đều** | `TourCard` trong danh mục | `cardSpread` category: min 659 / max 752 → **chênh 93px @360**, 55 @390, 32 @768, 32 @1440 | Lưới so le, khó so sánh; lệch cả trên desktop | Cố định chiều cao phần chữ: tiêu đề `line-clamp-2`, mô tả `line-clamp-2`, điểm nổi bật **đúng 2** dòng `line-clamp-1`, footer giá/CTA cố định `min-h-16` |
| **B5** | **Motion không đồng đều giữa các trang** | `Reveal` | `revealCount`: home **26** · guides 9 · category 4 · guide 3 · **tour 1** · contact 1 | Trang chủ "sống", trang chi tiết tour gần như tĩnh → cảm giác hai website khác nhau | Áp dụng `Reveal` theo **nhóm nội dung** (mỗi section 1 nhóm, không mỗi card), cho tất cả trang: mục tiêu 6–10 nhóm/trang |
| **B6** | **Parallax chỉ có ở trang chủ** | `Hero`, `AssetImage parallax` | `parallaxCount`: home 2, các trang khác 0 | Không phải lỗi, nhưng là điểm không nhất quán | Giữ parallax **chỉ ở ảnh hero trang chủ** (1 ảnh), bỏ ảnh nhỏ thứ hai |
| **B7** | **Rail và CTA hero chồng hộp ở 360/390** | Hero CTA + rail | Probe 1: `home@360` rail top=376 chồng `a 'Xem tour Quy Nhơn – Ph…'` | Về hình học có chồng; về tâm thì chưa chặn (xem A2) | Xử lý cùng A2 (hộp rail khi đóng không chiếm layout) |

### P2 — cải thiện

| # | Vấn đề | Bằng chứng | Đề xuất |
| --- | --- | --- | --- |
| **C1** | Sheen quét ở **mọi** nút primary | `button.tsx` mặc định `sheen=true` khi `variant="primary"`; đếm được nhiều nút primary/trang | Chỉ bật ở CTA hero + CTA cuối trang. Nơi khác dùng hover màu |
| **C2** | **Pulse vô hạn** ở nút liên hệ | `stt-pulse-ring … infinite`, chạy mãi | Chạy **3 nhịp rồi dừng**; hoặc chỉ chạy khi người dùng chưa tương tác (lần đầu trong phiên) |
| **C3** | **12 mốc thời lượng** cho cùng loại tương tác | Đếm `duration-`: 54 chỗ với 12 giá trị khác nhau (150/200/300/500/700/900ms) | Thang 4 mốc: 150 · 200 · 260 · 380ms (§7) |
| **C4** | **Không có trạng thái đang tải cho ảnh** | `AssetImage` chỉ có placeholder hoặc ảnh; không có `loading` state khi ảnh thật đang tải | Thêm nền tĩnh + fade-in 200ms khi `onLoad` (§7.4) |
| **C5** | **Gallery không có chỉ báo vị trí khi ảnh tràn** | Ở 360, 3 thumbnail vừa khung nên chưa tràn; khi có ≥4 ảnh thật sẽ tràn và không có affordance | Bộ đếm `1/6` đã có ở `sm+` — cho hiển thị luôn ở mobile dạng chấm |
| **C6** | **Anchor nav không đánh dấu mục đang xem** | Chưa có `IntersectionObserver` cho anchor | Thêm active state (§7.3) |
| **C7** | **12 chỗ dùng `brand-gradient`** | Đếm trong `.tsx` | Giữ 6 chỗ có chức năng (rule header, gạch eyebrow, mốc lịch trình, hairline, FAB, H1 hero). Bỏ ở các chỗ chỉ để trang trí |

### Điểm đã tốt — giữ nguyên

- **Không tràn ngang**: 24/24 tổ hợp (360/390/768/1440) đều `scrollWidth == clientWidth`. ✅
- **Không animate `opacity` cho nội dung dưới màn hình** → in và chụp full-page không mất nội dung. ✅
- **Gate `@supports` + `prefers-reduced-motion`** cho mọi scroll animation. ✅
- **Form giữ dữ liệu khi lỗi**, validate hai phía bằng cùng schema, 3 lỗi tại trường đúng như mong đợi. ✅
- **Header ẩn khi cuộn không mất khi mở menu** (`navOpen` giữ header). ✅

---

## 4. Art direction và thay đổi token

### 4.1 Hai hướng đã cân nhắc

| Hướng | Mô tả | Kết luận |
| --- | --- | --- |
| **A. Coastal Editorial (đang dùng) — tinh chỉnh** | Nền trắng ấm, ảnh lớn, hồng cho CTA, nhịp section xen kẽ, editorial xen ảnh và chữ | ✅ **Chọn** |
| B. Bổ sung lớp "sunrise soft" | Thêm dải màu nắng nhạt, khối kính mờ ở panel tư vấn, thẻ nổi nhiều tầng | ❌ Tăng mật độ gradient và glassmorphism — đúng thứ yêu cầu nói phải tránh |

### 4.2 Giữ / Chỉnh / Bỏ

| Hạng mục | Giữ | Chỉnh | Bỏ |
| --- | --- | --- | --- |
| **Màu semantic** | Toàn bộ token hiện có (`--color-primary-strong` #E0005A cho CTA, `--color-primary` #FF0366 cho trang trí, `--color-background` #FFFAFC, `--color-foreground` #211621) | Thêm `--color-surface-raised` #FFFFFF và `--color-overlay` `rgb(122 0 49 / .45)` cho scrim; thêm `--color-border-subtle` #F7E7EF cho kẻ mảnh trong card | Không bỏ token nào |
| **Gradient** | `brand-gradient` (6 chỗ có chức năng), `brand-gradient-text` (chỉ H1 hero) | Giảm `surface-section-muted/sunken` từ gradient 3 điểm dừng xuống **1 màu phẳng + 1 đường kẻ 1px** để ranh giới section rõ hơn trên mobile | Bỏ gradient ở các chỗ trang trí (C7) |
| **Font** | Be Vietnam Pro 400–800, `subsets: latin + vietnamese` | Thêm **line-height cho `text-display-*`**: `display-xl 1.02`, `display-lg 1.06`, `display 1.1`, `display-sm 1.18` (hiện 1.04–1.2 nhưng H1 hero xuống 3 dòng ở 390) | — |
| **Type scale** | `display-xl` 3.5rem → mobile 1.625rem | Thêm bậc cho **nhãn nhỏ**: `--text-label: 0.6875rem` + tracking `0.14em` dùng thống nhất cho eyebrow/meta | — |
| **Độ đo dòng** | — | Bài viết: `max-w-3xl` (768px) → **`max-w-[42rem]`** (672px). Đoạn mở đầu giữ 19px | — |
| **Container / grid** | `container-page` 78rem, header 88rem | Thêm `--spacing-section` không cần; giữ `tight/default/loose` nhưng mobile **giảm một bậc**: `loose` từ `py-14` → `py-12` | — |
| **Radius** | xs 6 → 3xl 36 | Card tour giữ `2xl` (28px); **ảnh trong card đổi từ `rounded-none` sang kế thừa card** (đang đúng) | — |
| **Shadow** | `soft/card/lifted/focus` | **Giảm biên độ**: `lifted` từ `0 20px 44px -14px /.2` → `0 14px 32px -14px /.16`; `card` tương tự −20% | — |
| **Button** | `primary` #E0005A, `min-h-11`, nhãn wrap ở `max-sm` | Sheen chỉ ở CTA hero; `ghost` thêm viền khi hover để thấy rõ vùng bấm | Sheen mặc định mọi primary |
| **Input** | `h-11`, `leading-6`, khe thông báo giữ chỗ `min-h-4` | Khe `min-h-4` → **`min-h-0` khi không có hint/lỗi** và chỉ giữ chỗ khi field có hint (giảm 96px/form mobile) | — |
| **Badge** | `brand/sun/neutral/outline/success` | Thêm `size="sm"` (cao 24px) cho tag trong card để giảm chiều cao card (B4) | — |
| **Card** | Cấu trúc ảnh → nhãn → tiêu đề → mô tả → điểm nổi bật → giá/CTA | Cố định chiều cao khối chữ như B4 | — |
| **Dropdown** | Dùng `<select>` gốc + chevron riêng | Giữ. Không dựng listbox |
| **Icon** | Bộ inline 24×24, stroke 1.8 | Giữ. Thêm 2 icon: `ArrowUpRight` (link ra ngoài), `Spinner` đã có | — |
| **Ảnh** | Ảnh là trọng tâm; tỉ lệ `4:3` card / `16:10` gallery / `4:5` hero / `5:4` điểm đến | Thêm `focalPoint` (object-position) vào `ImageAsset` để crop đúng chủ thể; card `4:3` → **`3:2`** cho ảnh biển ngang tự nhiên hơn | — |

**Màu logo không đổi.** `#FF0366` vẫn là màu nhận diện, chỉ dùng cho trang trí và
chữ lớn; `#E0005A` là màu tương tác đạt AA. Không trộn hai vai trò này.

---

## 5. Wireframe mô tả từng trang

Ký hiệu: `▣` ảnh · `[CTA]` nút · `▸` hành vi · `≈` motion

### 5.1 Trang chủ (`src/app/page.tsx`)

| # | Section | Yếu điểm hiện tại | Desktop | Mobile | Ảnh | Spacing | Motion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Header | Tốt | Logo + 5 mục + hotline + CTA | Logo + gọi + menu | — | h 72/64px | Giữ: condense, ẩn/hiện, progress |
| 2 | Hero | Collage hơi chật ở 390; badge che ảnh | 6/6: chữ trái, 1 ảnh `4:5` + thẻ badge ở góc | 1 cột: chữ → 1 ảnh `4:5` (bỏ tile vuông thứ hai) | 1 ảnh hero `1600×2000`, focal 1/3 trên | `py-12 / py-24` | `entrance` so le 60ms, `parallax` **chỉ ảnh này** |
| 3 | Khám phá nhanh | 2.886px ở 390 vì 2 tile lớn + 4 tile điểm đến | 2 tile danh mục (2 cột) + hàng 4 điểm đến | **Gộp**: 2 hàng danh mục dạng dải ngang (ảnh 88×88 + chữ) + 1 nút "Xem điểm đến" → ~1.400px | 2 ảnh danh mục `3:2`, 4 ảnh điểm đến `1:1` | `py-12 / py-20` | `Reveal` 1 nhóm |
| 4 | Tour nổi bật | 4.634px = 6 card mobile | 3 cột × 2 hàng | **4 card** + nút "Xem tất cả 15 tour" → ~3.100px | 4 ảnh `3:2` | `py-12 / py-28` (nền muted **phẳng**) | `Reveal` theo nhóm 2 card |
| 5 | Vùng miền | 2.041px, 4 hàng ảnh lớn | Danh sách 4 hàng: ảnh 240px trái | **Thu gọn**: ảnh 96×96 trái + tên + số tour, không mô tả → ~700px | 4 ảnh `1:1` (crop vuông) | `py-12 / py-24` | `Reveal` |
| 6 | Giá trị | 1.429px, chữ dài | 2 cột: ảnh dọc trái, 4 nguyên tắc phải | Giữ nguyên nhưng **bỏ ảnh ở mobile** (đã có nhiều ảnh phía trên) → ~600px | 1 ảnh `4:5` (chỉ desktop) | `py-12 / py-24` (nền sunken phẳng) | `Reveal` |
| 7 | Cẩm nang | 1.218px, đã tốt | 7/5: 1 bài nổi bật + 3 hàng nhỏ | Giữ: 1 bài nổi bật + 3 hàng nhỏ | 4 ảnh | `py-12 / py-24` | `Reveal` 1 nhóm |
| 8 | Form tư vấn | 1.983px, form chiếm chỗ | 5/7: cam kết trái, form phải | 1 cột | — | `py-12 / py-24` (muted phẳng) | Không reveal cả form; chỉ CTA |
| 9 | Footer | Tốt | 4 cột | 1 cột, thứ tự: liên hệ → danh mục → thông tin | — | `py-12` | Không |

**Khi thiếu ảnh:** dùng placeholder hiện tại nhưng **giảm độ bão hoà** — hiện
placeholder dùng gradient đầy đủ brand nên trang toàn placeholder thành "tường
hồng". Đổi placeholder sang **nền `surface-muted` + 1 dải gradient mảnh ở đáy +
icon + nhãn "Ảnh minh hoạ"** để trang vẫn nhẹ khi chưa có ảnh thật.

**Mục tiêu sau đợt 3:** `home@390` từ 16.360px → **≤ 10.500px** (≈13–14 màn).

### 5.2 Danh mục tour (`CategoryPageView`)

| Khu vực | Hiện tại | Đề xuất |
| --- | --- | --- |
| Tiêu đề | eyebrow + H1 + mô tả + chip danh mục con | Giữ. Mô tả `line-clamp-3` |
| Bộ lọc | "Lọc theo nhu cầu" 1 hàng chip `flex-wrap` + select "Sắp xếp theo" | Giữ, nhưng: chip **cao 40px** (A1); hiện tổng số kết quả ngay cạnh nhãn; **cuộn ngang 1 hàng** thay vì wrap 3–4 hàng để tiết kiệm 120px mobile |
| Lưới | 3 cột / 2 cột mobile | Giữ. Card cố định chiều cao khối chữ (B4) |
| Trạng thái lọc | Đã có đếm + "Xoá lọc" | Giữ. Thêm màu nền nhạt cho khối khi đang lọc |
| Không kết quả | Đã có + nút xoá lọc | Giữ |
| Motion | 4 `Reveal` | 1 `Reveal` cho lưới, stagger 40ms mỗi card, tối đa 6 card đầu |

### 5.3 Chi tiết tour (`TourDetailView`)

| Khu vực | Hiện tại | Đề xuất |
| --- | --- | --- |
| Breadcrumb | Có | Giữ |
| Gallery | Panel `16:10` + dải thumbnail `tablist` | Giữ. Thêm **loading state** (C4) + bộ đếm chấm ở mobile (C5) |
| Cột trái | Nhãn danh mục, H1, mô tả, chip điểm đến, gallery, facts `lg:hidden` | Giữ |
| Cột phải sticky | facts (desktop) + giá + CTA `#tu-van` | Giữ. `top-28` → `top-24` để không bị header che khi header condense |
| Anchor nav | 6 mục cuộn ngang, `no-scrollbar` | **Thêm fade mép + để lộ mục kế tiếp; đánh dấu mục đang xem** (A5, C6) |
| Tổng quan | 2 đoạn, cột 8/12 | Giữ. `max-w-[42rem]` cho dễ đọc |
| Điểm nổi bật | 6 mục, lưới 2 cột, số 01–06 | Giữ (đã tốt) |
| Lịch trình | Timeline rail gradient, mốc ngày | Giữ. Ngày có nhiều hoạt động: thu gọn còn 4 hoạt động + "Xem thêm" để giảm chiều cao |
| Dịch vụ | 2 cột bao gồm / không bao gồm | Giữ |
| Lưu ý + chính sách | 1 cột khi chưa có chính sách | Giữ |
| Tour liên quan | 3 card | Giữ |
| Form | `ConsultSection` | Giữ. Bỏ sheen ở nút submit (§6) |
| CTA mobile | Thanh đáy 69px, tự ẩn khi form vào khung | Giữ. Đảm bảo không che nút submit: `#tu-van` nằm trên footer nên đã ổn |
| Motion | **chỉ 1 `Reveal`** | 6–8 nhóm `Reveal` (B5) |

### 5.4 Cẩm nang: danh sách + chi tiết

| Khu vực | Hiện tại | Đề xuất |
| --- | --- | --- |
| Danh sách | 1 bài nổi bật + lưới 3 cột | Giữ |
| Chi tiết: thân bài | `max-w-3xl` (81 ký tự) | **`max-w-[42rem]`** (B3) |
| Chi tiết: heading | `h2` 1.75rem + gạch gradient | Giữ. Thêm `scroll-margin-top` đã có |
| Chi tiết: ảnh trong bài | `16:9` + caption | Giữ |
| Chi tiết: link trong bài | `underline` + hồng đậm | Giữ, thêm `hover:bg-brand-50` để vùng bấm rõ hơn |
| Chi tiết: callout | 3 tone info/tip/warning | Giữ |
| Trạng thái tải | Không có | Thêm cho ảnh (C4) |

### 5.5 Liên hệ + form

| Khu vực | Hiện tại | Đề xuất |
| --- | --- | --- |
| 3 card kênh liên hệ | Có, có nút to | Giữ. Thêm `min-h-11` cho link (A3/A4) |
| "Sau khi gửi" 3 bước | Có | Giữ |
| Form | 6 trường + consent + khe thông báo giữ chỗ | Giảm 96px chiều cao: khe thông báo chỉ giữ chỗ khi field **có** hint |
| Lỗi | 3 lỗi tại trường, `role="alert"`, giữ dữ liệu | Giữ |
| Thành công | Panel bền vững + mã `STT-…` + nút gọi hotline | Giữ (đã đúng yêu cầu "không chỉ toast") |

---

## 6. Ma trận giữ / chỉnh / bỏ / thêm hiệu ứng

Mỗi hiệu ứng phải trả lời: **giúp người dùng hiểu gì?**

### 6.1 Giữ nguyên

| Hiệu ứng | Giúp hiểu gì |
| --- | --- |
| Card lift `-2…-4px` + shadow | "Thẻ này bấm được" |
| Ảnh zoom `1.03` trong khung | Phản hồi trực tiếp khi trỏ vào thẻ |
| Gạch chân nav theo hover **và** `aria-current` | "Bạn đang ở mục nào" |
| Dropdown fade + dịch 4px | "Menu mở ra từ nút này" |
| Accordion `grid-template-rows` mobile | "Nhóm này mở/đóng" |
| Drawer mobile trượt + backdrop mờ | "Đây là lớp phủ, đóng được" |
| Popup chọn ngày `stt-entrance` | "Popup thuộc ô này" |
| Progress bar cuộn | "Bạn đang ở đâu trong trang" |
| Header condense | "Trang đã cuộn" |
| Nút về đầu trang | Lối thoát khỏi trang dài |
| Reveal `transform` 10px | Nhịp đọc, và **không** làm mất nội dung |
| Sheen ở CTA hero | Nhấn CTA chính |
| Focus ring `shadow-focus` | Vị trí bàn phím |

### 6.2 Tinh chỉnh

| Hiệu ứng | Đang | Đổi thành |
| --- | --- | --- |
| Card lift | `-4px` | **`-3px`** |
| Ảnh zoom | `1.04–1.08` | **`1.03`** thống nhất |
| Reveal | `0.75rem` (12px), range `entry 0% cover 30%` | `0.625rem` (10px), range **`entry 0% cover 25%`** |
| Parallax | ±2.5%, `scale(1.07)`, 2 ảnh | **±2%**, `scale(1.05)`, **1 ảnh** |
| Entrance hero | `0.8s`, delay 0/80/160/240/320ms | **`0.38s`**, delay 0/60/120/180ms |
| Header ẩn/hiện | 300ms, ngưỡng 720px | Giữ; **thêm điều kiện**: không ẩn khi `document.activeElement` nằm trong header |
| Section surface | gradient 3 điểm dừng | **phẳng + kẻ 1px** `border-border` |
| Shadow `lifted` | `/.2` | `/.16` |

### 6.3 Giảm hoặc bỏ

| Hiệu ứng | Quyết định | Lý do |
| --- | --- | --- |
| `stt-pulse-ring infinite` | **Giảm: 3 nhịp rồi dừng** | Nhấp nháy vĩnh viễn gây phân tán và là hiệu ứng duy nhất chạy mãi |
| Sheen mọi nút primary | **Bỏ, chỉ giữ ở hero + CTA cuối** | Lặp lại ở 6–8 nút/trang thì không còn là điểm nhấn |
| Parallax ảnh nhỏ thứ hai | **Bỏ** | Không thêm thông tin, chỉ thêm chuyển động |
| `Reveal` cho mỗi card | **Bỏ, gom theo nhóm** | 26 điểm reveal ở trang chủ nhưng 1 ở trang tour → hai cảm giác khác nhau |
| Gradient ở badge/trang trí (C7) | **Bỏ 6 chỗ** | Gradient chỉ nên ở nơi mã hoá nhận diện |
| Placeholder gradient bão hoà | **Đổi sang nền nhạt + dải mảnh** | Trang toàn placeholder đang thành khối hồng nặng |

### 6.4 Thêm (chỉ 5, mỗi cái có lý do)

| # | Hiệu ứng | Giúp hiểu gì | Ghi chú kỹ thuật |
| --- | --- | --- | --- |
| N1 | **Anchor nav: fade mép phải + để lộ 20% mục kế tiếp + active state** | "Còn mục nữa" và "bạn đang đọc mục nào" | Fade bằng `mask-image` (CSS, không cần listener). Active bằng `IntersectionObserver` 1 lần cho cả nav, `threshold: 0.5`, chỉ `setState` khi đổi mục → không render theo scroll |
| N2 | **Ảnh: nền tĩnh + fade-in 200ms khi tải xong** | "Ảnh đang tải, không phải lỗi" | `onLoad` → thêm `data-loaded`; `opacity 0 → 1` 200ms. Chỉ chạy khi có `image.src` thật. Nếu ảnh lỗi → `onError` về placeholder, không skeleton vô hạn |
| N3 | **Stagger theo nhóm cho lưới card (CSS biến `--i`)** | Nhịp đọc theo hàng, không phải hiệu ứng | `style={{ '--i': index }}` + `animation-range: entry calc(0% + var(--i) * 2%) cover 25%` trong `@supports`. **Không** dùng `animation-delay` (vô nghĩa với `animation-timeline`) |
| N4 | **Reveal cho 6–8 nhóm ở trang chi tiết tour** | Trang dài có nhịp, không nhảy | Dùng `Reveal` sẵn có, bọc quanh section — **không** bọc từng ngày lịch trình |
| N5 | **Gallery: chấm chỉ báo vị trí ở mobile** | "Có mấy ảnh, đang ở ảnh nào" | Thuần CSS + `aria-selected` sẵn có; không thêm state |

**Không thêm:** 3D tilt · magnetic button · hiệu ứng gõ chữ · count-up · marquee ·
confetti · parallax nhiều lớp toàn trang · scroll hijacking · section snap bắt buộc.

---

## 7. Motion specification

### 7.1 Thang thời lượng (thay 12 mốc hiện có bằng 4)

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--duration-press` | `100ms` | `active`, phản hồi nhấn |
| `--duration-hover` | `150ms` | hover, đổi màu, viền, shadow, card lift, ảnh zoom |
| `--duration-enter` | `200ms` | dropdown, select, popover, accordion, fade ảnh |
| `--duration-panel` | `260ms` | drawer, panel lớn, header condense |
| `--duration-entrance` | `380ms` | hero entrance (một lần) |

Easing: `--ease-out-soft` `cubic-bezier(0.22, 1, 0.36, 1)` (đang có) cho mọi thứ;
thêm `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)` cho panel/accordion.
**Bỏ 6 mốc 500/700/900ms.**

### 7.2 Bảng đặc tả

| Component | Trigger | Thuộc tính | Thời lượng / range | Easing | Biên độ | Desktop | Mobile | Reduced-motion | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Button` primary | hover | `background-color`, `box-shadow`, `translateY` | 150ms | out-soft | `-2px` | ✅ | ✅ | màu vẫn đổi, bỏ dịch | màu |
| `Button` | active | `translateY` | 100ms | out-soft | `0` | ✅ | ✅ | giữ (rất ngắn) | — |
| `Button` sheen | hover (hero + CTA cuối) | `translateX` pseudo | 700ms một lần | out-soft | `-120% → 120%` | ✅ | ❌ bỏ ở mobile | bỏ | — |
| `TourCard` / `CategoryCard` / `ArticleCard` | hover | `translateY`, `box-shadow`, `border-color` | 150ms | out-soft | `-3px` | ✅ | hover không tồn tại → dùng `active:scale-[.99]` | bỏ dịch | đổi viền |
| `AssetImage` trong card | hover cha | `scale` | 150ms | out-soft | `1.03` | ✅ | ❌ | bỏ | — |
| `AssetImage` (ảnh thật) | `onLoad` | `opacity` | 200ms | out-soft | `0 → 1` | ✅ | ✅ | hiện ngay | hiện ngay |
| Hairline gradient card | hover | `scaleX` | 150ms | out-soft | `0 → 1` | ✅ | ❌ | bỏ | — |
| `DesktopNav` panel | hover/Enter/ArrowDown | `opacity`, `translateY`, `scale`, `visibility` | 200ms | out-soft | `-4px`, `0.98 → 1` | ✅ | — | hiện/ẩn ngay | hiện/ẩn |
| Nav underline | hover / `aria-current` | `scaleX` | 150ms | out-soft | `0 → 1` | ✅ | — | giữ (không chuyển động) | — |
| `MobileNav` drawer | mở | `stt-drawer-in` | 260ms | out-soft | `-24px`, `0 → 1` | — | ✅ | hiện ngay | hiện |
| `MobileNav` accordion | toggle | `grid-template-rows`, `opacity` | 200ms | standard | `0fr → 1fr` | — | ✅ | tức thì | tức thì |
| `DatePicker` popover | mở | `stt-entrance` | 200ms | out-soft | `14px` | ✅ | ✅ | tức thì | hiện |
| `HeaderShell` | scrollY > 10 | `background`, `box-shadow`, `border-color` | 260ms | out-soft | — | ✅ | ✅ | **giữ** (chỉ đổi màu) | đổi màu |
| `HeaderShell` condense | scrollY > 10 | `height` logo, hàng | 260ms | out-soft | `40 → 36px` | ✅ | ❌ giữ nguyên | **giữ** | — |
| `HeaderShell` ẩn | cuộn xuống > 720px | `translateY` | 260ms | out-soft | `-100%` | ✅ | ✅ | **bỏ** | luôn hiện |
| Progress bar | scroll | `scaleX` | 100ms | linear | `0 → 1` | ✅ | ✅ | **giữ** (state, không phải trang trí) | — |
| `Reveal` | vào khung | `translateY` + range | `entry 0% → cover 25%` | linear | `10px` | ✅ | ✅ | `animation: none` | tĩnh |
| `Reveal` stagger (N3) | vào khung | như trên, dịch range theo `--i` | `+2%` mỗi mục | linear | `10px` | ✅ | ✅ | `none` | tĩnh |
| `data-parallax` (1 ảnh hero) | cuộn | `translateY` + `scale` | range `cover` | linear | `±2%`, `1.05` | ✅ | ✅ | `none` | tĩnh |
| `FloatingContact` items | mở | `translateY`, `scale`, `opacity` | 260ms, so le 40ms | out-soft | `12px`, `0.9 → 1` | ✅ | ✅ | tức thì | hiện |
| `FloatingContact` pulse | tải lần đầu | `box-shadow` | 3 nhịp × 2.8s **rồi dừng** | out-soft | `0 → 0.85rem` | ✅ | ✅ | bỏ | — |
| Anchor nav fade (N1) | luôn | `mask-image` | tĩnh | — | `0 → 100%` | ✅ | ✅ | giữ | — |
| Anchor nav active (N1) | cuộn | `background-color`, `color` | 200ms | out-soft | — | ✅ | ✅ | giữ | — |
| Gallery dot (N5) | chọn ảnh | `background-color`, `scale` | 150ms | out-soft | `1 → 1.2` | ✅ | ✅ | giữ | — |

### 7.3 Ghi chú kỹ thuật bắt buộc

1. **Không đặt hero/LCP ở trạng thái vô hình.** `data-entrance` chỉ dùng cho khối
   chữ hero (không phải ảnh LCP). Ảnh hero tải bình thường, không `opacity: 0`.
2. **Không dùng `animation-delay` cho scroll-driven.** Stagger bằng cách dịch
   `animation-range` theo biến `--i` (N3).
3. **`data-reveal` không animate `opacity`** — giữ nguyên quyết định này. Đã có
   kiểm tra tự động bảo vệ.
4. **Chỉ gate cái cần gate.** `@supports (animation-timeline: view())` chỉ bọc
   `[data-reveal]` và `[data-parallax]`. Transition và hover **không** phụ thuộc nó.
5. **Reset transform có phạm vi.** Khối `@media print` và `prefers-reduced-motion`
   hiện reset `[data-reveal]`, `[data-parallax]`, `[data-entrance]`,
   `header[data-hidden]`. **Không** dùng selector `*` cho `transform` — sẽ phá
   `translate` dùng để căn giữa của drawer/backdrop.
6. **Reduced-motion vẫn dùng được**: mọi hiệu ứng chỉ mất phần *chuyển động*;
   trạng thái (màu, viền, hiện/ẩn, active) vẫn đổi.
7. **Không thêm listener trùng.** Hiện có 2 listener `scroll` (store header + thanh
   CTA mobile). N1 thêm `IntersectionObserver` **một lần cho cả nav**, không
   listener theo từng mục, và chỉ `setState` khi mục active thay đổi.
8. **JavaScript được phép.** Không theo đuổi "0 JS" bằng mọi giá: N1 cần JS để biết
   mục nào đang xem; N2 cần `onLoad`. Điều bắt buộc là **không JS cho animation
   hình ảnh** và **không render React theo từng pixel scroll**.
9. **Không thêm thư viện animation.** Toàn bộ làm bằng CSS + ~30 dòng JS.

---

## 8. Backlog theo file / component

Ước lượng: **1 dev đã quen codebase**, không tính thời gian chờ duyệt nội dung.
`S` ≤ 2h · `M` 2–4h · `L` 4–8h.

### Đợt 1 — Baseline và lỗi P0 (làm trước, không thêm hiệu ứng)

| ID | P | Mục tiêu | File / component | Thay đổi | Phụ thuộc | Acceptance | Kiểm tra | Ước lượng |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **T1.0** | P0 | Chốt baseline an toàn | — | Commit working tree hiện tại (`chore: baseline before UI upgrade`) | — | `git status` sạch | `git log -1` | S |
| **T1.1** | P0 | Chip lọc đạt 44px và đồng nhất | `tour-explorer.tsx:95` | Đổi class chip tag sang `inline-flex min-h-10 items-center … sm:min-h-9` | — | Chip tag và "Tất cả" cùng chiều cao; ≥44px ở mobile | `verify:ui` mục 1 + đo lại `smallTargets` | S |
| **T1.2** | P0 | Rail không nuốt tap | `floating-contact.tsx` | Wrapper `pointer-events-none`; nút `pointer-events-auto`; `<ul>` khi đóng `grid-rows-[0fr] overflow-hidden` | — | Hộp rail khi đóng ≈ 52×52px; `elementFromPoint` ở mép phải nội dung trả về chính nội dung | Probe `elementFromPoint` thêm vào `verify:ui` | M |
| **T1.3** | P0 | Link liên hệ ≥44px | `site-footer.tsx`, `consult-section.tsx` | `inline-flex min-h-11 items-center` cho hotline/email | — | `smallTargets` không còn mục 20/28px | Đo lại | S |
| **T1.4** | P0 | Anchor nav có dấu hiệu cuộn | `tour-detail-view.tsx` | `mask-image` fade mép phải; đảm bảo mục cuối không nằm hoàn toàn ngoài khung | T1.0 | Ở 360px, mục cuối lộ ≥20% hoặc nav thu 2 hàng | Probe scroller `lastItemVisibleFraction` ≥ 0.2 | M |
| **T1.5** | P0 | Đo được trạng thái in | `scripts/verify-ui.mjs` | Thêm `page.emulateMedia({ media: 'print' })` + assert `transform === 'none'` | — | Báo cáo có mục print PASS/FAIL thật | `verify:ui` | S |

### Đợt 2 — Token, typography, layout

| ID | P | Mục tiêu | File | Thay đổi | Phụ thuộc | Acceptance | Kiểm tra | Ước lượng |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **T2.1** | P1 | Thang thời lượng 4 mốc | `globals.css` `@theme` | Thêm 4 `--duration-*` + `--ease-standard`; thay 12 mốc cũ trong `.tsx` | T1.0 | Không còn `duration-[500|700|900]` | `grep duration-` | M |
| **T2.2** | P1 | Độ đo dòng bài viết | `cam-nang-du-lich/[slug]/page.tsx` | `max-w-3xl` → `max-w-[42rem]` | — | `approxCharsPerLine` ≤ 72 @1440 | Audit lại | S |
| **T2.3** | P1 | Line-height display | `globals.css` | `display-xl 1.02` … `display-sm 1.18` | — | H1 hero không quá 3 dòng ở 390 | Ảnh + đo `h1Info` | S |
| **T2.4** | P1 | Section surface phẳng + kẻ | `globals.css`, `layout.tsx` | Bỏ gradient 3 điểm dừng; `border-top: 1px` cho `muted`/`sunken` | — | Ranh giới section thấy rõ trên mobile | Ảnh 390 | S |
| **T2.5** | P1 | Shadow nhẹ hơn | `globals.css` | `lifted /.2 → /.16`, `card −20%` | — | Không đổi bố cục | Ảnh | S |
| **T2.6** | P2 | Phẳng hoá placeholder | `asset-image.tsx` | Nền `surface-muted` + dải gradient mảnh ở đáy + icon + nhãn | — | Trang toàn placeholder không còn "tường hồng" | Ảnh 390/1440 | M |
| **T2.7** | P2 | Bỏ 6 chỗ gradient trang trí | nhiều file | Bỏ `brand-gradient` ở badge/trang trí | T2.6 | Đếm còn 6 chỗ | `grep brand-gradient` | S |

### Đợt 3 — Hero, trang chủ, card

| ID | P | Mục tiêu | File | Thay đổi | Phụ thuộc | Acceptance | Kiểm tra | Ước lượng |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **T3.1** | P1 | Rút ngắn trang chủ mobile | `hero.tsx`, `explore-section.tsx`, `regions-section.tsx`, `values-section.tsx` | Bỏ tile vuông ở hero; gộp khám phá; vùng thành hàng 96×96; bỏ ảnh giá trị ở mobile | T2.* | `home@390` ≤ 10.500px | Audit `doc.scrollHeight` | L |
| **T3.2** | P1 | Giảm số khối ảnh | như T3.1 | Còn ~15 khối ảnh | T3.1 | Đếm `imgs` mỗi section giảm ≥30% | Audit | M |
| **T3.3** | P1 | Card đồng đều | `tour-card.tsx` | `line-clamp-2` tiêu đề/mô tả; 2 điểm nổi bật `line-clamp-1`; footer `min-h-16`; tỉ lệ ảnh `3:2` | — | `cardSpread` ≤ 8px ở mọi viewport | Audit `cardSpread` | M |
| **T3.4** | P1 | Tour nổi bật còn 4 card ở mobile | `featured-tours-section.tsx` | Mobile 4 card + nút "Xem tất cả" | T3.3 | Section ≤ 3.200px @390 | Audit | S |
| **T3.5** | P2 | Stagger theo nhóm (N3) | `reveal.tsx`, home sections | Biến `--i`, dịch `animation-range` | T2.1 | Không dùng `animation-delay` | Đọc CSS build | M |

### Đợt 4 — Danh mục, chi tiết tour, cẩm nang, form

| ID | P | Mục tiêu | File | Thay đổi | Phụ thuộc | Acceptance | Kiểm tra | Ước lượng |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **T4.1** | P1 | Chip lọc cuộn 1 hàng mobile | `tour-explorer.tsx` | `flex-nowrap overflow-x-auto no-scrollbar` ở mobile, `flex-wrap` từ `sm` + hiện số kết quả | T1.1 | Tiết kiệm ≥100px @390 | Audit section height | M |
| **T4.2** | P1 | Reveal 6–8 nhóm cho trang tour | `tour-detail-view.tsx` | Bọc `Reveal` quanh section, không bọc từng ngày | T3.5 | `revealCount` trang tour 6–8 | Audit | M |
| **T4.3** | P1 | Anchor active (N1) | `tour-detail-view.tsx` | `IntersectionObserver` 1 lần, `setState` khi đổi mục | T1.4 | Active đổi đúng khi cuộn; không nhảy focus; không ghi URL | `verify:ui` bổ sung | M |
| **T4.4** | P1 | Lịch trình gọn hơn | `itinerary-timeline.tsx` | `line-clamp-3` hoạt động khi ngày có >4 mục + nút xem thêm (thuần CSS `details`) | — | Section lịch trình giảm ≥15% | Audit | M |
| **T4.5** | P1 | Form thấp hơn | `form-controls.tsx` | Khe thông báo chỉ giữ chỗ khi field có hint/lỗi | — | Form giảm ~96px @390 | Audit `blockHeights` | S |
| **T4.6** | P2 | Fade-in ảnh (N2) | `asset-image.tsx` | `onLoad`/`onError` + `data-loaded` | T2.6 | Ảnh lỗi rơi về placeholder, không skeleton vô hạn | Bổ sung test | M |
| **T4.7** | P2 | Chấm chỉ báo gallery (N5) | `tour-gallery.tsx` | Chấm ở mobile | — | Hiện khi ≥2 ảnh | Ảnh | S |

### Đợt 5 — Chuẩn hoá motion và tương tác đã chọn

| ID | P | Mục tiêu | File | Thay đổi | Phụ thuộc | Acceptance | Kiểm tra | Ước lượng |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **T5.1** | P1 | Sheen chỉ ở CTA chính (C1) | `button.tsx` | `sheen` mặc định `false`; bật ở hero + CTA cuối | T2.1 | Đếm sheen ≤2/trang | `grep sheen` | S |
| **T5.2** | P1 | Pulse dừng sau 3 nhịp (C2) | `globals.css`, `floating-contact.tsx` | `animation-iteration-count: 3` | — | Hết nhấp nháy sau ~8s | Quan sát + đọc CSS | S |
| **T5.3** | P1 | Header không ẩn khi focus trong header | `header-shell.tsx` | Thêm điều kiện `!headerFocused` | — | Tab vào hotline không làm header biến mất | `verify:ui` bổ sung | M |
| **T5.4** | P1 | Đồng bộ hover/focus | `button.tsx`, card | Thêm `focus-visible:` tương đương `hover:` ở CTA chính | — | CTA đổi trạng thái giống nhau khi Tab | Bàn phím | S |
| **T5.5** | P2 | Parallax còn 1 ảnh (B6) | `hero.tsx` | Bỏ `parallax` ở tile vuông | — | `parallaxCount` = 1 | Audit | S |

### Đợt 6 — Responsive, accessibility, hiệu năng, nghiệm thu

| ID | P | Mục tiêu | File | Thay đổi | Phụ thuộc | Acceptance | Kiểm tra | Ước lượng |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **T6.1** | P0 | Không hồi quy tràn ngang | — | — | T1–T5 | 24/24 tổ hợp `scrollWidth == clientWidth` | Audit | S |
| **T6.2** | P0 | `verify:ui` mở rộng | `scripts/verify-ui.mjs` | Thêm: tap-target, rail `elementFromPoint`, print, anchor active, ảnh lỗi | T1–T5 | ≥130 kiểm tra, tất cả PASS | `verify:ui` | M |
| **T6.3** | P1 | Đo hiệu năng trước/sau | — | `lighthouse` desktop + mobile trên `/` và `/tour/[slug]` | T6.1 | Có số LCP/CLS/INP **trước và sau**, ghi vào `docs/verification.md` | `lighthouse` | M |
| **T6.4** | P1 | Kiểm bàn phím thủ công | — | Tab toàn trang ở 390 và 1440 | T5 | Focus luôn thấy; Esc đóng drawer/dropdown; trả focus đúng | Tay | M |
| **T6.5** | P2 | Kiểm Safari/Firefox | — | Mở thật, xác nhận không mất nội dung | T6.1 | Nội dung hiện đầy đủ, chỉ thiếu hiệu ứng | Tay | S |
| **T6.6** | P2 | Cập nhật tài liệu | `docs/design-tokens.md`, `docs/verification.md` | Thang thời lượng mới, bảng motion, kết quả đo | T6.2 | Tài liệu khớp code | Đọc chéo | S |

---

## 9. Kế hoạch kiểm thử và acceptance checklist

### 9.1 Ba tầng kiểm tra — phân biệt rõ

| Tầng | Công cụ | Kiểm được gì | **Không** kiểm được gì |
| --- | --- | --- | --- |
| **Đọc source** | `grep`, `tsc`, `eslint` | Tồn tại/không tồn tại của class, token, attribute; kiểu dữ liệu | Bố cục thật, tương phản thật, thứ tự tab |
| **Hành vi trên browser** | `npm run verify:ui` + audit script | Tràn ngang, chiều cao, `elementFromPoint`, focus, submit form, `@supports`/`@media` qua CSSOM | "Đẹp", phân cấp thị giác, cảm giác dễ chịu |
| **Mắt + bàn phím** | Người | Phân cấp, nhịp, tương phản trên ảnh, dễ đọc | Không tự động hoá được — **bắt buộc làm tay** |

> 104 kiểm tra tự động hiện có **không** chứng minh UI đẹp và **không** chứng minh
> accessibility đầy đủ. Chúng chứng minh một số tính chất cụ thể.

### 9.2 Bổ sung vào `verify:ui` (T6.2)

| Kiểm tra mới | Cách làm | Ngưỡng |
| --- | --- | --- |
| Tap target | Đo mọi `a/button/input/select` không phải link trong câu | ≥44×44 ở 390 |
| Rail không chặn | `elementFromPoint` tại 5 điểm trong hộp rail + tâm mọi control trong vùng | 0 control bị chặn; hộp rail khi đóng ≤ 56px cao |
| In | `emulateMedia({ media: 'print' })` | `transform` là `none` trên mọi `[data-reveal|parallax|entrance]` |
| Anchor active | Cuộn tới từng mục | Đúng 1 mục `aria-current="true"` |
| Ảnh lỗi | Chặn request ảnh, kiểm placeholder | Placeholder hiện, không skeleton vô hạn |
| Không tràn ngang | Giữ nguyên | 24/24 |
| Đo dài trang | `doc.scrollHeight` | `home@390` ≤ 10.500px |
| Card đồng đều | `cardSpread` | chênh ≤ 8px |

### 9.3 Acceptance checklist (nghiệm thu)

**Layout & nội dung**
- [ ] `home@390` ≤ 10.500px; mỗi section mobile ≤ 3.200px
- [ ] Không tràn ngang ở 360/390/768/1440 (24/24)
- [ ] Card tour chênh chiều cao ≤ 8px ở mọi viewport
- [ ] Bài viết ≤ 72 ký tự/dòng ở 1440
- [ ] Không còn 2 khối ảnh+chữ giống nhau liền kề cùng cấu trúc

**Motion**
- [ ] Chỉ còn 4 mốc thời lượng + 2 easing
- [ ] Không `animation-delay` cho scroll-driven
- [ ] Hero/LCP không ở trạng thái vô hình khi tải
- [ ] Pulse dừng sau 3 nhịp; sheen ≤2/trang
- [ ] Mọi scroll animation nằm trong `@supports (animation-timeline: view())` **và** `@media (prefers-reduced-motion: no-preference)`

**Accessibility**
- [ ] Tap target ≥44px cho mọi thao tác khối ở 390
- [ ] Rail không chặn click nội dung
- [ ] Tab thấy focus ở mọi phần tử tương tác; hover quan trọng có tương đương focus
- [ ] Dropdown/drawer: Esc đóng + trả focus
- [ ] Header không biến mất khi đang thao tác bàn phím
- [ ] Anchor active không tự chuyển focus, không ghi URL liên tục
- [ ] Form lỗi giữ dữ liệu; lỗi có `role="alert"`; thành công bền vững

**Reduced-motion & in**
- [ ] `prefers-reduced-motion: reduce` → mọi nội dung hiện, thao tác vẫn đủ
- [ ] Trình duyệt thiếu `animation-timeline` → nội dung hiện, chỉ mất hiệu ứng
- [ ] `@media print` → đo được `transform: none`, không mất nội dung

**Không hồi quy**
- [ ] `npm run typecheck` 0 lỗi · `npm run lint` 0 lỗi · `npm test` 110/110 · `npm run build` 42 trang
- [ ] `npm run verify:ui` ≥130/130
- [ ] URL, schema, luồng gửi yêu cầu không đổi (kiểm bằng form E2E → SMTP sink)

### 9.4 Đo hiệu năng trước/sau

Chạy `lighthouse` trên bản build production, **cùng máy, cùng điều kiện**, lưu số
thật vào `docs/verification.md`. Mục tiêu để đối chiếu (không phải kết quả):
LCP < 2.5s · CLS < 0.1 · INP < 200ms. **Không tuyên bố đạt trước khi đo.**

Bundle: thay đổi dự kiến chỉ là CSS + ~30 dòng JS trong component đã là client →
**không tăng JS bundle** (N1 dùng `IntersectionObserver` sẵn có của trình duyệt,
N2 dùng `onLoad` của `next/image`). Cần xác nhận bằng so sánh kích thước chunk
sau khi build.

---

## 10. Nội dung và ảnh cần chủ website cung cấp

Danh sách ảnh cần bổ sung, theo section. **Không** lấy ảnh website khác.

| # | Vị trí | Chủ đề | Tỉ lệ / kích thước | Crop / focal point | Alt text (mẫu) | Ưu tiên |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Hero trang chủ | Toàn cảnh vịnh Quy Nhơn hoặc Kỳ Co, nắng sớm | `4:5`, ≥1600×2000 | Chủ thể ở 1/3 trên; chừa vùng trời để đặt chữ | "Toàn cảnh vịnh Quy Nhơn nhìn từ trên cao" | **P0** |
| 2 | Tile danh mục "Quy Nhơn – Phú Yên" | Eo Gió hoặc Ghềnh Đá Đĩa | `3:2`, ≥1600×1067 | Mép biển/đá ở 1/3 dưới | "Cung đường ven biển Eo Gió" | **P0** |
| 3 | Tile danh mục "Tour Trong Nước" | Một điểm miền Bắc hoặc Tây Nguyên | `3:2`, ≥1600×1067 | Đường dẫn hoặc núi | "Ruộng bậc thang vùng cao" | P1 |
| 4–7 | 4 tile điểm đến (Quy Nhơn, Kỳ Co, Hòn Khô, Cù Lao Xanh) | Đúng địa danh | `1:1`, ≥1200×1200 | Chủ thể giữa khung | "Bãi biển Kỳ Co" … | P1 |
| 8–11 | 4 hàng vùng miền | Đại diện mỗi vùng | `1:1` (mobile) + `3:2` (desktop), ≥1200 | Chủ thể giữa | "Phố cổ Hà Nội" … | P1 |
| 12–17 | **15 tour** (mỗi tour 3–4 ảnh) | Ảnh thật của điểm đến trong lịch trình | `3:2` cho cover, `16:10` cho gallery | Theo từng điểm | "Cano ra bãi Kỳ Co" … | **P0** |
| 18 | Khối giá trị | Ảnh dọc người thật / trải nghiệm | `4:5`, ≥1200×1500 | Người ở 1/3 trên | "Du khách tại bãi biển miền Trung" | P1 |
| 19–22 | 5 bài cẩm nang (cover) + ảnh trong bài | Theo chủ đề bài | `16:9`, ≥1600×900 | — | "Chợ nổi Cái Răng buổi sớm" | P1 |
| 23 | OG mặc định khi chưa có ảnh tour | Ảnh thương hiệu có chữ | `1200×630` | — | — | P2 |

**Quy tắc ảnh (giữ nguyên từ `docs/design-tokens.md` mục 7):** ưu tiên ảnh ngang,
≥1600px cạnh dài, ánh sáng tự nhiên tông ấm, chủ thể 1/3 trên, có sự đồng ý của
người trong ảnh, không watermark/logo bên thứ ba, **không dùng ảnh AI cho địa danh
cụ thể**.

**Nội dung cần duyệt** (đang là demo): 15 tour (lịch trình, dịch vụ, lưu ý),
5 bài cẩm nang, giá tour hoặc xác nhận giữ "Liên hệ tư vấn", chính sách huỷ,
và **tên tỉnh/thành của điểm đến** sau sáp nhập. Xem `docs/CONTENT-TODO.md`.

> ⚠️ **Cảnh báo về đánh giá UI:** toàn bộ ảnh hiện tại là placeholder gradient.
> Kết luận "trang chủ nặng, nhiều khối lặp" **một phần** do placeholder bão hoà
> màu. Sau khi có ảnh thật, phải **chụp lại baseline và đánh giá lại** — không
> chốt chất lượng UI cuối cùng dựa trên placeholder.

---

## Typography — trạng thái (kiểm chứng 2026-10-14)

Phần **chữ** của Đợt 2 đã làm và kiểm chứng **trực quan + computed style**; các mục
T2.1–T2.7 (duration scale, độ đo dòng, surface phẳng, shadow, placeholder…) **vẫn
chưa làm**.

Đã làm:

- Thêm **Fraunces** (display serif, subset `vietnamese`, trục `SOFT`) cho **tiêu đề**
  (`text-display*`); **Be Vietnam Pro** giữ nguyên cho body/UI/card/form.
- Thang tiêu đề chuyển sang **fluid `clamp()`** (`--text-display-xl/lg/sm` + `--text-display`),
  weight 600, tracking nhẹ hơn, `.font-display` đặt `font-variation-settings: "SOFT" 40`.
- H1 hero, H1 trang con, H2 section, heading trong bài, h2 chính sách tour → Fraunces.

Bằng chứng: computed `font-family` của H1 = Fraunces ở 360/390/768/1440 cho VI/EN;
body/card/giá/form vẫn `Be Vietnam Pro`; `document.fonts` báo face Fraunces `loaded`;
ảnh chụp VI/EN desktop + mobile đã xem (dấu `ệ ẫ ổ ữ` đầy đủ). Đã **đo** font/word-wrap
qua Playwright. **Chưa đo CLS** (không có Lighthouse).

> ⚠️ Lưu ý bảo trì: hai lần chỉnh trước đó (`[locale]/layout.tsx`, `hero.tsx` và các
> H1 trang) từng bị bản viết lại migration i18n ghi đè làm mất `Fraunces`/`font-display`.
> Khi merge, kiểm lại class tiêu đề còn `font-display` không (xem `docs/design-tokens.md` §4).
