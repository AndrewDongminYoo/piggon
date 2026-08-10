import type { ComponentPropsWithoutRef } from "react";

type StampBadgeProps = ComponentPropsWithoutRef<"span"> & {
  tone?: "tomato" | "basil" | "ink";
};

export function StampBadge({
  className = "",
  tone = "ink",
  ...props
}: StampBadgeProps) {
  return (
    <span
      className={`stamp-badge stamp-badge--${tone} ${className}`.trim()}
      {...props}
    />
  );
}
