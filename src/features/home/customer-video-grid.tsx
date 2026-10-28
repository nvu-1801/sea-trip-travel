"use client";

import { useState } from "react";
import {
  CustomerVideoCard,
  type CustomerVideo,
  type CustomerVideoLabels,
} from "./customer-video-card";

/**
 * Client wrapper for the video grid.
 *
 * Only one player is mounted at a time. Clicking another card tears down the
 * previous iframe, so a long page never keeps several YouTube players alive.
 */
export function CustomerVideoGrid({
  videos,
  labels,
}: {
  videos: CustomerVideo[];
  labels: CustomerVideoLabels;
}) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="stt-customers-videos">
      {videos.map((video) => (
        <CustomerVideoCard
          key={video.id}
          video={video}
          labels={labels}
          playing={playingId === video.id}
          onPlay={() => setPlayingId(video.id)}
        />
      ))}
    </div>
  );
}
