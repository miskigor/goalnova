/** Logged-in mobile shell — always V1 portaled header + bottom nav. */
export type MobileShellVariant = "v1";

export function getMobileShellVariant(): MobileShellVariant {
  return "v1";
}

export function usesPortaledMobileChrome(): boolean {
  return true;
}
