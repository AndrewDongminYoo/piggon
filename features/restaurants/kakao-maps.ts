const KAKAO_MAPS_SCRIPT_ID = "piggon-kakao-maps-sdk";

let mapsPromise: Promise<KakaoMapsApi> | null = null;

function resolveLoadedMaps(
  resolve: (maps: KakaoMapsApi) => void,
  reject: (reason: Error) => void,
): void {
  const maps = window.kakao?.maps;

  if (!maps) {
    reject(new Error("카카오 지도 SDK 응답을 확인하지 못했습니다."));
    return;
  }

  maps.load(() => resolve(maps));
}

export function loadKakaoMaps(appKey: string): Promise<KakaoMapsApi> {
  if (mapsPromise) {
    return mapsPromise;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(
      new Error("카카오 지도는 브라우저에서만 불러올 수 있습니다."),
    );
  }

  if (!appKey.trim()) {
    return Promise.reject(
      new Error("카카오 지도 JavaScript 키가 설정되지 않았습니다."),
    );
  }

  const promise = new Promise<KakaoMapsApi>((resolve, reject) => {
    if (window.kakao?.maps) {
      resolveLoadedMaps(resolve, reject);
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.id = KAKAO_MAPS_SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services,clusterer&appkey=${encodeURIComponent(appKey)}`;
    script.onload = () =>
      resolveLoadedMaps(resolve, (reason) => {
        script.remove();
        reject(reason);
      });
    script.onerror = () => {
      script.remove();
      reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
    };
    document.head.append(script);
  });

  mapsPromise = promise;
  void promise.catch(() => {
    if (mapsPromise === promise) {
      mapsPromise = null;
    }
  });

  return promise;
}

export function resetKakaoMapsLoaderForTests(): void {
  mapsPromise = null;
}
