import { afterEach, describe, expect, it, vi } from "vitest";

import { loadKakaoMaps, resetKakaoMapsLoaderForTests } from "./kakao-maps";

type FakeScript = {
  async: boolean;
  onerror: (() => void) | null;
  onload: (() => void) | null;
  remove: () => void;
  src: string;
};

function installFakeBrowser(appendScript: (script: FakeScript) => void): void {
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", {
    createElement: () => ({
      async: false,
      onerror: null,
      onload: null,
      remove: vi.fn(),
      src: "",
    }),
    head: {
      append: appendScript,
    },
  });
}

afterEach(() => {
  resetKakaoMapsLoaderForTests();
  vi.unstubAllGlobals();
});

describe("loadKakaoMaps", () => {
  it("shares one in-flight SDK promise", async () => {
    let appendedScripts = 0;
    let scriptSource = "";

    installFakeBrowser((script) => {
      appendedScripts += 1;
      scriptSource = script.src;
      window.kakao = {
        maps: {
          load: (callback) => callback(),
        },
      } as typeof window.kakao;
      queueMicrotask(() => script.onload?.());
    });

    const first = loadKakaoMaps("key/value");
    const second = loadKakaoMaps("key/value");

    expect(second).toBe(first);
    await expect(first).resolves.toBe(window.kakao.maps);
    expect(appendedScripts).toBe(1);
    expect(scriptSource).toBe(
      "https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services,clusterer&appkey=key%2Fvalue",
    );
  });

  it("clears a failed load so the SDK can be retried", async () => {
    let attempt = 0;

    installFakeBrowser((script) => {
      attempt += 1;

      if (attempt === 1) {
        queueMicrotask(() => script.onerror?.());
        return;
      }

      window.kakao = {
        maps: {
          load: (callback) => callback(),
        },
      } as typeof window.kakao;
      queueMicrotask(() => script.onload?.());
    });

    await expect(loadKakaoMaps("key")).rejects.toThrow(
      "카카오 지도 SDK를 불러오지 못했습니다.",
    );
    await expect(loadKakaoMaps("key")).resolves.toBe(window.kakao.maps);
    expect(attempt).toBe(2);
  });
});
