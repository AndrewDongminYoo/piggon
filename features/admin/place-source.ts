export type PlaceSource = {
  autoUrl: string;
  url: string;
};

export function getNextPlaceSource(
  current: PlaceSource,
  nextAutoUrl: string,
): PlaceSource {
  const shouldRefresh = !current.url || current.url === current.autoUrl;

  return {
    autoUrl: nextAutoUrl,
    url: shouldRefresh ? nextAutoUrl : current.url,
  };
}
