"use client";

import { useState } from "react";

import { getSafeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

type GoogleSignInProps = {
  nextPath?: string;
};

export function GoogleSignIn({ nextPath }: GoogleSignInProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSignIn() {
    setErrorMessage(null);
    setIsPending(true);

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set(
      "next",
      getSafeNextPath(nextPath ?? currentPath),
    );

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setErrorMessage("Google 로그인을 시작하지 못했습니다.");
      setIsPending(false);
    }
  }

  return (
    <div>
      <button disabled={isPending} onClick={handleSignIn} type="button">
        {isPending ? "Google로 이동 중…" : "Google로 로그인"}
      </button>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
    </div>
  );
}
