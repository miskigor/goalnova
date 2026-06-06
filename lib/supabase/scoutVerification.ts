import {
  sanitizeEmailForStorage,
  sanitizeFullName,
  sanitizeOrganizationField,
  sanitizeScoutApplyDescription,
  sanitizeShortProfileField,
  sanitizeWebUrl,
} from "@/lib/profileFieldSanitize";
import { supabase } from "@/lib/supabase/client";
import { devWarn } from "@/lib/devLog";
import {
  extractPostgrestErrorFields,
  isLikelyTransientNetworkFailure,
  logFullSupabaseError,
} from "@/lib/supabase/logError";
import {
  parseScoutVerificationStatus,
  type ScoutVerificationStatus,
} from "@/lib/scoutVerification";

export type ScoutAccessRow = {
  role: string;
  scout_verification_status: ScoutVerificationStatus;
};

export async function fetchScoutAccessForUser(
  userId: string,
): Promise<{ row: ScoutAccessRow | null; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc("get_my_scout_access");

  if (error) {
    if (isLikelyTransientNetworkFailure(error)) {
      devWarn("[scoutVerification] fetch access skipped (transient network)", {
        userId,
        message: extractPostgrestErrorFields(error).message,
      });
      return { row: null, errorMessage: null };
    }
    logFullSupabaseError("[scoutVerification] fetch access", error, { userId });
    return { row: null, errorMessage: error.message };
  }

  const accessRow = Array.isArray(data) ? data[0] : data;
  if (!accessRow) {
    return { row: null, errorMessage: null };
  }

  return {
    row: {
      role: String(accessRow.role ?? "player"),
      scout_verification_status: parseScoutVerificationStatus(
        accessRow.scout_verification_status,
      ),
    },
    errorMessage: null,
  };
}

export type SubmitScoutApplicationInput = {
  fullName: string;
  organization: string;
  businessEmail: string;
  country: string;
  description: string;
  webUrl: string;
  /** Path within bucket `scout-verification-documents` (e.g. userId/timestamp-name.pdf). */
  proofDocumentStoragePath: string;
  proofDocumentName: string;
  proofDocumentType: string;
};

function sanitizeScoutApplicationInput(
  input: SubmitScoutApplicationInput,
): SubmitScoutApplicationInput {
  return {
    ...input,
    fullName: sanitizeFullName(input.fullName),
    organization: sanitizeOrganizationField(input.organization),
    businessEmail: sanitizeEmailForStorage(input.businessEmail),
    country: sanitizeShortProfileField(input.country),
    description: sanitizeScoutApplyDescription(input.description),
    webUrl: sanitizeWebUrl(input.webUrl),
  };
}

/**
 * PostgREST / Postgres signals that `submit_scout_verification_application` is not exposed or does not exist
 * (e.g. PGRST202). This is an **expected** situation when the RPC is not deployed yet — we use a direct table
 * upsert instead. Do not log these as application errors.
 *
 * Any other RPC error must not trigger fallback (wrong args, RLS, permission denied, etc.).
 */
function isSubmitScoutRpcMissingOrUnavailable(err: unknown): boolean {
  const f = extractPostgrestErrorFields(err);
  const code = (f.code ?? "").toUpperCase();
  const msg = f.message.toLowerCase();
  const details = (f.details ?? "").toLowerCase();
  const hint = (f.hint ?? "").toLowerCase();

  if (code === "PGRST202") return true;
  if (code === "42883") return true;
  if (f.status === 404) return true;
  if (msg.includes("could not find the function")) return true;
  if (msg.includes("function public.submit_scout_verification_application")) return true;
  if (details.includes("does not exist") && details.includes("function")) return true;
  if (hint.includes("function") && hint.includes("not find")) return true;
  return false;
}

type LegacyRpcRow = { success?: boolean; error_code?: string | null };

function isLegacyRpcResponse(data: unknown): data is LegacyRpcRow[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const row = data[0];
  return (
    row != null &&
    typeof row === "object" &&
    "success" in row &&
    typeof (row as LegacyRpcRow).success === "boolean"
  );
}

/**
 * Persists scout verification applications with:
 * - `user_id`, `proof_document_url` (storage path), name + MIME type
 * - `status` = 'pending' on row; `users.scout_verification_status` = 'pending'
 * Same invariants apply to `submit_scout_verification_application` RPC.
 */
