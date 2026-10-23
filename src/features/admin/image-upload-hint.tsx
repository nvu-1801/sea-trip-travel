/** Dimensions match the public frames and the 1920px upload processing cap. */
const imageGuides = {
  general: {
    size: "Chiều rộng 1200–1920 px",
    detail:
      "Dùng ảnh gốc rõ nét; không kéo giãn ảnh nhỏ. Chọn tỷ lệ phù hợp với vị trí hiển thị và giữ chủ thể ở giữa ảnh.",
  },
  hero: {
    size: "1920 × 1080 px · ảnh ngang 16:9",
    detail:
      "Nên rộng từ 1600 px cho banner toàn màn hình. Giữ chủ thể ở giữa và chỉnh vị trí lấy nét để ảnh đẹp cả trên điện thoại.",
  },
  portrait: {
    size: "1200 × 1500 px · ảnh dọc 4:5",
    detail:
      "Nên từ 800 × 1000 px. Phù hợp khung ảnh dọc; để khoảng trống quanh chủ thể để dễ căn bố cục.",
  },
  square: {
    size: "800 × 800 px · ảnh vuông 1:1",
    detail:
      "Nên từ 400 × 400 px cho ảnh phụ. Chọn ảnh rõ nét và đặt chủ thể ở giữa khung.",
  },
  tour: {
    size: "1000 × 1000 đến 1600 × 1600 px · ảnh vuông 1:1",
    detail:
      "Ảnh gốc từ 1000 px mỗi cạnh giúp khung 500 × 500 px rõ nét trên màn hình mật độ cao. Ảnh ngang/dọc vẫn dùng được và hiển thị đầy đủ trong gallery; thẻ tour có thể cắt ảnh nên giữ chủ thể ở giữa.",
  },
  destination: {
    size: "1600 × 1000 px · ảnh ngang 16:10",
    detail:
      "Nên từ 1200 × 750 px. Giữ chủ thể ở giữa vì ảnh dùng cho cả thẻ ngang và khung dọc ở trang chủ.",
  },
  category: {
    size: "1600 × 1000 px · ảnh ngang 16:10",
    detail:
      "Nên từ 1200 × 750 px. Chọn ảnh đại diện đúng vùng miền; chừa khoảng trống quanh chủ thể để các thẻ tự cắt ảnh.",
  },
  articleCover: {
    size: "1600 × 900 px · ảnh ngang 16:9",
    detail:
      "Nên từ 1200 × 675 px. Giữ chủ thể ở giữa để ảnh bìa phù hợp cả thẻ cẩm nang và trang bài viết.",
  },
  articleBody: {
    size: "1600 × 900 px · ảnh ngang 16:9",
    detail:
      "Nên từ 1200 × 675 px để ảnh trong bài rõ nét. Khung nội dung hiển thị 16:9; tránh đặt chữ hoặc chủ thể sát mép ảnh.",
  },
  share: {
    size: "1200 × 630 px · ảnh chia sẻ 1,91:1",
    detail:
      "Dùng cho ảnh xem trước khi chia sẻ liên kết. Giữ tiêu đề và logo trong vùng giữa để tránh bị cắt trên Facebook hoặc Zalo.",
  },
  library: {
    size: "Ảnh gốc rộng 1200–1920 px, tùy vị trí sử dụng",
    detail:
      "Banner: 1920 × 1080 px · Tour: 1000 × 1000 đến 1600 × 1600 px · Bài viết: 1600 × 900 px. Hệ thống thu ảnh về tối đa 1920 px và không phóng lớn ảnh nhỏ.",
  },
} as const;

export type ImageUsage = keyof typeof imageGuides;

export function ImageUploadHint({
  usage = "general",
  id,
}: {
  usage?: ImageUsage;
  id?: string;
}) {
  const guide = imageGuides[usage];
  return (
    <div
      id={id}
      className="adm-image-guidance"
      role="note"
      aria-label="Hướng dẫn kích thước ảnh"
    >
      <span>Kích thước khuyên dùng</span>
      <strong>{guide.size}</strong>
      <p>{guide.detail}</p>
    </div>
  );
}
