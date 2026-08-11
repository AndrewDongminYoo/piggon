type ModerationEvidenceProps = {
  evidenceType: "instagram" | "photo";
  evidenceUrl: string | null;
  restaurantName: string;
};

export function ModerationEvidence({
  evidenceType,
  evidenceUrl,
  restaurantName,
}: ModerationEvidenceProps) {
  if (!evidenceUrl) {
    return (
      <small className="moderation-evidence__unavailable">
        증거를 불러오지 못했습니다.
      </small>
    );
  }

  if (evidenceType === "instagram") {
    return (
      <a
        className="moderation-evidence__link"
        href={evidenceUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        Instagram 게시물 열기 ↗
      </a>
    );
  }

  return (
    <div className="moderation-evidence">
      <a
        className="moderation-evidence__photo"
        href={evidenceUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        {/* Signed evidence URLs are short-lived and should bypass image optimization caches. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${restaurantName} 방문 인증 사진`}
          height="120"
          loading="lazy"
          src={evidenceUrl}
          width="160"
        />
      </a>
      <a
        className="moderation-evidence__link"
        href={evidenceUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        방문 인증 사진 원본 보기 ↗
      </a>
    </div>
  );
}
