type KakaoLatLng = {
  getLat(): number;
  getLng(): number;
};

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

type KakaoMarker = {
  getPosition(): KakaoLatLng;
  setMap(map: KakaoMap | null): void;
};

type KakaoPlaceSearchResult = {
  address_name: string;
  id: string;
  place_name: string;
  place_url: string;
  road_address_name: string;
  x: string;
  y: string;
};

type KakaoPlacesService = {
  keywordSearch(
    keyword: string,
    callback: (results: KakaoPlaceSearchResult[], status: string) => void,
  ): void;
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
  Marker: new (options: {
    draggable?: boolean;
    map: KakaoMap;
    position: KakaoLatLng;
  }) => KakaoMarker;
  event: {
    addListener(
      target: KakaoMarker,
      eventName: "dragend",
      callback: () => void,
    ): void;
    removeListener(
      target: KakaoMarker,
      eventName: "dragend",
      callback: () => void,
    ): void;
  };
  load(callback: () => void): void;
  services: {
    Places: new () => KakaoPlacesService;
    Status: {
      OK: string;
    };
  };
};

interface Window {
  kakao: {
    maps: KakaoMapsApi;
  };
}
