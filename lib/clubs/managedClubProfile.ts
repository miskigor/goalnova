export type ManagedClubProfile = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  instagram: string | null;
  description: string | null;
  contact_person: string | null;
  contact_email: string | null;
  club_code: string | null;
};

function nullableText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export function mapManagedClubProfile(raw: Record<string, unknown>): ManagedClubProfile {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    logo_url: nullableText(raw.logo_url),
    cover_url: nullableText(raw.cover_url),
    city: nullableText(raw.city),
    country: nullableText(raw.country),
    website: nullableText(raw.website),
    instagram: nullableText(raw.instagram),
    description: nullableText(raw.description),
    contact_person: nullableText(raw.contact_person),
    contact_email: nullableText(raw.contact_email),
    club_code: nullableText(raw.club_code),
  };
}
