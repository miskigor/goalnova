export const CLUB_ORGANIZATION_KINDS = ["club", "academy"] as const;

export type ClubOrganizationKind = (typeof CLUB_ORGANIZATION_KINDS)[number];

export function parseClubOrganizationKind(value: unknown): ClubOrganizationKind {
  return String(value ?? "").trim().toLowerCase() === "academy" ? "academy" : "club";
}
