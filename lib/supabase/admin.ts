import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env/public";
import { getServerEnv } from "@/lib/env/server";

function createAdminFetch(apiKey: string): typeof fetch {
  const isCompactJwt = apiKey.split(".").length === 3;

  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (!isCompactJwt && headers.get("Authorization") === `Bearer ${apiKey}`) {
      headers.delete("Authorization");
    }

    return fetch(input, { ...init, headers });
  };
}

export function createAdminClient() {
  const { supabaseUrl } = getPublicEnv();
  const { supabaseSecretKey } = getServerEnv();

  return createSupabaseClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createAdminFetch(supabaseSecretKey),
    },
  });
}
