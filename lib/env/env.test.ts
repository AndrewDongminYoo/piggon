import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "./public";
import { parseServerEnv } from "./server-schema";

describe("environment parsing", () => {
  it("accepts complete public configuration", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
        NEXT_PUBLIC_KAKAO_MAP_APP_KEY: "kakao-javascript-key",
      }),
    ).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_example",
      kakaoMapAppKey: "kakao-javascript-key",
    });
  });

  it("rejects an invalid administrator email", () => {
    expect(() =>
      parseServerEnv({
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        ADMIN_GOOGLE_EMAIL: "not-an-email",
      }),
    ).toThrow();
  });
});
