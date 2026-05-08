/** Body line for social prefills (English product copy). */
export const VIDEO_SHARE_BODY =
  "Check out this football highlight on PitchRusch";

/** Modal title line: player name + PitchRusch. */
export function videoShareTitle(playerDisplayName: string): string {
  const name = playerDisplayName.trim() || "Player";
  return `${name} · PitchRusch`;
}
