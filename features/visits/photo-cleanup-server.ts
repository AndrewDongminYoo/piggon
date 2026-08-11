import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  removeOrQueueVisitPhoto,
  retryVisitPhotoCleanup,
  type VisitPhotoCleanupDriver,
} from "./photo-cleanup";
import { VISIT_EVIDENCE_BUCKET } from "./storage";

function createCleanupDriver(): VisitPhotoCleanupDriver {
  const admin = createAdminClient();

  return {
    async clear(path) {
      const { error } = await admin
        .from("visit_photo_cleanup_jobs")
        .delete()
        .eq("path", path);
      return !error;
    },
    async list(userId, limit) {
      const { data, error } = await admin
        .from("visit_photo_cleanup_jobs")
        .select("path")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(limit);
      return error ? [] : data.map(({ path }) => path);
    },
    async queue({ lastError, path, userId }) {
      const { error } = await admin.from("visit_photo_cleanup_jobs").upsert(
        {
          last_error: lastError,
          path,
          user_id: userId,
        },
        { onConflict: "path" },
      );
      if (error) {
        console.error("Unable to queue visit photo cleanup", {
          path,
          userId,
        });
      }
      return !error;
    },
    async remove(path) {
      const { error } = await admin.storage
        .from(VISIT_EVIDENCE_BUCKET)
        .remove([path]);
      return error?.message ?? null;
    },
  };
}

export async function cleanupStoredVisitPhoto(
  path: string,
  userId: string,
): Promise<boolean> {
  return removeOrQueueVisitPhoto(createCleanupDriver(), path, userId);
}

export async function retryStoredVisitPhotoCleanup(
  userId: string,
): Promise<void> {
  await retryVisitPhotoCleanup(createCleanupDriver(), userId);
}
