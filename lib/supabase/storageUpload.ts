import { logFullSupabaseError } from "@/lib/supabase/logError";
import { supabase } from "./client";

type SupabaseErrorInfo = {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type StorageUploadErrorInfo = {
  name: "StorageUploadError";
  message: string;
  statusCode: number;
  error: string | null;
  raw: unknown;
};

function toSupabaseErrorInfo(err: unknown): SupabaseErrorInfo {
  const e = err as
    | {
        message?: string;
        code?: string | null;
        details?: string | null;
        hint?: string | null;
      }
    | undefined;

  return {
    message: e?.message ? String(e.message) : "Supabase request failed.",
    code: e?.code ?? null,
    details: e?.details ?? null,
    hint: e?.hint ?? null,
  };
}

function logStorageError(label: string, err: unknown) {
  logFullSupabaseError(label, err);
}

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number; // 0..100
};

export type StorageUploadResult =
  | { success: true; path: string; publicUrl: string }
  | { success: false; error: SupabaseErrorInfo | StorageUploadErrorInfo };

/**
 * Uploads a file to Supabase Storage with progress (XHR).
 * Uses the user's access token so RLS on Storage can apply.
 */
export async function uploadVideoWithProgress({
  bucket,
  objectPath,
  file,
  onProgress,
}: {
  bucket: string;
  objectPath: string;
  file: File;
  onProgress?: (p: UploadProgress) => void;
}): Promise<StorageUploadResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    logStorageError("Supabase: getSession error", sessionError);
    return { success: false, error: toSupabaseErrorInfo(sessionError) };
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return {
      success: false,
      error: {
        message: "Not authenticated.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return {
      success: false,
      error: {
        message:
          "Supabase is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(
    bucket
  )}/${objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  const result = await new Promise<{ ok: boolean; status: number; bodyText: string }>(
    (resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const percent = Math.round((evt.loaded / evt.total) * 100);
        onProgress?.({ loaded: evt.loaded, total: evt.total, percent });
      };

      xhr.onload = () => {
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, bodyText: xhr.responseText });
      };
      xhr.onerror = () => {
        resolve({ ok: false, status: xhr.status || 0, bodyText: xhr.responseText || "" });
      };
      xhr.send(file);
    }
  );

  if (!result.ok) {
    let parsed: unknown = null;
    try {
      parsed = result.bodyText ? JSON.parse(result.bodyText) : null;
    } catch {
      parsed = result.bodyText || null;
    }

    const parsedObj = parsed as { message?: unknown; error?: unknown; statusCode?: unknown; name?: unknown } | null;
    const message =
      (typeof parsedObj?.message === "string" && parsedObj.message) ||
      "Storage upload failed. Please try again.";
    const errorField = typeof parsedObj?.error === "string" ? parsedObj.error : null;

    const errObj: StorageUploadErrorInfo = {
      name: "StorageUploadError",
      message,
      statusCode: result.status,
      error: errorField,
      raw: parsed,
    };

    logFullSupabaseError(
      "Supabase: storage upload failed",
      new Error(message),
      { statusCode: result.status, error: errorField },
    );
    return {
      success: false,
      error: {
        ...errObj,
      },
    };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  const publicUrl = data.publicUrl;

  return { success: true, path: objectPath, publicUrl };
}

