import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  mapManagedClubProfile,
  type ManagedClubProfile,
} from "@/lib/clubs/managedClubProfile";

export type { ManagedClubProfile };
export { mapManagedClubProfile };

export type ClubPartnershipStatus = "pending" | "active" | "suspended";

export type ClubListRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  country: string | null;
  city: string | null;
  club_code: string;
  verified_partner: boolean;
  partnership_status: ClubPartnershipStatus;
  approved_player_count: number;
  total_xp: number;
  total_videos: number;
  club_score: number;
  global_rank: number | null;
};

export type ClubTopPlayer = {
  user_id: string;
  display_name: string;
  username: string;
  country: string | null;
  avatar_url: string | null;
  xp: number;
  club_verified: boolean;
};

export type ClubRecentVideo = {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  created_at: string;
  user_id: string;
};

export type ClubPublicDetail = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  instagram: string | null;
  description: string | null;
  club_code: string;
  verified_partner: boolean;
  partnership_status: ClubPartnershipStatus;
  approved_player_count: number;
  total_xp: number;
  total_videos: number;
  club_score: number;
  global_rank: number | null;
  showcase_public: boolean;
  minimum_players_required: number;
};

export type PlayerClubBadge = {
  has_club: boolean;
  club_id?: string;
  club_name?: string;
  club_slug?: string;
  club_verified?: boolean;
  verified_academy?: boolean;
};

function isMissingClubRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? "").toUpperCase();
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "PGRST202" ||
    code === "42883" ||
    message.includes("could not find the function")
  );
}

export type ClubDashboardPlayer = {
  membership_id: string;
  user_id: string;
  display_name: string;
  username: string;
  country: string | null;
  avatar_url: string | null;
  xp: number;
  videos: number;
  is_admin: boolean;
  created_at: string;
};

export type ClubDashboardPending = {
  membership_id: string;
  user_id: string;
  display_name: string;
  username: string;
  country: string | null;
  avatar_url: string | null;
  created_at: string;
};

function mapClubRow(r: Record<string, unknown>): ClubListRow {
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    logo_url: (r.logo_url as string | null) ?? null,
    cover_url: (r.cover_url as string | null) ?? null,
    country: (r.country as string | null) ?? null,
    city: (r.city as string | null) ?? null,
    club_code: String(r.club_code),
    verified_partner: Boolean(r.verified_partner),
    partnership_status: r.partnership_status as ClubPartnershipStatus,
    approved_player_count: Number(r.approved_player_count ?? 0),
    total_xp: Number(r.total_xp ?? 0),
    total_videos: Number(r.total_videos ?? 0),
    club_score: Number(r.club_score ?? 0),
    global_rank: r.global_rank != null ? Number(r.global_rank) : null,
  };
}

export async function rpcClubsListPublic(
  search?: string,
  limit = 24,
  offset = 0,
): Promise<{ rows: ClubListRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_clubs_list_public", {
    p_search: search?.trim() || null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_clubs_list_public", error);
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []).map((r) => mapClubRow(r as Record<string, unknown>)), error: null };
}

export async function rpcClubRankingsPublic(
  limit = 20,
): Promise<{ rows: ClubListRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_club_rankings_public", { p_limit: limit });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_rankings_public", error);
    return { rows: [], error: error.message };
  }
  return { rows: (data ?? []).map((r) => mapClubRow(r as Record<string, unknown>)), error: null };
}

export async function rpcClubGetPublic(slug: string): Promise<{
  found: boolean;
  club: ClubPublicDetail | null;
  topPlayers: ClubTopPlayer[];
  recentVideos: ClubRecentVideo[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_club_get_public", { p_slug: slug });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_get_public", error);
    return { found: false, club: null, topPlayers: [], recentVideos: [], error: error.message };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  if (!payload.found) {
    return { found: false, club: null, topPlayers: [], recentVideos: [], error: null };
  }
  const club = payload.club as ClubPublicDetail;
  return {
    found: true,
    club,
    topPlayers: (payload.top_players ?? []) as ClubTopPlayer[],
    recentVideos: (payload.recent_videos ?? []) as ClubRecentVideo[],
    error: null,
  };
}

