import { getSafeNextPath } from "@/lib/auth/redirect";

type GoogleSignInProps = {
  nextPath?: string;
};

export function GoogleSignIn({ nextPath = "/" }: GoogleSignInProps) {
  const searchParams = new URLSearchParams({
    next: getSafeNextPath(nextPath),
  });

  return (
    <a
      className="google-sign-in-link"
      href={`/auth/login?${searchParams.toString()}`}
    >
      Google로 로그인
    </a>
  );
}
