import { isBootstrapAdminEmail } from "@/lib/admin/bootstrapAdminEmails";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { SCOUT_VERIFICATION_DOCUMENTS_BUCKET } from "@/lib/supabase/scoutVerificationUpload";

export type ScoutVerificationApplicationRow =
  Database["public"]["Tables"]["scout_verification_applications"]["Row"];

export type AdminStaffRole = "super_admin" | "support_admin" | "moderator";

function effectiveStaffRole(row: {
  is_admin?: boolean | null;
  admin_role?: string | null;
} | null): AdminStaffRole | null {
  if (!row) return null;
  const ar = row.admin_role?.trim();
  if (ar === "super_admin" || ar === "support_admin" || ar === "moderator") {
    return ar;
  }
  if (row.is_admin) return "super_admin";
  return null;
}

/** True when the row is an effective `super_admin` (explicit role or legacy `is_admin`). */
export function isEffectiveSuperAdmin(row: {
  is_admin?: boolean | null;
  admin_role?: string | null;
} | null): boolean {
  return effectiveStaffRole(row) === "super_admin";
}

/** Staff may access `/admin/*` (any `admin_role` tier or legacy `is_admin`). */
export function isStaffUser(row: {
  is_admin?: boolean | null;
  admin_role?: string | null;
} | null): boolean {
  return effectiveStaffRole(row) !== null;
}

export type StaffAccess = {
  isStaff: boolean;
  /** Effective role; legacy `is_admin` maps to `super_admin`. */
  role: AdminStaffRole | null;
  isSuperAdmin: boolean;
  isSupportAdmin: boolean;
  isModerator: boolean;
  error: string | null;
};

export async function fetchStaffAccess(): Promise<StaffAccess> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    logFullSupabaseError("[admin] getSession for staff", sessionError);
    return {
      isStaff: false,
      role: null,
      isSuperAdmin: false,
      isSupportAdmin: false,
      isModerator: false,
      error: sessionError.message,
    };
  }
  const uid = sessionData.session?.user?.id ?? null;
  const sessionEmail = sessionData.session?.user?.email ?? null;
  if (!uid) {
    return {
      isStaff: false,
      role: null,
      isSuperAdmin: false,
      isSupportAdmin: false,
      isModerator: false,
      error: null,
    };
  }

  if (isBootstrapAdminEmail(sessionEmail)) {
    return {
      isStaff: true,
      role: "super_admin",
      isSuperAdmin: true,
      isSupportAdmin: false,
      isModerator: false,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("users")
    .select("is_admin, admin_role")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[admin] select users staff fields", error, { uid });
    return {
      isStaff: false,
      role: null,
      isSuperAdmin: false,
      isSupportAdmin: false,
      isModerator: false,
      error: error.message,
    };
  }

  const role = effectiveStaffRole(data);
  const isStaff = role !== null;

  return {
    isStaff,
    role,
    isSuperAdmin: role === "super_admin",
    isSupportAdmin: role === "support_admin",
    isModerator: role === "moderator",
    error: null,
  };
}

/**
 * Whether the signed-in user may open `/admin/*` (any staff role or legacy `is_admin`).
 */
export async function fetchIsAdminForCurrentUser(): Promise<{
  isAdmin: boolean;
  error: string | null;
}> {
  const s = await fetchStaffAccess();
  return { isAdmin: s.isStaff, error: s.error };
}

export async function fetchAllScoutVerificationApplications(): Promise<{
  rows: ScoutVerificationApplicationRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("scout_verification_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logFullSupabaseError("[admin] list scout_verification_applications", error);
    return { rows: [], error: error.message };
  }

  return { rows: (data ?? []) as ScoutVerificationApplicationRow[], error: null };
}

export async function adminReviewScoutVerification(
  subjectUserId: string,
  action: "approve" | "reject",
): Promise<{ ok: boolean; error: string | null; noop?: boolean }> {
  const { data, error } = await supabase.rpc("admin_review_scout_verification", {
    p_subject_user_id: subjectUserId,
    p_action: action,
  });

  if (error) {
    logFullSupabaseError(
      "[admin] admin_review_scout_verification RPC",
      error,
      { subjectUserId, action },
    );
    return { ok: false, error: error.message };
  }

  const body = data as { ok?: boolean; noop?: boolean } | null;
  const noop = Boolean(body?.noop);
  return { ok: true, error: null, noop };
}

/**
 * Time-limited URL for a private proof object (admin RLS + signed URL).
 */
export async function createScoutProofSignedUrl(
  storagePath: string,
  expiresSec = 600,
): Promise<{ url: string | null; error: string | null }> {
  const path = storagePath.trim();
  if (!path) {
    logFullSupabaseError(
      "[admin] createScoutProofSignedUrl: empty path",
      new Error("missing_path"),
    );
    return { url: null, error: "Missing document path" };
  }

  const { data, error } = await supabase.storage
    .from(SCOUT_VERIFICATION_DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresSec);

  if (error) {
    logFullSupabaseError("[admin] storage.createSignedUrl scout proof", error, {
      path,
    });
    return { url: null, error: error.message };
  }

  return { url: data?.signedUrl ?? null, error: null };
}
