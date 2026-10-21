import Link from "next/link";
import { Container, Section } from "@/components/ui/layout";
import { AssetImage } from "@/components/ui/asset-image";
import { Reveal } from "@/components/ui/reveal";
import {
  ArrowRightIcon,
  CalendarIcon,
  CompassIcon,
  TipIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { landingSections } from "@/server/cms/store";
import { localizePath } from "@/i18n/routing";

export function JourneyStory({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const copy = landingSections().story;
  let trips: [string, string, string][] = en
    ? [
        [
          "1",
          "A day to reset",
          "A coastal escape, with time to return in the evening.",
        ],
        [
          "2",
          "A weekend for yourself",
          "Leave the city behind and make room for a slower morning.",
        ],
        [
          "4+",
          "Stay a little longer",
          "Connect more destinations, with time to explore along the way.",
        ],
      ]
    : [
        [
          "1",
          "Một ngày đổi gió",
          "Chạm biển, ghé một điểm đến mới rồi trở về trong ngày.",
        ],
        [
          "2",
          "Cuối tuần cho riêng mình",
          "Rời phố, ngủ một giấc ngon và đón buổi sáng ở một nơi khác.",
        ],
        [
          "4+",
          "Ở lại thêm chút nữa",
          "Nối những miền đất, dành nhiều thời gian hơn cho khám phá.",
        ],
      ];
  try {
    const saved = landingSections().story.trips;
    if (saved.length) {
      trips = saved.map((t) => [
        t.days,
        en ? t.titleEn || t.title : t.title,
        en ? t.bodyEn || t.body : t.body,
      ]);
    }
  } catch {
    // giữ fallback khi CMS chưa bật
  }
  return (
    <section className="journey-story">
      <AssetImage
        image={{
          src: copy.photoSrc,
          alt: en ? copy.photoAltEn || copy.photoAlt : copy.photoAlt,
        }}
        className="journey-story-image"
        sizes="100vw"
      />
      <Container>
        <Reveal className="journey-story-heading">
          <p className="journal-eyebrow">
            {en ? copy.eyebrowEn || copy.eyebrow : copy.eyebrow}
          </p>
          <h2>
            {en ? copy.titleAEn || copy.titleA : copy.titleA}
            <br />
            <em>{en ? copy.titleBEn || copy.titleB : copy.titleB}</em>
          </h2>
          <p>{en ? copy.bodyEn || copy.body : copy.body}</p>
        </Reveal>
        <div className="journey-duration-grid">
          {trips.map(([days, title, description], i) => (
            <Reveal key={days} delay={(i % 3) as 0 | 1 | 2}>
              <Link
                key={days}
                href={`${localizePath(locale, "/tim-tour")}?days=${encodeURIComponent(days)}`}
              >
                <span className="journey-duration">
                  {days}
                  <small>{en ? "DAYS" : "NGÀY"}</small>
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="journey-duration-cta">
                  {en ? copy.ctaEn || copy.cta : copy.cta} ↗
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function PlanningSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const copy = landingSections().planning;
  const icons = [CompassIcon, UsersIcon, CalendarIcon, TipIcon];
  let tags = en
    ? ["Choose", "Group", "Booking", "Beach"]
    : ["Chọn tour", "Nhóm riêng", "Đặt chỗ", "Đi biển"];
  let questions: [string, string][] = en
    ? [
        [
          "How do I choose the right trip?",
          "Start with your available days and preferred destination. Each tour page lists its itinerary and included services so you can compare before asking for advice.",
        ],
        [
          "Can I travel with my family or a private group?",
          "Share your group size, ages and preferred pace with our team. We will discuss suitable arrangements and confirm availability before you decide.",
        ],
        [
          "Does submitting a request confirm a booking?",
          "No. The form sends a consultation request. Dates, availability, services and the final price need to be confirmed with the team.",
        ],
        [
          "What should I check before a coastal trip?",
          "Check the weather and departure arrangements with your advisor. Bring sun protection and suitable footwear; boat activities may change with sea conditions.",
        ],
      ]
    : [
        [
          "Chọn chuyến đi thế nào cho phù hợp?",
          "Bắt đầu từ số ngày bạn có và nơi muốn đến. Mỗi trang tour có lịch trình và thông tin dịch vụ để bạn so sánh trước khi trao đổi thêm với tư vấn viên.",
        ],
        [
          "Gia đình hoặc nhóm riêng có thể đi được không?",
          "Bạn hãy chia sẻ số người, độ tuổi và nhịp đi mong muốn. Đội ngũ tư vấn sẽ trao đổi phương án phù hợp và xác nhận khả năng phục vụ trước khi bạn quyết định.",
        ],
        [
          "Gửi yêu cầu có đồng nghĩa đã đặt tour?",
          "Chưa. Biểu mẫu chỉ gửi yêu cầu tư vấn. Ngày khởi hành, tình trạng chỗ, dịch vụ và giá cuối cùng cần được xác nhận lại với đội ngũ tư vấn.",
        ],
        [
          "Cần chuẩn bị gì cho chuyến đi biển?",
          "Trao đổi trước về thời tiết và điểm đón. Mang theo đồ chống nắng, giày dép phù hợp; các hoạt động đi canô hoặc tàu có thể thay đổi theo điều kiện biển.",
        ],
      ];
  try {
    const saved = landingSections().planning.questions;
    if (saved.length) {
      tags = saved.map((q) => (en ? q.tagEn || q.tag : q.tag));
      questions = saved.map((q) => [
        en ? q.qEn || q.q : q.q,
        en ? q.aEn || q.a : q.a,
      ]);
    }
  } catch {
    // giữ fallback
  }
  return (
    <Section className="journal-planning">
      <Container>
        <div className="planning-layout">
          <Reveal>
            <p className="journal-eyebrow planning-eyebrow">
              <span className="planning-eyebrow-dot" aria-hidden="true" />
              {en ? copy.eyebrowEn || copy.eyebrow : copy.eyebrow}
            </p>
            <h2>
              {en ? copy.titleAEn || copy.titleA : copy.titleA}
              <br />
              <em>{en ? copy.titleBEn || copy.titleB : copy.titleB}</em>
            </h2>
            <p>{en ? copy.bodyEn || copy.body : copy.body}</p>
            <div className="planning-steps">
              {(en ? copy.stepsEn : copy.steps).map((step, i) => (
                <span key={step} className="planning-step">
                  <span className="planning-step-num">{i + 1}</span>
                  {step}
                </span>
              ))}
            </div>
            <Link
              className="planning-assist"
              href={localizePath(locale, copy.href)}
            >
              <span className="planning-assist-copy">
                <strong>{en ? copy.ctaEn || copy.cta : copy.cta}</strong>
                <span>
                  {en
                    ? copy.ctaDescriptionEn || copy.ctaDescription
                    : copy.ctaDescription}
                </span>
              </span>
              <span className="planning-assist-arrow" aria-hidden="true">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
          </Reveal>
          <div className="planning-questions">
            {questions.map(([q, a], i) => {
              const Icon = icons[i % icons.length];
              return (
                <Reveal key={q} delay={i}>
                  <details open={i === 0}>
                    <summary>
                      <span className="planning-q-icon" aria-hidden="true">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="planning-q-text">
                        <span className="planning-q-meta">
                          0{i + 1} · {tags[i]}
                        </span>
                        {q}
                      </span>
                      <span className="planning-q-plus" aria-hidden="true" />
                    </summary>
                    <p>{a}</p>
                  </details>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