async function submitScoutVerificationApplicationTableFallback(
  input: SubmitScoutApplicationInput,
  userId: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const proofPath = input.proofDocumentStoragePath.trim();
  const proofName = input.proofDocumentName.trim();
  const proofType = input.proofDocumentType.trim();
  if (!proofPath || !proofName || !proofType) {
    return { ok: false, code: "invalid_proof_metadata" };
  }

  if (!proofPath.startsWith(`${userId}/`)) {
    return { ok: false, code: "invalid_proof_metadata" };
  }

  const payload = {
    user_id: userId,
    full_name: input.fullName.trim(),
    organization: input.organization.trim(),
    business_email: input.businessEmail.trim(),
    country: input.country.trim(),
    description: input.description.trim() || null,
    web_url: input.webUrl.trim() || null,
    status: "pending" as const,
    proof_document_url: proofPath,
    proof_document_name: proofName,
    proof_document_type: proofType,
  };

  const { error: appError } = await supabase
    .from("scout_verification_applications")
    .upsert(payload, { onConflict: "user_id" });

  if (appError) {
    logFullSupabaseError(
      "[scoutVerification] submit fallback: upsert scout_verification_applications failed",
      appError,
      { userId },
    );
    return { ok: false, code: "fallback_upsert_failed" };
  }

  const { data: updatedRows, error: userError } = await supabase
    .from("users")
    .update({ scout_verification_status: "pending" })
    .eq("id", userId)
    .select("id");

  if (userError) {
    logFullSupabaseError(
      "[scoutVerification] submit fallback: update users.scout_verification_status failed",
      userError,
      { userId },
    );
    return { ok: false, code: "fallback_user_update_failed" };
  }

  if (!updatedRows?.length) {
    logFullSupabaseError(
      "[scoutVerification] submit fallback: users update affected 0 rows (RLS or missing user)",
      new Error("fallback_user_update_failed"),
      { userId },
    );
    return { ok: false, code: "fallback_user_update_failed" };
  }

  return { ok: true };
}

export async function submitScoutVerificationApplication(
  input: SubmitScoutApplicationInput,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    logFullSupabaseError(
      "[scoutVerification] submit: getSession failed",
      sessionError,
    );
    return { ok: false, code: "session_error" };
  }

  const userId = sessionData.session?.user?.id ?? null;
  if (!userId) {
    return { ok: false, code: "not_authenticated" };
  }

  const cleanInput = sanitizeScoutApplicationInput(input);

  const proofPath = cleanInput.proofDocumentStoragePath.trim();
  const proofName = cleanInput.proofDocumentName.trim();
  const proofType = cleanInput.proofDocumentType.trim();
  if (!proofPath || !proofName || !proofType) {
    return { ok: false, code: "invalid_proof_metadata" };
  }

  if (!proofPath.startsWith(`${userId}/`)) {
    return { ok: false, code: "invalid_proof_metadata" };
  }

  const rpcArgs = {
    p_business_email: cleanInput.businessEmail.trim(),
    p_country: cleanInput.country.trim(),
    p_description: cleanInput.description.trim(),
    p_full_name: cleanInput.fullName.trim(),
    p_organization: cleanInput.organization.trim(),
    p_web_url: cleanInput.webUrl.trim() || null,
    p_proof_document_url: proofPath,
    p_proof_document_name: proofName,
    p_proof_document_type: proofType,
  };

  const { data, error } = await supabase.rpc(
    "submit_scout_verification_application",
    rpcArgs,
  );

  if (!error) {
    if (data && typeof data === "object" && !Array.isArray(data) && "id" in data) {
      return { ok: true };
    }
    if (isLegacyRpcResponse(data)) {
      const row = data[0];
      if (row.success) {
        return { ok: true };
      }
      logFullSupabaseError(
        "[scoutVerification] submit: legacy RPC returned failure",
        new Error(String(row.error_code ?? "not_eligible")),
        { userId, error_code: row.error_code ?? null },
      );
      return { ok: false, code: row.error_code ?? "not_eligible" };
    }
    logFullSupabaseError(
      "[scoutVerification] submit: RPC succeeded but response shape was unexpected",
      new Error("unexpected_response"),
      {
        userId,
        dataType: typeof data,
        isArray: Array.isArray(data),
      },
    );
    return { ok: false, code: "unexpected_response" };
  }

  if (isSubmitScoutRpcMissingOrUnavailable(error)) {
    return submitScoutVerificationApplicationTableFallback(cleanInput, userId);
  }

  logFullSupabaseError(
    "[scoutVerification] submit: RPC error (fallback not used)",
    error,
    {
      userId,
    },
  );
  return { ok: false, code: "rpc_error" };
}

export {
  isApprovedScoutUser,
  isUnverifiedScoutUser,
  userMayMessagePlayers,
} from "@/lib/scoutVerification";
