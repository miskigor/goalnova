/** Road to World Cup 2026 in-app campaign (no DB). */
export const WORLD_CUP_CAMPAIGN_BANNER_SRC =
  "/campaign/road-to-world-cup-2026-banner-v5.png" as const;

export const WORLD_CUP_CAMPAIGN_END_ISO = "2026-06-11T23:59:59+02:00";

export function formatWorldCupCampaignEndDate(locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeZone: "Europe/Zagreb",
    }).format(new Date(WORLD_CUP_CAMPAIGN_END_ISO));
  } catch {
    return "11 June 2026";
  }
}
