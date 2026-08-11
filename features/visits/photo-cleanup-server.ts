import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  reclaimAbandonedVisitPhotos,
  removeOrQueueVisitPhoto,
  retryVisitPhotoCleanup,
  type VisitPhotoCleanupDriver,
} from "./photo-cleanup";
import { VISIT_EVIDENCE_BUCKET } from "./storage";

// Long enough that no in-flight upload from a slow client is ever a candidate;
// an abandoned object is reclaimed on the owner's next visit write after this.
const RECLAIM_AFTER_SECONDS = 24 * 60 * 60;

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
    async listAbandoned(userId, exceptPath, limit) {
      const { data, error } = await admin.rpc(
        "list_reclaimable_visit_evidence",
        {
          // No object is named "", so an empty exemption exempts nothing.
          p_except_path: exceptPath ?? "",
          p_limit: limit,
          p_older_than_seconds: RECLAIM_AFTER_SECONDS,
          p_user_id: userId,
        },
      );
      return error || !data ? [] : data;
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

export async function reclaimStoredAbandonedVisitPhotos(
  userId: string,
  exceptPath: string | null,
): Promise<void> {
  await reclaimAbandonedVisitPhotos(createCleanupDriver(), userId, exceptPath);
}
