import "server-only";

import { redirect } from "next/navigation";

import { getLoginPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function requireUser(nextPath?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(nextPath ? getLoginPath(nextPath) : "/?auth=required");
  }

  return data.user;
}
