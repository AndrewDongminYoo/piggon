type KakaoLatLng = object;

type KakaoMapOptions = {
  center: KakaoLatLng;
  level: number;
};

type KakaoMap = {
  panTo(position: KakaoLatLng): void;
  relayout(): void;
  setBounds(bounds: KakaoLatLngBounds): void;
};

type KakaoLatLngBounds = {
  extend(position: KakaoLatLng): void;
};

type KakaoCustomOverlay = {
  setMap(map: KakaoMap | null): void;
};

type KakaoMapsApi = {
  CustomOverlay: new (options: {
    clickable?: boolean;
    content: Node;
    map?: KakaoMap;
    position: KakaoLatLng;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoCustomOverlay;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMap;
  load(callback: () => void): void;
};

interface Window {
  kakao: {
    maps: KakaoMapsApi;
  };
}
