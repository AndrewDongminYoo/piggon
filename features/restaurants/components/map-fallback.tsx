type MapFallbackProps = {
  description: string;
  onRetry?: () => void;
  title: string;
};

export function MapFallback({ description, onRetry, title }: MapFallbackProps) {
  return (
    <div className="map-fallback" role="status">
      <span aria-hidden="true" className="map-fallback__slice">
        ◒
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      {onRetry ? (
        <button className="atlas-action" onClick={onRetry} type="button">
          다시 불러오기
        </button>
      ) : null}
    </div>
  );
}
