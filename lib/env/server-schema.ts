import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_GOOGLE_EMAIL: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
});

export function parseServerEnv(source: Record<string, string | undefined>) {
  const value = serverEnvSchema.parse(source);

  return {
    supabaseServiceRoleKey: value.SUPABASE_SERVICE_ROLE_KEY,
    adminGoogleEmail: value.ADMIN_GOOGLE_EMAIL,
  };
}
