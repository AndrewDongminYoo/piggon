import { NextResponse } from "next/server";

import { getSafeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const callbackUrl = new URL("/auth/callback", requestUrl.origin);
  callbackUrl.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: true,
    },
    provider: "google",
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL("/auth/auth-code-error", requestUrl.origin),
    );
  }

  return NextResponse.redirect(data.url);
}
