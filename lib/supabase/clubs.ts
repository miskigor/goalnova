import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

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
}): Promise<{ ok: boolean; error?: string; clubId?: string; clubName?: string }> {
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
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("goalnova_club_submit_partnership_request", {
    p_club_name: input.clubName,
    p_country: input.country,
    p_contact_person: input.contactPerson,
    p_email: input.email,
    p_instagram: input.instagram ?? null,
    p_website: input.website ?? null,
    p_estimated_players: input.estimatedPlayers ?? null,
    p_message: input.message ?? null,
  });
  if (error) {
    logFullSupabaseError("[clubs] goalnova_club_submit_partnership_request", error);
    return { ok: false, error: error.message };
  }
  return { ok: Boolean((data as Record<string, unknown>)?.ok) };
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
  return { rows: (data ?? []) as Record<string, unknown>[], error: null };
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
  return { rows: (data ?? []) as Record<string, unknown>[], error: null };
}

export async function rpcAdminClubApproveRequest(
  requestId: string,
): Promise<{ ok: boolean; slug?: string; clubCode?: string; error?: string }> {
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
    slug: payload.slug ? String(payload.slug) : undefined,
    clubCode: payload.club_code ? String(payload.club_code) : undefined,
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
