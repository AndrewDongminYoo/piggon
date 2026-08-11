const CLEANUP_RETRY_LIMIT = 5;

export type VisitPhotoCleanupDriver = {
  clear: (path: string) => Promise<boolean>;
  list: (userId: string, limit: number) => Promise<string[]>;
  queue: (job: {
    lastError: string;
    path: string;
    userId: string;
  }) => Promise<boolean>;
  remove: (path: string) => Promise<string | null>;
};

export async function removeOrQueueVisitPhoto(
  driver: VisitPhotoCleanupDriver,
  path: string,
  userId: string,
): Promise<boolean> {
  let removeError: string | null;
  try {
    removeError = await driver.remove(path);
  } catch {
    removeError = "Storage cleanup request failed";
  }

  if (removeError) {
    try {
      await driver.queue({
        lastError: removeError,
        path,
        userId,
      });
    } catch {
      // Cleanup remains best-effort so a storage outage cannot undo the visit write.
    }
    return false;
  }

  try {
    await driver.clear(path);
  } catch {
    // A stale queue record can be retried safely after the object is gone.
  }
  return true;
}

export async function retryVisitPhotoCleanup(
  driver: VisitPhotoCleanupDriver,
  userId: string,
): Promise<void> {
  let paths: string[];
  try {
    paths = await driver.list(userId, CLEANUP_RETRY_LIMIT);
  } catch {
    return;
  }

  for (const path of paths) {
    await removeOrQueueVisitPhoto(driver, path, userId);
  }
}
