import "server-only";

import { redirect } from "next/navigation";

import { getServerEnv } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const { adminGoogleEmail } = getServerEnv();

  if (error || !data.user) {
    redirect("/?auth=required");
  }

  if (data.user.email?.toLowerCase() !== adminGoogleEmail) {
    redirect("/?auth=forbidden");
  }

  return data.user;
}
