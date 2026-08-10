"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env/public";

export function createClient() {
  const { supabasePublishableKey, supabaseUrl } = getPublicEnv();

  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
