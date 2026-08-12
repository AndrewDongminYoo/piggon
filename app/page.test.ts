import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  fileURLToPath(new URL("./page.tsx", import.meta.url)),
  "utf8",
);

describe("Home", () => {
  it("does not use query state as an AtlasShell key", () => {
    expect(pageSource).not.toContain(
      "key={serializeAtlasUrlState(initialState)}",
    );
  });
});
