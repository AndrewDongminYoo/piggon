export type AvailabilityState = "permanent" | "current" | "upcoming" | "ended";

export type RestaurantCertification = {
  name: string;
  issuer: string;
  certificationNumber: string | null;
  validFrom: string | null;
  validUntil: string | null;
  sourceUrl: string;
};

export type RestaurantAward = {
  competitionName: string;
  awardYear: number;
  division: string;
  placement: string;
  sourceUrl: string;
};

export type AvailabilityPeriod = {
  startsOn: string;
  endsOn: string | null;
  note: string | null;
};

export type RestaurantVideo = {
  id: string;
  youtubeVideoId: string;
  canonicalUrl: string;
  title: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  startSeconds: number | null;
  contextNote: string | null;
};

export type RestaurantSummary = {
  id: string;
  slug: string;
  name: string;
  alternateName: string | null;
  region: string;
  address: string | null;
  kakaoPlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  kind: "pizzeria" | "restaurant" | "popup" | "franchise";
  sourceUrl: string | null;
  certifications: RestaurantCertification[];
  awards: RestaurantAward[];
  availabilityPeriods: AvailabilityPeriod[];
  videos: RestaurantVideo[];
};

export type RestaurantDetail = RestaurantSummary & {
  description: string | null;
};

export type RestaurantFilter = {
  search?: string;
  hasVideo?: boolean;
  hasAvpnCertification?: boolean;
  hasAward?: boolean;
  currentAvailabilityOnly?: boolean;
  includeEndedPopups?: boolean;
};

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
};
