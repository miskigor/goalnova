import type { HTMLAttributes } from "react";

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[parts.length - 1]?.[0] ?? "";
    return `${a}${b}`.toUpperCase().slice(0, 2);
  }
  return trimmed.slice(0, 2).toUpperCase();
}

type Props = {
  name: string;
  /** Pixel-ish size class, e.g. h-12 w-12 */
  sizeClassName?: string;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

/**
 * Placeholder “profile photo” from display name until a real avatar URL exists in data.
 */
export function ProfileInitialsAvatar({
  name,
  sizeClassName = "h-14 w-14",
  className = "",
  ...rest
}: Props) {
  const label = name.trim() || "Player";
  const initials = initialsFromName(label);

  return (
    <div
      {...rest}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-tight text-gn-text",
        sizeClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      {initials}
    </div>
  );
}
