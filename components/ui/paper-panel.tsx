import type { ComponentPropsWithoutRef } from "react";

export function PaperPanel({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return <section className={`paper-panel ${className}`.trim()} {...props} />;
}
