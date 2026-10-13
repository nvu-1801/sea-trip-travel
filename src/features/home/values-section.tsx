import { ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { AssetImage } from "@/components/ui/asset-image";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * Brand values.
 *
 * Every claim here is about *how we work* — something a traveller can verify by
 * talking to us. There are deliberately no invented customer counts, ratings,
 * awards or partner logos.
 */
const PRINCIPLES = [
  {
    title: "Chọn ít điểm, đi sâu hơn",
    body: "Mỗi hành trình tập trung vào một cụm điểm thay vì chạy qua nhiều nơi. Thời gian di chuyển được tính trước để bạn có thời gian thật ở mỗi điểm.",
  },
  {
    title: "Lịch trình nói rõ bao gồm gì",
    body: "Mỗi tour đều liệt kê dịch vụ bao gồm và không bao gồm. Giá chưa xác nhận sẽ hiển thị “Liên hệ tư vấn”, không hiển thị số 0.",
  },
  {
    title: "Tư vấn trực tiếp, không ép",
    body: "Website chỉ tiếp nhận yêu cầu. Bạn trao đổi với tư vấn viên, xem giá và điều kiện, rồi mới quyết định.",
  },
  {
    title: "Nói thật khi chưa chắc",
    body: "Những nội dung cần xác nhận như giá, chính sách huỷ hay thời điểm tàu chạy sẽ được kiểm tra lại trước khi gửi cho bạn.",
  },
];

export function ValuesSection() {
  return (
    <Section tone="sunken" spacing="loose">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Reveal>
              <div className="relative">
                <AssetImage
                  image={{ alt: "Đường bờ biển miền Trung nhìn từ trên cao" }}
                  sizes="(max-width: 1024px) 90vw, 30vw"
                  className="aspect-[4/5] w-full rounded-3xl border border-border shadow-card"
                />
                <div className="absolute -bottom-5 right-4 max-w-52 rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-strong">
                    Cách SEA TRIP làm việc
                  </p>
                  <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">
                    {siteConfig.message}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal>
              <SectionHeading
                eyebrow="Vì sao chọn SEA TRIP"
                title="Chúng tôi chọn trải nghiệm như thế nào"
                description="Bốn nguyên tắc áp dụng cho mọi hành trình, kể cả tour ngắn một ngày."
              />
            </Reveal>

            <ol className="mt-9 flex flex-col gap-6">
              {PRINCIPLES.map((principle, index) => (
                <Reveal as="li" key={principle.title}>
                  <div className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-surface text-sm font-extrabold text-primary-strong"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-foreground">{principle.title}</h3>
                      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-foreground-muted">
                        {principle.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>

            <Reveal>
              <ButtonLink href={ROUTES.contact} className="mt-9">
                Nói với SEA TRIP về chuyến đi của bạn
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}
