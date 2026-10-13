# Lộ trình admin / CMS sau MVP

MVP **không có** admin, không có dashboard, không có auth. Tài liệu này mô tả
những điểm mở rộng đã được chuẩn bị sẵn, để khi cần thì không phải viết lại UI.

## 1. Nguyên tắc

Mọi thay đổi dữ liệu sau này phải đi qua `src/lib/data/*` (repository). UI chưa
bao giờ import trực tiếp `src/content/`. Nhờ vậy:

```
Hôm nay:   UI  →  lib/data  →  content/*.ts
Sau này:   UI  →  lib/data  →  API/CMS/DB
```

Chữ ký hàm không đổi. Đây là lý do ranh giới này tồn tại ngay từ đầu, chứ không
phải để "cho đẹp kiến trúc".

## 2. Phần dùng lại được nguyên vẹn

| Thành phần | Vì sao dùng lại được |
| --- | --- |
| `domain/*` (kiểu + Zod schema) | Schema là hợp đồng. CMS phải trả về đúng shape này, hoặc có adapter chuẩn hoá |
| Toàn bộ `components/ui` | Không biết domain, không biết nguồn dữ liệu |
| Toàn bộ `features/*` | Nhận props đã qua projection (`TourCardModel`, `TravelArticle`…) |
| `lib/format.ts`, `lib/seo.ts`, `lib/json-ld.ts` | Thuần tuý |
| `lib/sanitize.ts` | Thuần tuý, dùng lại được cho kênh mới |
| `server/email/*` | Chỉ biết `ContactLead`, không biết lead lấy từ đâu |
| Toàn bộ `app/` routes | Không đổi khi nguồn dữ liệu đổi |

## 3. Phần cần thêm hoặc thay

| Việc | File | Ghi chú |
| --- | --- | --- |
| Adapter nguồn dữ liệu | thêm `lib/data/adapters/*` | Chuyển JSON từ CMS → shape trong `domain/` |
| Validate dữ liệu từ nguồn ngoài | dùng lại schema trong `domain/` | **Không tin** dữ liệu từ CMS: parse bằng Zod trước khi dùng |
| Cache + revalidate | `lib/data/*` | Bọc hàm đọc bằng `'use cache'` + `cacheTag`, rồi gọi `revalidateTag` khi nội dung đổi |
| Auth nhân viên | `proxy.ts` + route group `app/(admin)/` | Cần trước khi mở admin |
| Phân quyền | — | Vai trò tối thiểu: `editor` (nội dung) và `sales` (lead). Tách quyền vì mục đích khác nhau |
| Audit | bảng `audit_log` | Ai đổi gì, lúc nào. Cần cho nội dung công khai |

## 4. Các bước chuyển từ file sang database

Thực hiện theo thứ tự, mỗi bước đều deploy được và không làm hỏng URL:

1. **Tạo bảng theo đúng shape của `domain/`.** Field có `.default()` trong Zod
   tương ứng cột có default. Quan hệ nhiều-nhiều (`categoryIds`, `destinationIds`)
   thành bảng nối, **không** lưu mảng trong một cột.
2. **Import dữ liệu** từ `content/*.ts` bằng một script một lần. Vì dữ liệu đã
   qua Zod, có thể `parse` rồi `insert` trực tiếp.
3. **Đổi `lib/data/*` sang đọc DB**, giữ nguyên chữ ký hàm. UI không đổi một dòng.
4. **Giữ validation như cũ.** Zod schema ở `domain/` trở thành lớp bảo vệ khi
   đọc từ DB, phòng trường hợp migration hoặc sửa tay làm dữ liệu lệch.
5. **Xoá dần `content/*.ts`** sau khi xác nhận dữ liệu đã khớp, nhưng giữ lại
   như nguồn seed cho môi trường dev/test.

## 5. Giữ URL, slug, SEO và ảnh ổn định

Đây là rủi ro lớn nhất của mọi lần chuyển CMS. Quy tắc bắt buộc:

- **Slug là bất biến.** `domain/*` đã ghi rõ: đổi slug sẽ làm hỏng link và SEO.
  Nếu buộc phải đổi, tạo bản ghi redirect 301 từ slug cũ, và **giữ** slug cũ
  trong bảng redirect vĩnh viễn.
- **`id` không tái sử dụng** cho bản ghi khác.
- **Đường dẫn danh mục là hằng số** (`/tour-trong-nuoc/tour-mien-bac`), không
  sinh tự động từ tên.
- **Ảnh**: khi chuyển sang CMS, giữ nguyên đường dẫn `/images/…` hoặc chuyển sang
  CDN nhưng cập nhật `next.config.ts` `images.remotePatterns` **theo đúng host,
  path** (không dùng wildcard rộng).
- **JSON-LD**: các builder trong `lib/json-ld.ts` sinh dữ liệu có cấu trúc từ nội
  dung thật. Sau khi chuyển CMS phải kiểm tra lại rằng không phát sinh
  `aggregateRating`/`review` giả.
- **`sitemap.ts`**: `lastModified` lấy từ dữ liệu nội dung. Sau khi chuyển CMS,
  trỏ vào `updatedAt` của bản ghi thật.

## 6. Cập nhật cache sau khi nội dung thay đổi

Với Cache Components:

```ts
// lib/data/tours.ts (sau khi chuyển CMS)
export async function getTourBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("tour", `tour:${slug}`);
  return parseTour(await cms.getTour(slug));
}
```

Khi admin lưu nội dung → gọi `revalidateTag("tour")` và
`revalidateTag(\`tour:${slug}\`)` trong route handler của admin. URL không đổi,
nên không cần `revalidatePath` cho từng trang.

## 7. Quản lý lead

Khi bổ sung bảng lead, **thứ tự quan trọng**: lưu lead vào DB **trước**, rồi mới
gửi email. Nếu gửi email thất bại, lead vẫn còn và có thể retry.

Cần có:

- Trạng thái xử lý: `new → contacted → quoted → won / lost`.
- Ghi chú nội bộ + lịch sử liên hệ.
- Retry gửi email với backoff cho lead ở trạng thái `new` mà lần gửi đầu thất bại.
- **Không** hiển thị toàn bộ số điện thoại/email trong log hay trong màn hình
  danh sách dùng chung. Che một phần và chỉ hiện đầy đủ khi mở chi tiết.

## 8. Những gì KHÔNG đưa vào

- Không dựng dashboard giả, không thêm màn hình quản trị "để đó".
- Không thêm auth khi chưa có nội dung thật cần bảo vệ.
- Không thêm thanh toán/đặt tour trực tuyến nếu chưa có quy trình xác nhận và
  chính sách hoàn tiền được duyệt. Website hiện nói rõ: chỉ tiếp nhận yêu cầu
  tư vấn.
- Không thêm đăng ký nhận tin marketing khi chưa có cơ chế huỷ đăng ký và hậu
  thuẫn pháp lý.
