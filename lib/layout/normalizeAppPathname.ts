import { routing } from "@/i18n/routing";

/** Strip optional locale prefix so route checks work on `/hr/profile` and `/profile`. */
export function normalizeAppPathname(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = path.split("/").filter(Boolean);
  const first = segments[0];
  if (first && (routing.locales as readonly string[]).includes(first)) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return path;
}
