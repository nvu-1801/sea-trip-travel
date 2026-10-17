# Kế hoạch cải thiện khu quản trị (đợt 2)

Sau khi triển khai `feat/tour-admin`, tôi rà lại toàn bộ luồng và tìm được **9 vấn đề
thật**. Tài liệu này ghi: mức độ, nguyên nhân, cách sửa và tiêu chí nghiệm thu.

Nhánh thực hiện: `feat/tour-admin` (tiếp). Baseline: `de9fc2f`.

| # | Mức | Vấn đề | Ảnh hưởng |
| --- | --- | --- | --- |
| B1 | Cao | `getSiteSettings(locale)` đọc `settings[locale]`, nhưng contact/social/home chỉ được ghi với `locale="vi"` | Trang **tiếng Anh dùng giá trị mặc định trong code**, bỏ qua hotline/email/social/nổi bật mà chủ site đã sửa |
| B2 | Cao (mất dữ liệu) | `importContent()` luôn ghi `status:"published"`, `featured:false`, `sortOrder:index` | Chạy lại `db:import`/`db:setup` **reset** trạng thái xuất bản/ẩn/ghim/thứ tự do admin đặt |
| B3 | Cao (mất dữ liệu) | `buildTour()` đặt `priceFrom = null` khi tour không có bảng giá | Sửa một tour có `priceFrom` nhưng không có gói giá sẽ **xoá giá** thành “Liên hệ tư vấn” |
| B4 | Vừa | `processUpload()` dùng lại bản ghi theo `sha256` kể cả khi đã xoá mềm | Upload lại ảnh từng bị xoá → báo thành công nhưng ảnh **không xuất hiện** trong thư viện |
| B5 | Vừa (toàn vẹn) | Không còn kiểm tra `itinerary.length === duration.days` | Lưu được tour 3 ngày với 2 ngày lịch trình → trang chi tiết thiếu/ lệch ngày |
| B6 | Vừa (UX) | Không tự sinh `slug` từ tên | Người dùng phải tự gõ slug mới lưu được tour/bài viết |
| B7 | Thấp (hiệu năng) | Trang danh sách tour gọi `listTourRecords()` 4 lần + `listTrashedTours()` 2 lần, mỗi lần nạp cả children | Tải danh sách chậm dần khi dữ liệu lớn |
| B8 | Thiếu | Không có thùng rác cho **lead**; nút xoá chỉ có ở trang danh sách, không có ở trang sửa; không có màn hình thùng rác tổng hợp | Không thể khôi phục lead đã xoá; xoá mềm khó thấy |
| B9 | Thấp (UX) | Ở chế độ `remote`, `/admin` hiện form đăng nhập thay vì thông báo “không khả dụng” | Gây hiểu nhầm là sai mật khẩu |

---

## 1. Cách sửa

### B1 — Settings dùng chung cho mọi locale
Contact/social/nổi bật **không phụ thuộc ngôn ngữ**. Chỉ `hero` mới theo locale.

- `loadSettingsByLocale()` giữ nguyên (đọc thô).
- `getSiteSettings(locale)` hợp nhất: `hero` lấy `settings[locale].hero`, các phần còn
  lại lấy `settings.vi` (nguồn duy nhất) rồi mới tới mặc định trong code.
- Trang `/admin/settings` giữ 2 form hero (VI/EN) + 1 form contact + 1 form social +
  1 form nổi bật, tất cả ghi `locale="vi"` (đúng như hiện tại) — chỉ cách đọc thay đổi.

### B2 — Import không phá trạng thái do admin đặt
`importContent()` giữ **nguyên trạng thái/ghim/thứ tự** của bản ghi đã tồn tại; chỉ
áp giá trị mặc định khi **tạo mới**. Bản ghi đã ở thùng rác cũng được giữ nguyên
(không tự khôi phục).

### B3 — Không mất giá khi sửa tour
Trong `saveTourAction`: nếu `pricingOptions` rỗng **và** bản ghi cũ có `priceFrom`,
giữ lại giá cũ thay vì đặt `null`. Chỉ trở thành “Liên hệ tư vấn” khi người dùng thực
sự xoá hết gói giá của một tour **vốn không có** `priceFrom`.

### B4 — Upload lại ảnh đã xoá
Nếu bản ghi theo `sha256` đang ở thùng rác → **khôi phục** nó (và cập nhật alt nếu
có), trả về `restored: true` để form báo đúng.

### B5 — Kiểm tra lịch trình khớp thời lượng
`saveTourAction` trả lỗi rõ ràng nếu `itinerary.length !== durationDays`
(“Cần đúng N ngày lịch trình…”). Nút “Thêm ngày” đã có sẵn nên người dùng sửa được ngay.

### B6 — Tự sinh slug
Khi slug trống, sinh từ `title` (bỏ dấu, `đ→d`, gạch ngang). Áp dụng cho cả tour và
bài viết, cả khi tạo mới và khi sửa (nếu người dùng xoá trắng).

### B7 — Đếm bằng một truy vấn
`countToursByState()` đã có; thêm `countTrashedTours()` / `countTrashedArticles()` và
dùng chúng cho bộ đếm, thay vì nạp toàn bộ danh sách để đếm.