export async function rpcPlayerClubBadge(userId: string): Promise<{
  badge: PlayerClubBadge;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_player_club_badge", { p_user_id: userId });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_player_club_badge", error);
    return { badge: { has_club: false }, error: error.message };
  }
  return { badge: (data ?? { has_club: false }) as PlayerClubBadge, error: null };
}

export async function rpcClubJoin(options: {
  clubId?: string;
  clubCode?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  clubId?: string;
  clubName?: string;
  membershipId?: string;
}> {
  const { data, error } = await supabase.rpc("goalnova_club_join", {
    p_club_id: options.clubId ?? null,
    p_club_code: options.clubCode?.trim().toUpperCase() ?? null,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_join", error);
    return { ok: false, error: error.message };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  if (!payload.ok) {
    return { ok: false, error: String(payload.error ?? "join_failed") };
  }
  return {
    ok: true,
    clubId: String(payload.club_id),
    clubName: String(payload.club_name ?? ""),
    membershipId: payload.membership_id ? String(payload.membership_id) : undefined,
  };
}

export async function rpcClubReviewMembership(
  membershipId: string,
  approve: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("goalnova_club_review_membership", {
    p_membership_id: membershipId,
    p_approve: approve,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_review_membership", error);
    return { ok: false, error: error.message };
  }
  return { ok: Boolean((data as Record<string, unknown>)?.ok) };
}

export async function rpcClubAcceptPartnershipAgreement(
  clubId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("goalnova_club_accept_partnership_agreement", {
    p_club_id: clubId,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_accept_partnership_agreement", error);
    return { ok: false, error: error.message };
  }
  return { ok: Boolean((data as Record<string, unknown>)?.ok) };
}

async function authBearerToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function fetchManagedClubsViaApi(): Promise<ManagedClubProfile[] | null> {
  const token = await authBearerToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/clubs/managed", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      clubs?: unknown;
    };
    if (!res.ok || !payload.ok || !Array.isArray(payload.clubs)) return null;
    return payload.clubs
      .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
      .map(mapManagedClubProfile)
      .filter((club) => Boolean(club.id));
  } catch {
    return null;
  }
}

function mergeManagedClubs(
  a: ManagedClubProfile[],
  b: ManagedClubProfile[],
): ManagedClubProfile[] {
  const byId = new Map<string, ManagedClubProfile>();
  for (const club of [...a, ...b]) {
    byId.set(club.id, { ...byId.get(club.id), ...club });
  }
  return [...byId.values()];
}

export async function rpcClubManagedList(): Promise<{
  clubs: ManagedClubProfile[];
  missingRpc: boolean;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_club_managed_list");
  let rpcClubs: ManagedClubProfile[] = [];
  let missingRpc = false;
  if (error) {
    missingRpc = isMissingClubRpc(error);
    if (!missingRpc) {
      logFullSupabaseError("[clubs] goalnova_club_managed_list", error);
    }
  } else {
    const payload = (data ?? {}) as Record<string, unknown>;
    const rows = Array.isArray(payload.clubs) ? payload.clubs : [];
    rpcClubs = rows
      .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
      .map(mapManagedClubProfile)
      .filter((club) => Boolean(club.id));
  }

  const apiClubs = await fetchManagedClubsViaApi();
  if (apiClubs) {
    return { clubs: mergeManagedClubs(rpcClubs, apiClubs), missingRpc: false, error: null };
  }

  if (rpcClubs.length > 0) {
    return { clubs: rpcClubs, missingRpc: false, error: null };
  }

  if (missingRpc) {
    return { clubs: [], missingRpc: true, error: null };
  }
  return { clubs: [], missingRpc: false, error: error?.message ?? null };
}

export async function rpcClubUpdateProfile(input: {
  clubId: string;
  name: string;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  instagram?: string | null;
  description?: string | null;
  contactPerson?: string | null;
}): Promise<{ ok: boolean; club?: ManagedClubProfile; error?: string; missingRpc?: boolean }> {
  const { data, error } = await supabase.rpc("goalnova_club_update_profile", {
    p_club_id: input.clubId,
    p_name: input.name,
    p_city: input.city ?? null,
    p_country: input.country ?? null,
    p_website: input.website ?? null,
    p_instagram: input.instagram ?? null,
    p_description: input.description ?? null,
    p_contact_person: input.contactPerson ?? null,
  });
  if (!error) {
    const payload = (data ?? {}) as Record<string, unknown>;
    if (payload.ok) {
      const clubRaw =
        payload.club && typeof payload.club === "object"
          ? (payload.club as Record<string, unknown>)
          : null;
      return {
        ok: true,
        club: clubRaw ? mapManagedClubProfile(clubRaw) : undefined,
      };
    }
  }

  const token = await authBearerToken();
  if (token) {
    try {
      const res = await fetch("/api/clubs/update-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clubId: input.clubId,
          name: input.name,
          city: input.city ?? null,
          country: input.country ?? null,
          website: input.website ?? null,
          instagram: input.instagram ?? null,
          description: input.description ?? null,
          contactPerson: input.contactPerson ?? null,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: string;
        club?: Record<string, unknown>;
      };
      if (res.ok && payload.ok && payload.club) {
        return { ok: true, club: mapManagedClubProfile(payload.club) };
      }
      if (payload.reason === "name_required") {
        return { ok: false, error: "name_required" };
      }
      if (payload.reason === "forbidden") {
        return { ok: false, error: "forbidden" };
      }
    } catch {
      /* fall through */
    }
  }

  if (error && isMissingClubRpc(error)) {
    return { ok: false, missingRpc: true, error: "missing_rpc" };
  }
  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_update_profile", error);
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "save_failed" };
}

export async function rpcClubUpdateLogo(
  clubId: string,
  logoUrl: string | null,
): Promise<{ ok: boolean; logoUrl?: string | null; error?: string }> {
  const { data, error } = await supabase.rpc("goalnova_club_update_logo", {
    p_club_id: clubId,
    p_logo_url: logoUrl,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_update_logo", error);
    return { ok: false, error: error.message };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(payload.ok),
    logoUrl: payload.logo_url == null ? null : String(payload.logo_url),
    error: payload.error ? String(payload.error) : undefined,
  };
}

export async function rpcClubDashboard(clubId: string): Promise<{
  ok: boolean;
  club: Record<string, unknown> | null;
  pending: ClubDashboardPending[];
  players: ClubDashboardPlayer[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_club_dashboard", { p_club_id: clubId });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_dashboard", error);
    return { ok: false, club: null, pending: [], players: [], error: error.message };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  if (!payload.ok) {
    return { ok: false, club: null, pending: [], players: [], error: String(payload.error ?? "not_found") };
  }
  return {
    ok: true,
    club: (payload.club as Record<string, unknown>) ?? null,
    pending: (payload.pending ?? []) as ClubDashboardPending[],
    players: (payload.players ?? []) as ClubDashboardPlayer[],
    error: null,
  };
}

export async function rpcClubSubmitPartnershipRequest(input: {
  clubName: string;
  country: string;
  contactPerson: string;
  email: string;
  instagram?: string;
  website?: string;
  estimatedPlayers?: number;
  message?: string;
  proofStoragePath?: string;
  proofFileName?: string;
}): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const baseArgs = {
    p_club_name: input.clubName,
    p_country: input.country,
    p_contact_person: input.contactPerson,
    p_email: input.email,
    p_instagram: input.instagram ?? null,
    p_website: input.website ?? null,
    p_estimated_players: input.estimatedPlayers ?? null,
    p_message: input.message ?? null,
  };

  const withProof =
    input.proofStoragePath && input.proofFileName
      ? {
          ...baseArgs,
          p_proof_storage_path: input.proofStoragePath,
          p_proof_file_name: input.proofFileName,
        }
      : baseArgs;

  let { data, error } = await supabase.rpc(
    "goalnova_club_submit_partnership_request",
    withProof as never,
  );

  const missingFn =
    Boolean(error) &&
    (((error as { code?: string } | null)?.code === "PGRST202") ||
      (error?.message ?? "").toLowerCase().includes("could not find the function"));

  if (missingFn) {
    const fallback = await supabase.rpc("goalnova_club_submit_partnership_request", baseArgs);
    data = fallback.data;
    error = fallback.error;
  }

  if (!error) {
    const firstPayload = (data ?? {}) as Record<string, unknown>;
    if (firstPayload.ok === false && String(firstPayload.error ?? "") === "proof_required") {
      const fallback = await supabase.rpc("goalnova_club_submit_partnership_request", baseArgs);
      if (!fallback.error) {
        data = fallback.data;
      }
    }
  }

  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_submit_partnership_request", error);
    return { ok: false, error: error.message };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  if (!payload.ok) {
    return { ok: false, error: String(payload.error ?? "submit_failed") };
  }
  return {
    ok: true,
    requestId: payload.request_id ? String(payload.request_id) : undefined,
  };
}

function normalizeRpcJsonRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((row): row is Record<string, unknown> => row !== null && typeof row === "object");
  }
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return normalizeRpcJsonRows(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export async function rpcAdminClubsList(): Promise<{
  rows: Record<string, unknown>[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_admin_clubs_list");
  if (error) {
    logFullSupabaseError("[clubs] goalnova_admin_clubs_list", error);
    return { rows: [], error: error.message };
  }
  return { rows: normalizeRpcJsonRows(data), error: null };
}

export async function rpcAdminClubRequestsList(): Promise<{
  rows: Record<string, unknown>[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_admin_club_requests_list");
  if (error) {
    logFullSupabaseError("[clubs] goalnova_admin_club_requests_list", error);
    return { rows: [], error: error.message };
  }
  return { rows: normalizeRpcJsonRows(data), error: null };
}

export async function fetchAdminPendingClubRequestCount(): Promise<number> {
  const { rows, error } = await rpcAdminClubRequestsList();
  if (error) return 0;
  return rows.filter((row) => String(row.status ?? "pending") === "pending").length;
}

export async function rpcAdminClubApproveRequest(
  requestId: string,
): Promise<{ ok: boolean; clubId?: string; slug?: string; clubCode?: string; error?: string }> {
  const { data, error } = await supabase.rpc("goalnova_admin_club_approve_request", {
    p_request_id: requestId,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_admin_club_approve_request", error);
    return { ok: false, error: error.message };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(payload.ok),
    clubId: payload.club_id ? String(payload.club_id) : undefined,
    slug: payload.slug ? String(payload.slug) : undefined,
    clubCode: payload.club_code ? String(payload.club_code) : undefined,
    error: payload.error ? String(payload.error) : undefined,
  };
}

export async function rpcAdminClubRejectRequest(
  requestId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("goalnova_admin_club_reject_request", {
    p_request_id: requestId,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_admin_club_reject_request", error);
    return { ok: false, error: error.message };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(payload.ok),
    error: payload.error ? String(payload.error) : undefined,
  };
}

export async function rpcAdminClubDelete(
  clubId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("goalnova_admin_club_delete", {
    p_club_id: clubId,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_admin_club_delete", error);
    return { ok: false, error: error.message };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(payload.ok),
    error: payload.error ? String(payload.error) : undefined,
  };
}

export async function rpcAdminClubSetStatus(
  clubId: string,
  status: ClubPartnershipStatus,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("goalnova_admin_club_set_status", {
    p_club_id: clubId,
    p_status: status,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_admin_club_set_status", error);
    return { ok: false, error: error.message };
  }
  return { ok: Boolean((data as Record<string, unknown>)?.ok) };
}
