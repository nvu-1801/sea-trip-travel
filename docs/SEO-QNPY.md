# SEO — Quy Nhơn – Phú Yên & biển miền Trung

## Route map (canonical, Vietnamese)

| Intent | URL |
| --- | --- |
| Thương hiệu + du lịch Quy Nhơn Phú Yên | `/` |
| Tổng hợp tuyến, chọn theo thời lượng | `/tour-quy-nhon-phu-yen` |
| Tour 1 ngày | `/tour-quy-nhon-phu-yen/tour-quy-nhon-1-ngay` |
| Tour nhiều ngày | `/tour-quy-nhon-phu-yen/tour-quy-nhon-dai-ngay` |
| Tour cụ thể | `/tour/ky-co-eo-gio-hon-kho-1-ngay`, `/tour/quy-nhon-cu-lao-xanh-1-ngay`, `/tour/quy-nhon-hon-kho-lan-bien-1-ngay`, `/tour/quy-nhon-phu-yen-ghenh-da-dia-1-ngay` |
| Kinh nghiệm / mùa đẹp / lịch trình | `/cam-nang-du-lich/kinh-nghiem-du-lich-quy-nhon-phu-yen`, `/cam-nang-du-lich/thoi-diem-dep-nhat-de-di-quy-nhon` |
| Biển miền Trung | `/tour-trong-nuoc/tour-mien-trung` |

Không tạo thêm URL cho bộ lọc, tìm kiếm hoặc biến thể từ khóa. `/tim-tour` là `noindex, follow`.

## Metadata

- Home: `settings.seo` trong **Website & footer → SEO** (VI/EN). Có default trong `src/content/seo.ts`; DB cũ không có trường này vẫn đọc được nhờ merge default.
- Category: `categories.seo` (CMS) → fallback `CATEGORY_SEO` theo category id.
- Tour: `tours.seo` (CMS) → fallback `TOUR_SEO` theo slug.
- Article: `articles.seo` (CMS) hoặc title/excerpt hiện có.
- Title page dùng `%s | SEA TRIP TRAVEL`; home dùng absolute title vì đã có brand.

## Áp dụng cho DB production (không chạy trong CI)

Script chỉ điền field đang trống, không ghi đè title/description chủ website đã sửa.

```bash
# 1. Xem thay đổi, không ghi DB
npm run seo:apply

# 2. Lưu thành bản nháp (public giữ nguyên)
npm run seo:apply -- --apply

# 3. Xuất bản sau khi review trong Studio
npm run seo:apply -- --apply --publish
```

Chạy với `CMS_ENABLED=1` và `CMS_DB_PATH` trỏ đúng DB. Script cũng thay copy hero cũ bằng copy mới **chỉ khi** giá trị hiện tại khớp chính xác bản cũ; copy đã được chủ website sửa sẽ được giữ nguyên. Script idempotent: chạy lại báo `0 change(s)`.

Sau khi áp dụng, mở Studio → Tour/Danh mục → kiểm tra nhóm **SEO** và xuất bản nếu cần. Không sửa slug đã phát hành.

## Hreflang / sitemap

- Chỉ phát hreflang `en` khi bản dịch EN đã được duyệt và trang EN indexable.
- Trang EN chưa duyệt là `noindex, nofollow`, không nằm trong sitemap và không được quảng bá qua hreflang.
- Sitemap chỉ chứa canonical VI/EN hợp lệ; cặp hợp lệ có `x-default` trỏ bản VI.
- `robots.txt` render động để dùng `SITE_URL` runtime, không đóng băng `localhost`.

## Kiểm tra

```bash
npm run build
npm run verify:seo
```

`verify:seo` kiểm tra HTML thô (không cần hydration): title, description, canonical, hreflang, robots, sitemap, 404 và JSON-LD.
