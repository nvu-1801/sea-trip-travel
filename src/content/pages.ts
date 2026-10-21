import type { ContentPage } from "@/domain/page";
import { contentPageSchema } from "@/domain/page";
export const pageSeeds: ContentPage[] = [
  {
    id: "page_privacy",
    slug: "chinh-sach-bao-mat",
    title: "Chính sách bảo mật",
    summary: "Thông tin về cách SEA TRIP tiếp nhận và xử lý dữ liệu cá nhân.",
    body: [
      {
        type: "heading",
        level: 2,
        text: "1. Đơn vị xử lý thông tin",
      },
      {
        type: "paragraph",
        text: "Website này do {siteName} vận hành. Địa chỉ liên hệ: {address}. Mọi câu hỏi về xử lý thông tin cá nhân, vui lòng gửi tới {email} hoặc gọi {hotline}.",
      },
      {
        type: "heading",
        level: 2,
        text: "2. Chúng tôi thu thập những thông tin nào",
      },
      {
        type: "paragraph",
        text: "Website chỉ thu thập thông tin bạn tự nhập vào form yêu cầu tư vấn. Cụ thể:",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Bắt buộc: họ tên, số điện thoại, và xác nhận bạn đã đọc chính sách này.",
          "Không bắt buộc: email, tour hoặc điểm đến quan tâm, ngày dự kiến khởi hành, số người, nội dung yêu cầu.",
          "Thông tin kỹ thuật đi kèm yêu cầu: trang bạn gửi yêu cầu, thời điểm gửi, và — nếu đường dẫn có — các tham số chiến dịch quảng cáo (utm_source, utm_medium, utm_campaign, utm_content, utm_term). Các tham số này bị giới hạn độ dài và không lưu nội dung khác của đường dẫn.",
        ],
      },
      {
        type: "paragraph",
        text: "Website không yêu cầu số CMND/CCCD, số tài khoản, số thẻ, mật khẩu hay thông tin thanh toán. Vui lòng không nhập những thông tin đó vào ô nội dung yêu cầu.",
      },
      {
        type: "heading",
        level: 3,
        text: "Về địa chỉ IP",
      },
      {
        type: "paragraph",
        text: "Địa chỉ IP chỉ được dùng tạm thời để giới hạn tần suất gửi yêu cầu (chống spam) và không được lưu cùng nội dung yêu cầu.",
      },
      {
        type: "heading",
        level: 2,
        text: "3. Mục đích sử dụng",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Liên hệ tư vấn và trả lời yêu cầu bạn đã gửi.",
          "Lập phương án lịch trình và báo giá theo nhu cầu của bạn.",
          "Chống lạm dụng form và bảo đảm an toàn cho hệ thống.",
        ],
      },
      {
        type: "paragraph",
        text: "Chúng tôi không dùng thông tin này để gửi tin quảng cáo, và không đăng ký bạn vào danh sách nhận tin nào. Nếu sau này có hoạt động như vậy, chúng tôi sẽ xin sự đồng ý riêng của bạn.",
      },
      {
        type: "heading",
        level: 2,
        text: "4. Cơ sở xử lý và sự đồng ý",
      },
      {
        type: "paragraph",
        text: "Việc gửi form đồng nghĩa bạn đồng ý để chúng tôi liên hệ qua số điện thoại hoặc email đã cung cấp. Bạn có thể rút lại sự đồng ý bất kỳ lúc nào bằng cách thông báo cho chúng tôi qua các kênh liên hệ ở mục 1.",
      },
      {
        type: "heading",
        level: 2,
        text: "5. Thời gian lưu trữ",
      },
      {
        type: "paragraph",
        text: "Thông tin yêu cầu tư vấn được lưu trong hộp thư của bộ phận tư vấn trong thời gian cần thiết để xử lý yêu cầu và theo dõi sau tư vấn. Khi thông tin không còn cần thiết cho mục đích đã nêu, chúng tôi sẽ xoá.",
      },
      {
        type: "heading",
        level: 2,
        text: "6. Chia sẻ với bên thứ ba",
      },
      {
        type: "paragraph",
        text: "Thông tin yêu cầu được gửi tới bộ phận tư vấn qua một nhà cung cấp dịch vụ email. Nhà cung cấp này xử lý dữ liệu thay cho chúng tôi và chỉ trong phạm vi vận chuyển email.",
      },
      {
        type: "paragraph",
        text: "Chúng tôi không bán, không trao đổi và không cho thuê thông tin cá nhân của bạn cho bất kỳ bên nào khác. Trường hợp cơ quan nhà nước có thẩm quyền yêu cầu theo quy định pháp luật, chúng tôi thực hiện theo yêu cầu đó.",
      },
      {
        type: "heading",
        level: 2,
        text: "7. Bảo mật",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Website hoạt động trên HTTPS.",
          "Khoá truy cập dịch vụ email chỉ được lưu ở phía máy chủ, không xuất hiện trong mã nguồn gửi tới trình duyệt.",
          "Nội dung bạn nhập được hiển thị trong email nội bộ dưới dạng văn bản thuần, không chạy mã.",
          "Nhật ký hệ thống không ghi lại toàn bộ nội dung yêu cầu hay thông tin cá nhân chi tiết.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "8. Quyền của bạn",
      },
      {
        type: "paragraph",
        text: "Với thông tin cá nhân bạn đã cung cấp, bạn có quyền:",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Biết chúng tôi đang lưu những gì về bạn.",
          "Yêu cầu chỉnh sửa nếu thông tin sai hoặc chưa đầy đủ.",
          "Yêu cầu xoá thông tin và dừng liên hệ.",
          "Rút lại sự đồng ý đã đưa ra trước đó.",
        ],
      },
      {
        type: "paragraph",
        text: "Để thực hiện các quyền này, vui lòng liên hệ theo mục 1. Chúng tôi sẽ xác minh yêu cầu và phản hồi trong thời gian hợp lý.",
      },
      {
        type: "heading",
        level: 2,
        text: "9. Trẻ em",
      },
      {
        type: "paragraph",
        text: "Website hướng tới người lớn. Nếu bạn đặt yêu cầu cho một nhóm có trẻ em, các thông tin về trẻ em chỉ nên giới hạn ở số lượng và độ tuổi cần thiết cho việc sắp xếp chuyến đi.",
      },
      {
        type: "heading",
        level: 2,
        text: "10. Thay đổi chính sách",
      },
      {
        type: "paragraph",
        text: "Khi có thay đổi, chúng tôi cập nhật ngày ở đầu trang và điều chỉnh nội dung tương ứng. Bản đang hiển thị là bản có hiệu lực tại thời điểm bạn truy cập.",
      },
    ],
    updatedAt: "2026-10-13",
    translationReviewed: false,
  },
].map((page) => contentPageSchema.parse(page));
