import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Read before downloading, so the bytes that get validated and the version that
// gets recorded describe the same object. Until a visit references it, the owner
// can still overwrite the path.
export async function readVisitEvidenceVersion(
  path: string,
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("visit_evidence_version", {
    p_path: path,
    p_user_id: userId,
  });

  return error || typeof data !== "string" ? null : data;
}

// Records that the server downloaded this object and checked its signature. The
// visits policy requires the record, because RLS cannot inspect bytes — without
// it, a caller writing straight to the REST API could attach arbitrary bytes
// uploaded under an allowed MIME type and have them counted as proof.
//
// Recording refuses if the object moved since expectedVersion was read, so an
// overwrite between the download and here invalidates the attempt instead of
// certifying the new bytes.
export async function recordValidatedVisitEvidence(
  path: string,
  userId: string,
  expectedVersion: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("record_visit_evidence_validation", {
    p_expected_version: expectedVersion,
    p_path: path,
    p_user_id: userId,
  });

  return !error && data === true;
}
