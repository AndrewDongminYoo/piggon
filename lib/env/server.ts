import "server-only";

import { parseServerEnv } from "./server-schema";

export function getServerEnv() {
  return parseServerEnv({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    ADMIN_GOOGLE_EMAIL: process.env.ADMIN_GOOGLE_EMAIL,
  });
}
