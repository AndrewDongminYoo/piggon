import { describe, expect, it, vi } from "vitest";

import {
  removeOrQueueVisitPhoto,
  retryVisitPhotoCleanup,
  type VisitPhotoCleanupDriver,
} from "./photo-cleanup";

function createDriver(
  removeError: string | null,
  queuedPaths: string[] = [],
): VisitPhotoCleanupDriver {
  return {
    clear: vi.fn(async () => true),
    list: vi.fn(async () => queuedPaths),
    queue: vi.fn(async () => true),
    remove: vi.fn(async () => removeError),
  };
}

describe("visit photo cleanup", () => {
  it("queues a failed deletion with its owner for retry", async () => {
    const driver = createDriver("temporary storage failure");

    await expect(
      removeOrQueueVisitPhoto(driver, "user/restaurant/old.webp", "user"),
    ).resolves.toBe(false);
    expect(driver.queue).toHaveBeenCalledWith({
      lastError: "temporary storage failure",
      path: "user/restaurant/old.webp",
      userId: "user",
    });
  });

  it("queues a thrown storage failure without blocking the visit write", async () => {
    const driver = createDriver(null);
    vi.mocked(driver.remove).mockRejectedValueOnce(new Error("network down"));

    await expect(
      removeOrQueueVisitPhoto(driver, "user/restaurant/old.webp", "user"),
    ).resolves.toBe(false);
    expect(driver.queue).toHaveBeenCalledWith({
      lastError: "Storage cleanup request failed",
      path: "user/restaurant/old.webp",
      userId: "user",
    });
  });

  it("retries a bounded set of queued paths", async () => {
    const driver = createDriver(null, [
      "user/restaurant/first.webp",
      "user/restaurant/second.webp",
    ]);

    await retryVisitPhotoCleanup(driver, "user");

    expect(driver.remove).toHaveBeenCalledTimes(2);
    expect(driver.clear).toHaveBeenCalledTimes(2);
  });
});
