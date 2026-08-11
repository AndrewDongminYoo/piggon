type AdminIdentity = {
  app_metadata: {
    provider?: unknown;
  };
  email?: string | null;
  email_confirmed_at?: string | null;
};

export function isAuthorizedGoogleAdmin(
  user: AdminIdentity,
  adminGoogleEmail: string,
): boolean {
  return (
    user.app_metadata.provider === "google" &&
    Boolean(user.email_confirmed_at) &&
    user.email?.toLowerCase() === adminGoogleEmail
  );
}
