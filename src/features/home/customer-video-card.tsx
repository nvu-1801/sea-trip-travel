"use client";

import { useState } from "react";
import Image from "next/image";
import { parseYouTubeUrl } from "@/lib/youtube";

export type CustomerVideo = {
  id: string;
  title: string;
  body: string;
  customer: string;
  youtubeUrl: string;
  cover?: { src?: string; alt: string };
};

/**
 * One customer video card.
 *
 * Nothing is requested from YouTube until the visitor presses play: the cover
 * (or brand placeholder) is local, and only then does the nocookie iframe
 * mount. That keeps the first paint fast and avoids a third-party request for
 * every card on the page.
 */
export function CustomerVideoCard({ video }: { video: CustomerVideo }) {
  const [playing, setPlaying] = useState(false);
  const parsed = parseYouTubeUrl(video.youtubeUrl);
  if (!parsed) return null;
  const title = video.title || "Video khách hàng";

  return (
    <article className="stt-customer-video" data-customer-card>
      <div className="stt-customer-video-media">
        {playing ? (
          <iframe
            src={`${parsed.embedUrl}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="stt-customer-video-cover"
            aria-label={`Xem video: ${title}`}
            onClick={() => setPlaying(true)}
          >
            {video.cover?.src ? (
              <Image
                src={video.cover.src}
                alt={video.cover.alt || title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="stt-customer-video-image"
              />
            ) : (
              <span className="stt-customer-video-placeholder" aria-hidden="true">
                <span className="stt-customer-wave stt-customer-wave-a" />
                <span className="stt-customer-wave stt-customer-wave-b" />
              </span>
            )}
            <span className="stt-customer-play" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
            </span>
            <span className="stt-customer-video-label">Xem câu chuyện</span>
          </button>
        )}
      </div>
      <div className="stt-customer-video-copy">
        {video.customer ? (
          <p className="stt-customer-video-customer">{video.customer}</p>
        ) : null}
        <h3>{title}</h3>
        {video.body ? <p>{video.body}</p> : null}
        <a
          href={parsed.watchUrl}
          target="_blank"
          rel="noreferrer"
          className="stt-customer-video-link"
        >
          Xem trên YouTube <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
