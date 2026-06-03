/** Dev-only: exact path for public `/player/[slug]` (no guessing). */
export function publicProfileDebug(
  event: string,
  payload: {
    i18nPathname: string;
    playerSlug: string;
    videosCount?: number;
    extra?: Record<string, unknown>;
  },
): void {
  if (process.env.NODE_ENV === "production") return;

  const browserPathname =
    typeof window !== "undefined" ? window.location.pathname : "(ssr)";

  console.warn(
    `[public-profile] ${event} | browser pathname=${browserPathname} | i18n pathname=${payload.i18nPathname} | slug=${payload.playerSlug}${
      payload.videosCount !== undefined ? ` | videos=${payload.videosCount}` : ""
    }`,
    {
      browserPathname,
      i18nPathname: payload.i18nPathname,
      playerSlug: payload.playerSlug,
      routeFile: "app/[locale]/(public)/player/[playerSlug]/page.tsx",
      component: "PlayerPublicProfilePage",
      ...payload.extra,
    },
  );
}
