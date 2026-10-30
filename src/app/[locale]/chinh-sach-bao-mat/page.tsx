import type { Metadata } from "next";
import { ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/runtime-site";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, Section } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { AlertIcon } from "@/components/ui/icons";
import { TranslationNotice } from "@/components/layout/translation-notice";
import { format, getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { resolveLocaleFromParams } from "@/i18n/params";
import { defaultLocale } from "@/i18n/config";

const POLICY_UPDATED_AT = "2026-10-13";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  return buildMetadata({
    title: m.privacy.metaTitle,
    description: m.privacy.metaDescription,
    path: ROUTES.privacy,
    locale,
    // The policy text is legal copy: it is translated only from the source and
    // must be approved by the owner before it is indexed in English.
    noIndex: locale !== defaultLocale,
    hreflang: locale === defaultLocale,
    enIndexable: false,
  });
}

/**
 * Privacy notice for the consultation form.
 *
 * Scope is deliberately narrow: this policy covers the contact information
 * collected by the request form. It does not claim analytics cookies, accounts
 * or payments that the MVP does not have.
 *
 * ⚠️ TODO(owner): replace the legal-entity placeholder below and have the final
 * wording reviewed before launch. See docs/CONTENT-TODO.md. The English page
 * shows the Vietnamese policy behind an explicit draft notice until it is
 * reviewed.
 */
export default async function PrivacyPage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  const updated = POLICY_UPDATED_AT.split("-").reverse().join("/");

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: m.common.home, path: localizePath(locale, "/") },
          {
            label: m.privacy.title,
            path: localizePath(locale, ROUTES.privacy),
          },
        ])}
      />

      {locale === defaultLocale ? null : (
        <TranslationNotice
          locale={locale}
          viHref={localizePath("vi", ROUTES.privacy)}
        />
      )}

      <Breadcrumbs
        items={[
          { label: m.common.home, href: localizePath(locale, "/") },
          { label: m.privacy.title },
        ]}
        ariaLabel={m.common.breadcrumbAria}
      />

      <Container>
        <div className="mx-auto max-w-3xl py-12 sm:py-16">
          <header className="flex flex-col gap-4 border-b border-border pb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
              {m.privacy.eyebrow}
            </p>
            <h1 className="text-display font-display font-semibold text-foreground">
              {m.privacy.title}
            </h1>
            <p className="text-sm text-foreground-subtle">
              {format(m.privacy.lastUpdated, { date: updated })}
            </p>
          </header>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-warning-soft p-4 text-sm leading-relaxed text-foreground">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <p>
              <strong className="font-bold">Bản dự thảo.</strong> Thông tin pháp
              lý của đơn vị vận hành (tên công ty, mã số thuế, địa chỉ đăng ký)
              chưa được cung cấp và sẽ được bổ sung trước khi website chính thức
              hoạt động. Nội dung dưới đây mô tả đúng cách website hiện xử lý dữ
              liệu.
            </p>
          </div>

          <div className="article-content mt-10">
            <h2>1. Đơn vị xử lý thông tin</h2>
            <p>
              Website này do <strong>{siteConfig.name}</strong> vận hành
              {siteConfig.contact.address.includes("cập nhật") ? (
                <>
                  . Địa chỉ liên hệ hiện tại:{" "}
                  <em>{siteConfig.contact.address}</em>
                </>
              ) : (
                <>, địa chỉ {siteConfig.contact.address}</>
              )}
              .
            </p>
            <p>
              Mọi câu hỏi về việc xử lý thông tin cá nhân, bạn có thể gửi tới{" "}
              <a href={`mailto:${siteConfig.contact.email}`}>
                {siteConfig.contact.email}
              </a>{" "}
              hoặc gọi{" "}
              <a href={siteConfig.contact.hotlineHref}>
                {siteConfig.contact.hotline}
              </a>
              .
            </p>

            <h2>2. Chúng tôi thu thập những thông tin nào</h2>
            <p>
              Website chỉ thu thập thông tin bạn tự nhập vào form yêu cầu tư
              vấn. Cụ thể:
            </p>
            <ul>
              <li>
                <strong>Bắt buộc:</strong> họ tên, số điện thoại và xác nhận
                bạn đã đọc chính sách này.
              </li>
              <li>
                <strong>Không bắt buộc:</strong> email, tour hoặc điểm đến quan
                tâm, ngày dự kiến khởi hành, số người, nội dung yêu cầu.
              </li>
              <li>
                <strong>Thông tin kỹ thuật đi kèm yêu cầu:</strong> trang bạn
                gửi yêu cầu, thời điểm gửi, và — nếu đường dẫn có — các tham số
                chiến dịch quảng cáo (utm_source, utm_medium, utm_campaign,
                utm_content, utm_term). Các tham số này bị giới hạn độ dài và
                không lưu nội dung khác của đường dẫn.
              </li>
            </ul>
            <p>
              Website <strong>không</strong> yêu cầu số CMND/CCCD, số tài khoản,
              số thẻ, mật khẩu hay thông tin thanh toán. Vui lòng không nhập
              những thông tin đó vào ô nội dung yêu cầu.
            </p>

            <h3>Về địa chỉ IP</h3>
            <p>
              Địa chỉ IP chỉ được dùng tạm thời để giới hạn tần suất gửi yêu cầu
              (chống spam) và không được lưu cùng nội dung yêu cầu.
            </p>

            <h2>3. Mục đích sử dụng</h2>
            <ul>
              <li>Liên hệ tư vấn và trả lời yêu cầu bạn đã gửi.</li>
              <li>Lập phương án lịch trình và báo giá theo nhu cầu của bạn.</li>
              <li>Chống lạm dụng form và đảm bảo an toàn cho hệ thống.</li>
            </ul>
            <p>
              Chúng tôi không dùng thông tin này để gửi tin quảng cáo, và không
              đăng ký bạn vào danh sách nhận tin nào. Nếu sau này có hoạt động
              như vậy, chúng tôi sẽ xin sự đồng ý riêng của bạn.
            </p>

            <h2>4. Cơ sở xử lý và sự đồng ý</h2>
            <p>
              Việc gửi form đồng nghĩa bạn đồng ý để chúng tôi liên hệ qua số
              điện thoại hoặc email đã cung cấp. Bạn có thể rút lại sự đồng ý
              bất kỳ lúc nào bằng cách thông báo cho chúng tôi qua các kênh liên
              hệ ở mục 1.
            </p>

            <h2>5. Thời gian lưu trữ</h2>
            <p>
              Thông tin yêu cầu tư vấn được lưu trong hộp thư của bộ phận tư vấn
              trong thời gian cần thiết để xử lý yêu cầu và theo dõi sau tư vấn.
              Khi thông tin không còn cần thiết cho mục đích đã nêu, chúng tôi
              sẽ xoá.
            </p>

            <h2>6. Chia sẻ với bên thứ ba</h2>
            <p>
              Thông tin yêu cầu được gửi tới bộ phận tư vấn qua một nhà cung cấp
              dịch vụ email. Nhà cung cấp này xử lý dữ liệu thay cho chúng tôi
              và chỉ trong phạm vi vận chuyển email.
            </p>
            <p>
              Chúng tôi không bán, không trao đổi và không cho thuê thông tin cá
              nhân của bạn cho bất kỳ bên nào khác. Nếu cơ quan nhà nước có thẩm
              quyền yêu cầu theo quy định pháp luật, chúng tôi sẽ cung cấp thông
              tin theo yêu cầu đó.
            </p>

            <h2>7. Bảo mật</h2>
            <ul>
              <li>Website hoạt động trên HTTPS.</li>
              <li>
                Khoá truy cập dịch vụ email chỉ được lưu ở phía máy chủ, không
                xuất hiện trong mã nguồn gửi tới trình duyệt.
              </li>
              <li>
                Nội dung bạn nhập được hiển thị trong email nội bộ dưới dạng văn
                bản thuần, không chạy mã.
              </li>
              <li>
                Nhật ký hệ thống không ghi lại toàn bộ nội dung yêu cầu hay
                thông tin cá nhân chi tiết.
              </li>
            </ul>

            <h2>8. Quyền của bạn</h2>
            <p>Với thông tin cá nhân bạn đã cung cấp, bạn có quyền:</p>
            <ul>
              <li>Biết chúng tôi đang lưu những gì về bạn.</li>
              <li>Yêu cầu chỉnh sửa nếu thông tin sai hoặc chưa đầy đủ.</li>
              <li>Yêu cầu xoá thông tin và dừng liên hệ.</li>
              <li>Rút lại sự đồng ý đã đưa ra trước đó.</li>
            </ul>
            <p>
              Để thực hiện các quyền này, vui lòng liên hệ theo mục 1. Chúng tôi
              sẽ xác minh yêu cầu và phản hồi trong thời gian hợp lý.
            </p>

            <h2>9. Trẻ em</h2>
            <p>
              Website hướng tới người lớn. Nếu bạn đặt yêu cầu cho một nhóm có
              trẻ em, các thông tin về trẻ em chỉ nên giới hạn ở số lượng và độ
              tuổi cần thiết cho việc sắp xếp chuyến đi.
            </p>

            <h2>10. Thay đổi chính sách</h2>
            <p>
              Khi có thay đổi, chúng tôi cập nhật ngày ở đầu trang và điều chỉnh
              nội dung tương ứng. Bản đang hiển thị là bản có hiệu lực tại thời
              điểm bạn truy cập.
            </p>
          </div>
        </div>
      </Container>

      <Section tone="muted" spacing="tight">
        <Container>
          <p className="text-sm text-foreground-muted">
            {m.privacy.footerLinkPre}{" "}
            <a
              href={localizePath(locale, ROUTES.contact)}
              className="font-semibold text-primary-strong underline underline-offset-2"
            >
              {m.privacy.footerLink}
            </a>{" "}
            {m.privacy.footerLinkPost}
          </p>
        </Container>
      </Section>
    </>
  );
}
