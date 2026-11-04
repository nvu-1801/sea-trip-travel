# Nhập dữ liệu khách sạn (draft)

## Vì sao không cào ảnh/giá từ website khác

Ảnh, mô tả, đánh giá và giá trên trang OTA/đối thủ thuộc quyền của họ và thay đổi liên tục. Dán chúng vào website của mình là vi phạm bản quyền và tạo ra giá sai cho khách. Vì vậy không có lệnh nào tải ảnh, mô tả hay giá từ Booking/Agoda/website khách sạn.

Cách đúng: dùng dữ liệu bạn có quyền — ảnh do khách sạn cung cấp, bảng giá đối tác gửi, hoặc file bạn tự nhập. Công cụ dưới đây nhập file đó thành **bản nháp** để rà lại trước khi xuất bản. Khi cần dữ liệu demo để dựng giao diện, dùng script lấy từ nguồn mở ở mục kế tiếp.

## Chạy

```powershell
$env:HOTELS_IMPORT_OK="1"
npm run hotels:import -- scripts/hotels/quynhon-demo.json
# hoặc trỏ database local riêng
$env:HOTELS_IMPORT_OK="1"
npm run hotels:import -- data/khach-san.json --db data/local-hotels.sqlite
```

- Luôn tạo/sửa **bản nháp** với `contentStatus: "demo"`.
- Không có cờ publish; `--publish` bị từ chối.
- Chạy lại cùng file sẽ cập nhật bản nháp theo `slug`/`id` thay vì nhân đôi.
- File mẫu `scripts/hotels/quynhon-demo.json` dùng ảnh có sẵn của website và giá demo, tên có chữ “Demo”.

## Dựng dữ liệu demo từ nguồn mở

```powershell
node scripts/hotels/scrape-quynhon.mjs
node scripts/hotels/scrape-quynhon.mjs --limit 6 --out data/khach-san.json
```

- Tên, địa chỉ, loại hình: OpenStreetMap qua Overpass (ODbL) trong bbox Quy Nhơn. Chỉ dùng dữ kiện, không chép mô tả của ai.
- Ảnh: Openverse, lọc CC0 / public domain, nén WebP vào `public/images/hotels/<slug>/`. Nguồn từng ảnh ghi ở `public/images/hotels/CREDITS.md`.
- Giá, tiện ích, hạng sao: dải demo, ghi rõ trong `policies` là dữ liệu chưa xác nhận.
- Kết quả `data/khach-san-quynhon.json` (đã gitignore) rồi nhập bằng lệnh ở trên. Vẫn là **bản nháp**: mở Studio → Khách sạn để sửa rồi xuất bản.

## Định dạng file

```json
{
  "hotels": [
    {
      "slug": "ten-khach-san",
      "name": "Tên khách sạn",
      "province": "Bình Định",
      "address": "Địa chỉ",
      "lodgingType": "resort | hotel | homestay | villa | apartment",
      "starRating": 4,
      "starBasis": "Theo công bố của khách sạn",
      "summary": "Một đoạn ngắn",
      "description": ["Đoạn 1", "Đoạn 2"],
      "amenities": ["Hồ bơi", "Ăn sáng"],
      "images": [{ "src": "/images/hero/blue-bay.webp", "alt": "Mô tả ảnh" }],
      "checkInTime": "14:00",
      "checkOutTime": "12:00",
      "policies": ["Chính sách đã xác nhận"],
      "roomMode": "on_request | manual_daily",
      "order": 1,
      "rooms": [
        {
          "name": "Deluxe hướng biển",
          "capacityAdults": 2,
          "capacityChildren": 1,
          "maxOccupancy": 3,
          "rates": [
            { "kind": "base", "amount": 1500000, "includesBreakfast": true },
            { "kind": "weekday", "weekdays": [5, 6], "amount": 1800000 },
            {
              "kind": "date_range",
              "startDate": "2027-04-28",
              "endDate": "2027-05-03",
              "amount": 2400000
            }
          ]
        }
      ],
      "availabilityOffsets": [{ "days": 30, "rooms": 5 }],
      "tourLinks": [
        {
          "tourSlug": "quy-nhon-phu-yen-3-ngay-2-dem",
          "relation": "additional",
          "condition": "Báo giá lưu trú riêng"
        }
      ]
    }
  ]
}
```

Ghi chú:

- `rates`: `kind` là `base` (một mức), `weekday` (kèm `weekdays`, 0 = Thứ Hai … 6 = Chủ Nhật) hoặc `date_range` (kèm `startDate`/`endDate`, gồm cả đêm cuối). Ưu tiên: khoảng ngày > theo thứ > cơ bản.
- `availabilityOffsets`: số ngày kể từ hôm chạy lệnh; dùng để demo lịch mà không bị ngày cũ.
- `images[].src` chỉ nhận file nội bộ bắt đầu bằng `/images/` (phải tồn tại trong `public/`) hoặc `/api/media/` (ảnh đã tải trong Studio). Ảnh `http(s)://` bị từ chối.
- `tourLinks` chỉ nhận tour đang có; quan hệ `included` nghĩa là tour đã trả tiền phòng.
- Slug đã có trên hệ thống thì giữ nguyên slug đó (theo quy tắc slug bất biến).

## Sau khi nhập

1. Mở **Studio → Khách sạn**, sửa nội dung/ảnh/giá bằng dữ liệu thật.
2. Kiểm tra **Xem trước**.
3. Bật module và xuất bản khi đã đủ điều kiện.

## Đưa danh mục đã duyệt lên production

Máy chủ không có `tsx` và không có bundle Studio, nên danh mục đi theo một file
seed đã kiểm tra thay vì chạy lại lệnh import trên server.

```powershell
# 1. Xuất danh mục đang xuất bản ở Studio local (chỉ nhận bản đã publish).
npm run hotels:export
# → scripts/hotels/seed.json (commit cùng pull request để review được)
```

```text
# 2. Merge pull request (deploy như bình thường), rồi chạy tay workflow
#    "Seed hotel catalogue (production)" trên GitHub, nhập SEED để xác nhận.
```

- Workflow ghi thẳng vào database của container đang chạy: `hotels`/`hotelRooms`
  (kèm bản `published`), bảng giá, tình trạng phòng, liên kết tour và đúng ba
  khoá `hotels.enabled / homeVisible / featured` trong `settings`. Liên hệ, SEO,
  bản dịch và lead giữ nguyên.
- Trigger của CMS tự tăng `cms_versions`, nên tab đang mở cập nhật như một lần
  bấm “Xuất bản”, không cần build lại.
- Ngày của bảng tình trạng phòng được dời để bắt đầu từ hôm chạy seed (dữ liệu
  demo). Chạy lại cùng file sẽ thay thế đúng các dòng đó, không nhân đôi.
- Đây là thao tác công bố: ảnh CC0 và giá demo sẽ hiện công khai. Chỉ chạy khi
  đã đồng ý dùng dữ liệu demo, hoặc đã thay bằng ảnh/giá thật rồi xuất lại file.