### B8 — Xoá mềm & thùng rác cho mọi loại nội dung
- Thêm `deleted_at` cho **lead** (đã có cột từ migration 0001) + `softDeleteLead`,
  `restoreLead`, `listTrashedLeads`, `countTrashedLeads`.
- Trang **`/admin/trash`** (mục “Thùng rác” trên sidebar) liệt kê tour (kèm mã ST),
  bài viết, ảnh, lead đã xoá mềm, mỗi dòng có **Khôi phục**.
- Thêm nút **Xoá** (có xác nhận) trên trang sửa tour và trang chi tiết lead.
- Danh sách lead có liên kết “Thùng rác (N)”.

### B9 — Thông báo đúng khi admin bị tắt
Layout `/admin` render màn hình “không khả dụng” khi `isAdminEnabled()` sai, thay vì
form đăng nhập.

---

## 2. Tiêu chí nghiệm thu

| # | Kiểm chứng |
| --- | --- |
| B1 | Sửa hotline trong admin → cả `/` và `/en` hiển thị hotline mới |
| B2 | Đặt 1 tour `hidden` + `featured` → chạy `npm run db:import` → trạng thái/ghim **không đổi**; bản ghi mới vẫn `published` |
| B3 | Tour có `priceFrom` nhưng không có gói giá → mở form, Lưu → giá **giữ nguyên** |
| B4 | Upload ảnh → xoá ảnh → upload lại cùng tệp → ảnh **xuất hiện lại** trong thư viện, có thông báo khôi phục |
| B5 | Tour 3 ngày, xoá 1 ngày lịch trình → Lưu → báo lỗi rõ, không ghi DB |
| B6 | Tạo tour mới chỉ nhập tên + để trống slug → lưu được với slug sinh tự động |
| B7 | Danh sách tour chỉ chạy truy vấn đếm, không nạp lặp danh sách |
| B8 | Xoá tour/bài viết/ảnh/lead → xuất hiện ở `/admin/trash` → Khôi phục → trở lại |
| B9 | `ADMIN_ENABLED=false` → `/admin` hiện thông báo, không hiện form |
| Chung | `lint` / `typecheck` / `test` / `build` xanh; `verify:admin` 26/26 |

---

## 3. Việc chưa làm trong đợt này

Xoá vĩnh viễn (purge) khỏi thùng rác, phân trang server-side cho danh sách rất lớn,
quản lý danh mục/điểm đến trong admin, nhiều tài khoản, object storage ngoài.

---

## 4. Kết quả triển khai (17/10/2026)

Tất cả mục B1–B9 đã sửa. Chi tiết kiểm chứng: `docs/ADMIN-VERIFICATION.md` §6.

| # | Đã sửa | File chính |
| --- | --- | --- |
| B1 | `getSiteSettings` lấy contact/social/nổi bật từ `vi` (nguồn duy nhất); hero vẫn theo locale. Đồng thời **toàn bộ chrome đọc settings thay vì `siteConfig`**: header, mobile drawer, floating contact, footer, khối tư vấn, form, thanh tư vấn mobile, trang Liên hệ, trang Chính sách bảo mật, và **JSON-LD** (`telephone`/`email`/`sameAs`) | `lib/data/settings.ts`, `components/layout/*`, `features/leads/*`, `features/tours/*`, `app/[locale]/*`, `lib/json-ld.ts` |
| B2 | Import giữ `status`/`featured`/`sort_order`/`deleted_at` của bản ghi đã có; chỉ tạo mới mới nhận mặc định | `server/db/import-content.ts` |
| B3 | Giá `priceFrom` được giữ khi tour không có bảng giá | `server/admin/actions.ts` |
| B4 | Upload lại ảnh đã xoá mềm sẽ **khôi phục** bản ghi và báo `restored: true` | `server/media/service.ts` |
| B5 | Chặn lưu khi số ngày lịch trình ≠ thời lượng, kèm thông báo cụ thể | `server/admin/actions.ts` |
| B6 | Slug để trống sẽ tự sinh từ tiêu đề (schema cho phép slug rỗng) | `domain/admin.ts`, `server/admin/actions.ts` |
| B7 | Bộ đếm dùng `countToursByState`/`countTrashed*` thay vì nạp danh sách | `server/repo/*`, trang danh sách |
| B8 | Thêm `deleted_at` cho lead + `softDeleteLead`/`restoreLead`; **trang `/admin/trash` tổng hợp** (tour kèm mã ST, bài viết, ảnh, lead) có Khôi phục; nút Xoá trên trang sửa tour/bài viết và trang chi tiết lead; mục “Thùng rác” trên sidebar | `server/repo/leads.ts`, `server/admin/actions.ts`, `app/(admin)/.../trash/`, `components/admin/nav.tsx` |
| B9 | `/admin` hiện thông báo “không khả dụng” khi admin bị tắt | `app/(admin)/admin/(dashboard)/layout.tsx` |

### Ghi chú còn lại

- `PostalAddress` trong JSON-LD vẫn dùng các thành phần địa chỉ có cấu trúc trong
  `config/site.ts`; phần `telephone`/`email`/`sameAs` đã theo settings. Nếu chủ site
  đổi **địa chỉ**, cần bổ sung trường địa chỉ có cấu trúc trong admin (đợt sau).
- Chưa có purge vĩnh viễn: thùng rác giữ dữ liệu cho tới khi có yêu cầu riêng.

