import Image from "next/image";

import type { RestaurantVideo } from "../types";
import { buildYouTubeTimestampUrl, formatVideoTimestamp } from "../video-links";

type VideoCardProps = {
  video: RestaurantVideo;
};

function getAllowedThumbnailUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol === "https:" &&
      url.hostname === "i.ytimg.com" &&
      url.pathname.startsWith("/vi/") &&
      !url.search
    ) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function VideoCard({ video }: VideoCardProps) {
  const thumbnailUrl = getAllowedThumbnailUrl(video.thumbnailUrl);
  const timestamp =
    video.startSeconds === null
      ? null
      : formatVideoTimestamp(video.startSeconds);
  const title = video.title ?? "피자꼰대 영상";

  return (
    <a
      className="video-card"
      href={buildYouTubeTimestampUrl(video.youtubeVideoId, video.startSeconds)}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="video-card__media">
        {thumbnailUrl ? (
          <Image
            alt={`${title} 썸네일`}
            height={270}
            src={thumbnailUrl}
            width={480}
          />
        ) : (
          <span className="video-card__placeholder" aria-hidden="true">
            ▶
          </span>
        )}
      </span>
      <span className="video-card__body">
        <span className="video-card__eyebrow">
          YOUTUBE {timestamp ? `· ${timestamp}부터` : ""}
        </span>
        <strong>{title}</strong>
        {video.contextNote ? <small>{video.contextNote}</small> : null}
        <span className="video-card__cta">영상에서 확인하기 ↗</span>
      </span>
    </a>
  );
}
