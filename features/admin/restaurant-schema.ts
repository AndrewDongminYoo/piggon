import { z } from "zod";

function trimOrNull(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isCalendarDate, "날짜를 확인해 주세요.");

const nullableDateSchema = z.preprocess(
  trimOrNull,
  z.union([z.null(), calendarDateSchema]),
);

const httpsUrlSchema = z
  .url()
  .max(2048)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "HTTPS 출처 URL을 입력해 주세요.",
  });

const nullableHttpsUrlSchema = z.preprocess(
  trimOrNull,
  z.union([z.null(), httpsUrlSchema]),
);

const nullableText = (maximum: number) =>
  z.preprocess(trimOrNull, z.union([z.null(), z.string().max(maximum)]));

const certificationSchema = z
  .object({
    certificationNumber: nullableText(120),
    issuer: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(160),
    sourceUrl: httpsUrlSchema,
    validFrom: nullableDateSchema,
    validUntil: nullableDateSchema,
  })
  .superRefine((value, context) => {
    if (
      value.validFrom &&
      value.validUntil &&
      value.validFrom > value.validUntil
    ) {
      context.addIssue({
        code: "custom",
        message: "인증 종료일은 시작일 이후여야 합니다.",
        path: ["validUntil"],
      });
    }
  });

const awardSchema = z.object({
  awardYear: z.coerce.number().int().min(1900).max(2200),
  competitionName: z.string().trim().min(1).max(160),
  division: z.string().trim().min(1).max(160),
  placement: z.string().trim().min(1).max(120),
  sourceUrl: httpsUrlSchema,
});

const availabilityPeriodSchema = z
  .object({
    endsOn: nullableDateSchema,
    note: nullableText(500),
    startsOn: calendarDateSchema,
  })
  .superRefine((value, context) => {
    if (value.endsOn && value.startsOn > value.endsOn) {
      context.addIssue({
        code: "custom",
        message: "운영 종료일은 시작일 이후여야 합니다.",
        path: ["endsOn"],
      });
    }
  });

const coordinateSchema = (minimum: number, maximum: number) =>
  z.preprocess(
    trimOrNull,
    z.union([z.null(), z.coerce.number().min(minimum).max(maximum)]),
  );

export const restaurantAdminSchema = z
  .object({
    address: nullableText(500),
    alternateName: nullableText(160),
    availabilityPeriods: z.array(availabilityPeriodSchema).max(50),
    awards: z.array(awardSchema).max(50),
    certifications: z.array(certificationSchema).max(50),
    description: nullableText(3000),
    id: z.preprocess(trimOrNull, z.union([z.null(), z.string().uuid()])),
    intent: z.enum(["draft", "publish"]),
    kakaoPlaceId: nullableText(120),
    kind: z.enum(["pizzeria", "restaurant", "popup", "franchise"]),
    latitude: coordinateSchema(-90, 90),
    longitude: coordinateSchema(-180, 180),
    name: z.string().trim().min(1).max(160),
    region: z.string().trim().min(1).max(160),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    sourceUrl: nullableHttpsUrlSchema,
  })
  .superRefine((value, context) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      context.addIssue({
        code: "custom",
        message: "위도와 경도를 함께 입력해 주세요.",
        path: [value.latitude === null ? "latitude" : "longitude"],
      });
    }

    if (value.intent !== "publish") {
      return;
    }

    if (!value.address) {
      context.addIssue({
        code: "custom",
        message: "공개하려면 정확한 주소가 필요합니다.",
        path: ["address"],
      });
    }

    if (value.latitude === null || value.longitude === null) {
      context.addIssue({
        code: "custom",
        message: "공개하려면 지도 좌표가 필요합니다.",
        path: ["latitude"],
      });
    }

    if (!value.sourceUrl) {
      context.addIssue({
        code: "custom",
        message: "공개하려면 맛집 기본 정보 출처가 필요합니다.",
        path: ["sourceUrl"],
      });
    }

    if (value.kind === "popup" && value.availabilityPeriods.length === 0) {
      context.addIssue({
        code: "custom",
        message: "팝업을 공개하려면 운영 기간이 필요합니다.",
        path: ["availabilityPeriods"],
      });
    }
  });

export type RestaurantAdminInput = z.output<typeof restaurantAdminSchema>;

export type RestaurantAdminActionState = {
  fieldErrors?: Record<string, string[]>;
  formValues?: Record<string, string>;
  message: string;
  restaurantId?: string;
  status: "idle" | "success" | "error";
};

export const INITIAL_RESTAURANT_ADMIN_STATE: RestaurantAdminActionState = {
  message: "",
  status: "idle",
};
