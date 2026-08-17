import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { mapManagedClubProfile, type ManagedClubProfile } from "@/lib/clubs/managedClubProfile";

export type AuthClubUser = {
  userId: string;
  email: string | null;
};

type AnyClient = SupabaseClient<Database>;

function asTable(service: AnyClient, name: string) {
  return service.from(name as never);
}

export async function authClubUserFromRequest(request: Request): Promise<AuthClubUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  const client = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.id) return null;

  return {
    userId: data.user.id,
    email: data.user.email?.trim().toLowerCase() || null,
  };
}

function collectEmails(authEmail: string | null, profileEmail: string | null): string[] {
  const set = new Set<string>();
  for (const value of [authEmail, profileEmail]) {
    const email = value?.trim().toLowerCase();
    if (email) set.add(email);
  }
  return [...set];
}

async function profileEmailForUser(service: AnyClient, userId: string): Promise<string | null> {
  const { data } = await asTable(service, "users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { email?: string | null } | null;
  return row?.email?.trim().toLowerCase() || null;
}

export async function userManagesClub(
  service: AnyClient,
  clubId: string,
  user: AuthClubUser,
): Promise<boolean> {
  const emails = collectEmails(user.email, await profileEmailForUser(service, user.userId));

  const { data: club } = await asTable(service, "clubs")
    .select("id, coach_user_id, contact_email")
    .eq("id", clubId)
    .maybeSingle();
  const clubRow = club as {
    id?: string;
    coach_user_id?: string | null;
    contact_email?: string | null;
  } | null;
  if (!clubRow?.id) return false;

  if (clubRow.coach_user_id && clubRow.coach_user_id === user.userId) return true;

  const contact = clubRow.contact_email?.trim().toLowerCase() || "";
  if (contact && emails.includes(contact)) return true;

  const { data: membership } = await asTable(service, "club_memberships")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", user.userId)
    .eq("status", "approved")
    .eq("is_admin", true)
    .maybeSingle();
  if (membership) return true;

  const { data: request } = await asTable(service, "club_partnership_requests")
    .select("id")
    .eq("created_club_id", clubId)
    .eq("applicant_user_id", user.userId)
    .eq("status", "approved")
    .maybeSingle();
  if (request) return true;

  return false;
}

export async function listManagedClubs(
  service: AnyClient,
  user: AuthClubUser,
): Promise<ManagedClubProfile[]> {
  const emails = collectEmails(user.email, await profileEmailForUser(service, user.userId));
  const byId = new Map<string, Record<string, unknown>>();

  const selectCols =
    "id, name, slug, logo_url, cover_url, city, country, website, instagram, description, contact_person, contact_email, club_code";

  const { data: asCoach, error: coachError } = await asTable(service, "clubs")
    .select(selectCols)
    .eq("coach_user_id", user.userId);
  if (!coachError) {
    for (const row of asCoach ?? []) {
      const rec = row as Record<string, unknown>;
      if (rec.id) byId.set(String(rec.id), rec);
    }
  }

  if (emails.length > 0) {
    for (const email of emails) {
      const { data: asContact } = await asTable(service, "clubs")
        .select(selectCols)
        .ilike("contact_email", email);
      for (const row of asContact ?? []) {
        const rec = row as Record<string, unknown>;
        if (rec.id) byId.set(String(rec.id), rec);
      }
    }
  }

  const { data: memberships } = await asTable(service, "club_memberships")
    .select("club_id")
    .eq("user_id", user.userId)
    .eq("status", "approved")
    .eq("is_admin", true);
  const memberClubIds = (memberships ?? [])
    .map((row) => String((row as { club_id?: string }).club_id ?? ""))
    .filter(Boolean);
  if (memberClubIds.length > 0) {
    const { data: memberClubs } = await asTable(service, "clubs")
      .select(selectCols)
      .in("id", memberClubIds);
    for (const row of memberClubs ?? []) {
      const rec = row as Record<string, unknown>;
      if (rec.id) byId.set(String(rec.id), rec);
    }
  }

  const { data: requests, error: requestError } = await asTable(service, "club_partnership_requests")
    .select("created_club_id")
    .eq("applicant_user_id", user.userId)
    .eq("status", "approved")
    .not("created_club_id", "is", null);
  const requestClubIds = requestError
    ? []
    : (requests ?? [])
        .map((row) => String((row as { created_club_id?: string | null }).created_club_id ?? ""))
        .filter(Boolean);
  if (requestClubIds.length > 0) {
    const { data: requestClubs } = await asTable(service, "clubs")
      .select(selectCols)
      .in("id", requestClubIds);
    for (const row of requestClubs ?? []) {
      const rec = row as Record<string, unknown>;
      if (rec.id) byId.set(String(rec.id), rec);
    }
  }

  return [...byId.values()]
    .map(mapManagedClubProfile)
    .filter((club) => Boolean(club.id));
}

export function requireServiceRole(): AnyClient | null {
  return createServiceRoleClient();
}
