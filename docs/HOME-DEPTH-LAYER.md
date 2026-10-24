# Home depth layer — CSS 3D, masked headlines, one shader

Ngày: 24/10/2026. Phạm vi: **trang chủ** (`/[locale]`). Không thêm dependency.

Tài liệu này mô tả lớp hiệu ứng đã triển khai theo `docs/LANDING-3D-MOTION-PLAN.md`,
dựa trên kỹ thuật đọc từ [Mengto/threeui](https://github.com/Mengto/threeui)
(shader toàn màn hình, masked word reveal, depth theo scroll, lifecycle của canvas).
Không có asset, font hay ảnh nào của ThreeUI được sử dụng — chỉ học cách làm.

## 1. Đã có gì

| Hiệu ứng | Ở đâu | Cơ chế |
| --- | --- | --- |
| Chân trời biển sống động | Hero (carousel tối, collage sáng) | 1 canvas WebGL, 1 fragment shader, 1 quad |
| Tiêu đề tách từ, trượt lên khỏi mask | Explore, Regions, JourneyStory | `MaskedHeading`, `IntersectionObserver` + CSS mask |
| Thẻ lùi vào theo trục Z | Điểm đến, vùng miền, thẻ thời lượng | `DepthStage` + `DepthItem`, `animation-timeline: view()` |
| Postcard vùng miền quạt vào + ảnh lắng + chữ nổi lên | Regions | 4 `li[data-depth]` lệch hướng/độ xoay, ảnh `scale(1.12→1)`, index và copy có timeline riêng |
| Nghiêng theo con trỏ ≤ 3° | Ảnh điểm đến (desktop) | `TiltCard`, rAF + CSS custom properties |

## 2. File

Mới:

- `src/lib/motion.tsx` — `motionAllowed()`, `subscribeMotion()`, `useMotionAllowed()`
  (`useSyncExternalStore`; server snapshot luôn `false`).
- `src/components/motion/word-reveal.tsx` — `MaskedHeading`.
- `src/components/motion/depth-stage.tsx` — `DepthStage`, `DepthItem`.
- `src/components/motion/tilt-card.tsx` — `TiltCard`.
- `src/features/home/horizon-canvas.tsx` — canvas + shader + lifecycle.
- `src/features/home/home-motion.css` — toàn bộ CSS mới, có gate.
- `scripts/verify-depth.mjs` — 30 kiểm tra trình duyệt.

Sửa: `src/app/[locale]/page.tsx` (import CSS), `hero-carousel.tsx`,
`collage-hero.tsx`, `explore-section.tsx`, `regions-section.tsx`,
`journey-story.tsx`, `scripts/verify-ui.mjs` (audit selector),
`scripts/preflight.mjs`, `.github/workflows/ci-deploy.yml`, `package.json`.

## 3. Ba lớp gate (đừng bỏ khi sửa)

1. **CSS**: mọi hiệu ứng theo scroll nằm trong
   `@supports (animation-timeline: view())` + `@media (prefers-reduced-motion: no-preference)`.
   `verify:ui` mục 3 quét rule và fail nếu thiếu một trong hai.
2. **JS**: `motionAllowed()` = không reduced-motion, tab đang hiện, và
   `html[data-motion-paused] !== "true"`. `MaskedHeading` chỉ ghi `data-words`
   sau khi mount và chỉ khi được phép, nên noscript/print/reduced-motion thấy chữ tĩnh.
3. **Canvas**: dừng rAF khi hero ra khỏi viewport, tab ẩn, hoặc pause. DPR ≤ 1.75,
   ngân sách 2,4 triệu pixel, dispose đầy đủ, mất context → `data-webgl="fallback"`.

Không set `opacity: 0` cho bất kỳ phần tử nào trong markup. Trạng thái nghỉ luôn là
trạng thái cuối; chuyển động chỉ đi *về* đó.

## 4. Kiểm tra

```sh
npm run build
npm run verify:ui       # 195 check, gồm audit gate CSS
npm run verify:depth    # 30 check riêng cho lớp 3D
npm run verify:preflight -- --full
```

`verify:depth` kiểm tra: canvas tồn tại và có kích thước thật, tạm dừng khi ra khỏi
viewport, heading tách từ + `aria-label` + trạng thái cuối, depth stage/level,
tilt trong ±3° và reset, reduced-motion làm phẳng toàn bộ, pause switch, không tràn
ngang 360/390/1440, không lỗi console/hydration. Ảnh chụp nằm trong
`verify-screenshots/motion-home-*.png`.

CI chạy `npm run verify:depth` ngay sau `verify:ui`.

## 5. Quyết định & đánh đổi

- **Không thêm three.js/GSAP**: một quad shader tự viết đủ cho chân trời; gallery
  dùng CSS 3D thật (`perspective` + `translateZ`/`rotateY`), không cần engine.
- **Một canvas duy nhất** trên trang. Thêm canvas thứ hai phải có lý do và ngân sách.
- **Không dùng lớp fixed near-plane** như ThreeUI: `.home-editorial` có
  `clip-path: inset(0)` nên `position: fixed` bên trong đổi containing block.
  Lớp tiền cảnh dùng absolute + scroll timeline.
- **`overflow-x: clip` trên `[data-depth-stage]`** vì thẻ `rotateY` chiếu rộng hơn
  hộp layout vài pixel; không có nó trang tràn ngang ~40px ở 1440.
- **Scrim của postcard vùng miền dùng mực trung tính** (`--region-ink`), không dùng
  `--theme-dark`: ở các theme như `pink`, `--theme-dark` là màu mận nên phủ lên ảnh
  làm cả tấm ảnh bị hồng. Hai dải ngắn ở đỉnh và đáy giữ chữ trắng đọc được, phần
  giữa ảnh không bị nhuộm màu.
- Reduced motion giữ canvas ở một khung tĩnh (không ẩn), để hero vẫn có chiều sâu.
