import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { requireUser } = vi.hoisted(() => ({
  requireUser: vi.fn(async () => ({ id: "user-id" })),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/features/visits/queries", () => ({
  getViewerProfile: vi.fn(async () => ({ displayName: "피자러버" })),
  listUserCollection: vi.fn(async () => []),
}));
vi.mock("@/features/visits/components/visit-form", () => ({
  ProfileForm: () => <div>프로필 폼</div>,
}));
vi.mock("@/features/visits/components/visit-card", () => ({
  VisitCard: () => <div>방문 카드</div>,
}));
vi.mock("@/components/auth/sign-out-button", () => ({
  SignOutButton: () => <button type="button">로그아웃</button>,
}));

import MyPizzaPage from "./page";

describe("MyPizzaPage", () => {
  it("requires login with a collection return path and renders sign out", async () => {
    const markup = renderToStaticMarkup(await MyPizzaPage());

    expect(requireUser).toHaveBeenCalledWith("/me");
    expect(markup).toContain("로그아웃");
  });
});
