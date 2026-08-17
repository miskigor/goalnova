import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AnyClient = SupabaseClient<Database>;

type MembershipClubRow = {
  club_id: string;
  partnership_status: string | null;
  verified_partner: boolean | null;
};

type ProfileSubRow = {
  stripe_subscription_id?: string | null;
  club_premium_club_id?: string | null;
};

function asTable(service: AnyClient, name: string) {
  return service.from(name as never);
}

function hasStripe(row: ProfileSubRow | null): boolean {
  return Boolean(String(row?.stripe_subscription_id ?? "").trim());
}

function premiumPeriodEndIso(): string {
  return new Date(Date.now() + 10 * 365.25 * 24 * 60 * 60 * 1000).toISOString();
}

async function latestApprovedClub(
  service: AnyClient,
  userId: string,
): Promise<MembershipClubRow | null> {
  const { data: membership } = await asTable(service, "club_memberships")
    .select("club_id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const clubId = String((membership as { club_id?: string } | null)?.club_id ?? "").trim();
  if (!clubId) return null;

  const { data: club } = await asTable(service, "clubs")
    .select("id, partnership_status, verified_partner")
    .eq("id", clubId)
    .maybeSingle();
  const clubRow = club as {
    id?: string;
    partnership_status?: string | null;
    verified_partner?: boolean | null;
  } | null;
  if (!clubRow?.id) return null;

  return {
    club_id: clubRow.id,
    partnership_status: clubRow.partnership_status ?? null,
    verified_partner: clubRow.verified_partner ?? null,
  };
}

async function loadProfileSub(service: AnyClient, userId: string): Promise<ProfileSubRow | null> {
  const full = await asTable(service, "player_profiles")
    .select("stripe_subscription_id, club_premium_club_id")
    .eq("id", userId)
    .maybeSingle();
  if (!full.error) {
    return (full.data as ProfileSubRow | null) ?? null;
  }

  const fallback = await asTable(service, "player_profiles")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();
  return (fallback.data as ProfileSubRow | null) ?? null;
}

async function patchPlayerClubFields(
  service: AnyClient,
  userId: string,
  clubId: string | null,
  verified: boolean,
): Promise<void> {
  const { error } = await asTable(service, "player_profiles")
    .update({ club_id: clubId, club_verified: verified } as never)
    .eq("id", userId);
  if (error) {
    await asTable(service, "player_profiles")
      .update({ club_id: clubId } as never)
      .eq("id", userId);
  }
}

export async function syncClubMemberPremiumForUser(
  service: AnyClient,
  userId: string,
): Promise<{ granted: boolean; revoked: boolean }> {
  const membership = await latestApprovedClub(service, userId);

  if (!membership) {
    await patchPlayerClubFields(service, userId, null, false);
    const profile = await loadProfileSub(service, userId);
    if (!profile?.club_premium_club_id || hasStripe(profile)) {
      return { granted: false, revoked: false };
    }

    await asTable(service, "player_profiles")
      .update({
        subscription_plan: "free",
        subscription_status: "inactive",
        subscription_current_period_end: null,
        club_premium_club_id: null,
      } as never)
      .eq("id", userId);

    const { data: userRow } = await asTable(service, "users")
      .select("stripe_subscription_id")
      .eq("id", userId)
      .maybeSingle();
    if (!hasStripe(userRow as ProfileSubRow | null)) {
      await asTable(service, "users")
        .update({
          subscription_plan: "free",
          subscription_status: "inactive",
          subscription_current_period_end: null,
          is_premium: false,
        } as never)
        .eq("id", userId);
    }

    return { granted: false, revoked: true };
  }

  const verified =
    membership.partnership_status === "active" && membership.verified_partner === true;
  await patchPlayerClubFields(service, userId, membership.club_id, verified);

  const profile = await loadProfileSub(service, userId);
  if (hasStripe(profile)) {
    return { granted: false, revoked: false };
  }

  const periodEnd = premiumPeriodEndIso();
  const grantPatch = {
    subscription_plan: "player_premium",
    subscription_status: "active",
    subscription_current_period_end: periodEnd,
    club_premium_club_id: membership.club_id,
  };
  const granted = await asTable(service, "player_profiles")
    .update(grantPatch as never)
    .eq("id", userId);
  if (granted.error) {
    await asTable(service, "player_profiles")
      .update({
        subscription_plan: "player_premium",
        subscription_status: "active",
        subscription_current_period_end: periodEnd,
      } as never)
      .eq("id", userId);
  }

  const { data: userRow } = await asTable(service, "users")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();
  if (!hasStripe(userRow as ProfileSubRow | null)) {
    await asTable(service, "users")
      .update({
        subscription_plan: "player_premium",
        subscription_status: "active",
        subscription_current_period_end: periodEnd,
        is_premium: true,
      } as never)
      .eq("id", userId);
  }

  return { granted: true, revoked: false };
}

export async function syncClubMemberPremiumForClub(
  service: AnyClient,
  clubId: string,
): Promise<{ synced: number }> {
  const { data } = await asTable(service, "club_memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("status", "approved");
  const userIds = [...new Set((data ?? []).map((row) => String((row as { user_id?: string }).user_id ?? "")).filter(Boolean))];
  for (const userId of userIds) {
    await syncClubMemberPremiumForUser(service, userId);
  }
  return { synced: userIds.length };
}
