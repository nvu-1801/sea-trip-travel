# Giao diện (themes)

Website landing page có thể đổi bộ màu mà không sửa component.

## Cách hoạt động

- Mỗi theme là **một entry** trong `src/config/themes.ts`.
- Entry chứa `id`, `label`, `description`, `swatch` và `vars` — toàn bộ custom
  properties của design system (`--color-*`, `--theme-*`).
- `src/app/[locale]/layout.tsx` đọc theme đã xuất bản từ CMS settings và gắn
  `data-theme` + `style={vars}` lên `<html>`.
- Studio → **Giao diện** dùng đúng object `vars` đó cho khung xem trước, nên
  preview và website không thể lệch màu. Khung preview cũng vẽ lại watermark
  "SEA TRIP" của trang chủ, để thấy ngay `--theme-wordmark` đổi theo theme.
- Theme được lưu trong collection `theme` (một record `id: "site"`), tách khỏi
  `settings` để xuất bản theme không kéo theo các thay đổi hotline/footer đang
  nháp. Record theme có revision và luồng **Lưu nháp / Xuất bản** riêng.
  Chỉ theme đã xuất bản mới lên website.

## Thêm theme mới

Ví dụ thêm theme Trung thu hoặc Tết:

```ts
// src/config/themes.ts
const midAutumn: ThemeVars = {
  "--color-background": "#fff8ef",
  "--color-surface": "#fffdf8",
  // … copy đủ bộ token từ một theme có sẵn rồi đổi màu
};

export const THEMES = [
  // …
  {
    id: "mid-autumn",
    label: "Trung thu",
    description: "Vàng trăng, cam đào và kem ấm.",
    tag: "Theo mùa",
    swatch: ["#fff8ef", "#a65b1f", "#d4a23a", "#4a2a16"],
    vars: midAutumn,
  },
];
```

Sau đó thêm `"mid-autumn"` vào `THEME_IDS`. Không cần sửa component, layout hay
CSS — miễn là component dùng token chung (`bg-background`, `text-primary-strong`,
`var(--color-surface)`…). Theme Tết đã có sẵn làm mẫu.

## Quy tắc thiết kế

- Giữ `foreground` / `background`, `foreground-muted` / `background`,
  `foreground-subtle` / `surface-sunken`, `white` / `primary-strong` và
  `theme-on-dark` / `theme-dark` đạt **≥ 4.5:1**.
- `--theme-dark`, `--theme-dark-2`, `--theme-on-dark` điều khiển hero, section
  tối, ảnh destination và planning card.
- `--theme-wordmark` là màu watermark "SEA TRIP" ở nền trang chủ; khung xem
  trước trong Studio → Giao diện dùng cùng token này nên màu watermark đổi
  ngay khi chọn theme.
- Logo là file ảnh, không đổi theo theme.
- Test `tests/themes.test.ts` kiểm tra đủ token và contrast của mọi theme; thêm
  theme mới là test tự động chạy theo.

## Theme hiện có

| Id | Tên | Ghi chú |
| --- | --- | --- |
| `current` | Hiện tại | Rose-ivory + espresso plum + champagne gold |
| `pink` | Hồng | Nền hồng phấn như phiên bản trước |
| `ocean` | Đại dương | Xanh biển, trắng sứ, cát vàng |
| `nature` | Thiên nhiên | Xanh lá, kem, mật ong |
| `sunset` | Hoàng hôn | Cam đào, cát ấm, gold |
| `tet` | Tết | Đỏ son, vàng kim — mẫu theme theo mùa |
