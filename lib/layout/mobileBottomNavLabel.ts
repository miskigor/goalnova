/** Fit five bottom-nav labels on narrow mobile without changing page copy. */
export function mobileBottomNavDisplayLabel(full: string): string {
  const trimmed = full.trim();
  if (trimmed.length <= 8) return trimmed;
  return `${trimmed.slice(0, 7)}…`;
}
