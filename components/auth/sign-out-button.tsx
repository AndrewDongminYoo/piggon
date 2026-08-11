"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSignOut() {
    setIsPending(true);
    setErrorMessage("");

    const supabase = createClient();
    const failed = await supabase.auth
      .signOut()
      .then(({ error }) => Boolean(error))
      .catch(() => true);

    // Navigating away would say the session ended while it is still live, which
    // is the dangerous direction to be wrong in on a shared device.
    if (failed) {
      setErrorMessage(
        "로그아웃하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
      );
      setIsPending(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <button
        className="sign-out-button"
        disabled={isPending}
        onClick={handleSignOut}
        type="button"
      >
        {isPending ? "로그아웃 중…" : "로그아웃"}
      </button>
      {errorMessage ? (
        <p
          className="visit-action-message visit-action-message--error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
