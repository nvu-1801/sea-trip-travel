# I18N_CONTENT_REVIEW — Bản dịch tiếng Anh cần duyệt

Tất cả bản dịch tiếng Anh hiện có `translationStatus: "draft"` (do agent tạo, chưa
được chủ website duyệt). Vì vậy mọi URL `/en/...` đều **noindex** và **không** nằm
trong `sitemap.xml` cho tới khi được duyệt. Xem `docs/I18N_GUIDE.md` mục 4 để bật
index.

Nguồn: `src/content/locales/en/{tours,categories,destinations,articles}.ts`.

## Cách duyệt một bản ghi

1. Đối chiếu bản dịch với bản tiếng Việt (`src/content/…`).
2. Sửa chữ nếu cần (giữ nguyên số liệu, địa danh, giá, điều kiện).
3. Đổi `translationStatus: "draft"` → `"reviewed"`.
4. Chạy lại `npm run build`.

## Bản dịch cần duyệt

### Tours (15)
`tour_qn_ky_co_eo_gio_1n` · `tour_qn_hon_kho_1n` · `tour_qn_cu_lao_xanh_1n` ·
`tour_qn_py_3n2d` · `tour_qn_py_4n3d` · `tour_qn_py_5n4d` · `tour_mb_hn_hl_4n3d` ·
`tour_mb_sapa_3n2d` · `tour_mb_ninh_binh_2n1d` · `tour_mt_dn_ha_hue_4n3d` ·
`tour_mt_di_san_5n4d` · `tour_mn_phu_quoc_4n3d` · `tour_mn_mien_tay_3n2d` ·
`tour_tn_da_lat_4n3d` · `tour_tn_buon_ma_thuot_3n2d`

Trường đã dịch: title, summary, highlights, overview, itinerary (title/summary/
activities/meals/accommodation/places), included, excluded, notes, tags,
departurePoints, priceNote, imageAlts, seo.

### Danh mục (8)
`cat_quy_nhon_phu_yen` · `cat_quy_nhon_1_ngay` · `cat_quy_nhon_dai_ngay` ·
`cat_tour_trong_nuoc` · `cat_mien_bac` · `cat_mien_trung` · `cat_mien_nam` ·
`cat_tay_nguyen`

Trường đã dịch: name, tagline, description, seo.

### Điểm đến (19)
`dest_quy_nhon` · `dest_ky_co_eo_gio` · `dest_hon_kho` · `dest_cu_lao_xanh` ·
`dest_ghenh_da_dia` · `dest_bai_xep` · `dest_mui_dien` · `dest_dam_o_loan` ·
`dest_ha_noi` · `dest_vinh_ha_long` · `dest_sapa` · `dest_ninh_binh` ·
`dest_da_nang` · `dest_hoi_an` · `dest_hue` · `dest_phu_quoc` · `dest_mien_tay` ·
`dest_da_lat` · `dest_buon_ma_thuot`

Trường đã dịch: name, province, summary, imageAlt.

### Bài viết (5)
`art_kinh_nghiem_qn_py` · `art_thoi_diem_qn` · `art_an_gi_o_qn` ·
`art_di_chuyen_qn` · `art_ghenh_da_dia_bai_xep`

Trường đã dịch: title, excerpt, tags, body (theo vị trí block), coverAlt, seo.

## Trường hợp đặc biệt cần người duyệt

- **Chính sách bảo mật (`/en/chinh-sach-bao-mat`)**: nội dung pháp lý chỉ dịch
  theo bản nguồn. Bản tiếng Anh hiện hiển thị bản tiếng Việt kèm banner “Bản dịch
  chưa hoàn tất”, **không index**, cho tới khi chủ website cung cấp và duyệt bản
  dịch chính thức.
- **`tour_mt_di_san_5n4d`**: bản tiếng Việt có nhắc Quảng Bình trong phần tóm tắt
  nhưng lịch trình không đi Quảng Bình. Bản dịch giữ nguyên bản nguồn; đây là điểm
  không nhất quán của nội dung gốc, cần chủ website kiểm lại.

## Bảo toàn dữ kiện

- Không thêm dịch vụ, cam kết, đánh giá, giải thưởng hay thành tích nào.
- Giữ nguyên tên thương hiệu “SEA TRIP TRAVEL”.
- Giữ nguyên số ngày/đêm, giá (tất cả `priceFrom` vẫn là `null` → hiển thị
  “Liên hệ tư vấn”/“Contact us for pricing”), và mọi điều kiện.
- Trạng thái `contentStatus: "demo"` của nội dung nguồn được giữ nguyên.
