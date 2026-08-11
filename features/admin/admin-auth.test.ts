import { describe, expect, it } from "vitest";

import { isAuthorizedGoogleAdmin } from "./admin-auth";

const adminEmail = "admin@example.com";

describe("isAuthorizedGoogleAdmin", () => {
  it("accepts the confirmed Google account configured as admin", () => {
    expect(
      isAuthorizedGoogleAdmin(
        {
          app_metadata: { provider: "google" },
          email: "ADMIN@example.com",
          email_confirmed_at: "2026-08-11T00:00:00.000Z",
        },
        adminEmail,
      ),
    ).toBe(true);
  });

  it("rejects a password account that claims the configured email", () => {
    expect(
      isAuthorizedGoogleAdmin(
        {
          app_metadata: { provider: "email" },
          email: adminEmail,
          email_confirmed_at: "2026-08-11T00:00:00.000Z",
        },
        adminEmail,
      ),
    ).toBe(false);
  });

  it("rejects an unconfirmed Google identity", () => {
    expect(
      isAuthorizedGoogleAdmin(
        {
          app_metadata: { provider: "google" },
          email: adminEmail,
          email_confirmed_at: null,
        },
        adminEmail,
      ),
    ).toBe(false);
  });
});
