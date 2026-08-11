import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  ADMIN_GOOGLE_EMAIL: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
});

export function parseServerEnv(source: Record<string, string | undefined>) {
  const value = serverEnvSchema.parse(source);

  return {
    supabaseSecretKey: value.SUPABASE_SECRET_KEY,
    adminGoogleEmail: value.ADMIN_GOOGLE_EMAIL,
  };
}
