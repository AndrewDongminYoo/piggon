import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Records that the server downloaded this object and checked its signature. The
// visits policy requires the record, because RLS cannot inspect bytes — without
// it, a caller writing straight to the REST API could attach arbitrary bytes
// uploaded under an allowed MIME type and have them counted as proof.
export async function recordValidatedVisitEvidence(
  path: string,
  userId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("record_visit_evidence_validation", {
    p_path: path,
    p_user_id: userId,
  });

  return !error && data === true;
}
