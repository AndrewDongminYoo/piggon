const LOCAL_ORIGIN = "https://piggon.local";

export function getSafeNextPath(value: string | null): string {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  try {
    const url = new URL(value, LOCAL_ORIGIN);

    if (url.origin !== LOCAL_ORIGIN) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function getLoginPath(nextPath: string): string {
  const searchParams = new URLSearchParams({
    next: getSafeNextPath(nextPath),
  });

  return `/auth/login?${searchParams.toString()}`;
}
