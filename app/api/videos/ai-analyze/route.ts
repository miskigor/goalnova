import { assertVideoAiAnalyzeAccess } from "@/lib/ai/analysisAccess";
import {
  classifyOpenAiError,
  extractOpenAiLogFields,
  openAiModelFromEnv,
} from "@/lib/ai/classifyOpenAiError";
import { runServerVideoAiAnalysis } from "@/lib/ai/runServerVideoAiAnalysis";
import { VideoAiConfigError } from "@/lib/ai/openaiVideoAnalysis";
import { resolveAuthenticatedUserIdFromBearer } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

type Body = {
  videoId?: string;
  locale?: string;
  scoutInsight?: boolean;
};

type ApiFailure = { ok: false; error: string };
type ApiSuccess = { ok: true; scores: unknown };

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(data: ApiSuccess | ApiFailure, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function mapAccessError(code: string): string {
  if (
    code === "premium_required" ||
    code === "scout_access_denied" ||
    code === "not_video_owner"
  ) {
    return "permission_denied";
  }
  return code;
}

function mapAnalysisError(message: string): { error: string; status: number } {
  if (message === "video_not_found" || message === "video_playback_missing") {
    return { error: "video_not_found", status: 404 };
  }
  if (
    message === "video_too_large" ||
    message === "frame_extraction_failed" ||
    message === "video_download_failed" ||
    message.startsWith("video_download_failed:") ||
    message.startsWith("Download failed")
  ) {
    return { error: "video_download_failed", status: 422 };
  }
  if (
    message.startsWith("openai_") ||
    message.includes("openai_http_")
  ) {
    return { error: classifyOpenAiError(message), status: 502 };
  }
  const OPENAI_API_CODES = new Set([
    "openai_auth_failed",
    "openai_quota_exceeded",
    "openai_rate_limited",
    "openai_model_not_available",
    "openai_invalid_request",
    "openai_timeout",
    "openai_failed",
  ]);
  if (OPENAI_API_CODES.has(message)) {
    return { error: message, status: 502 };
  }
  if (message === "supabase_service_unavailable") {
    return { error: "service_role_missing", status: 503 };
  }
  return { error: "analysis_failed", status: 500 };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const userId = await resolveAuthenticatedUserIdFromBearer(
      req.headers.get("authorization"),
    );
    if (!userId) {
      return json({ ok: false, error: "not_authenticated" }, 401);
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return json({ ok: false, error: "invalid_body" }, 400);
    }

    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    if (!videoId) {
      return json({ ok: false, error: "invalid_video_id" }, 400);
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      console.error("[ai-analyze] SUPABASE_SERVICE_ROLE_KEY missing");
      return json({ ok: false, error: "service_role_missing" }, 503);
    }

    const service = createServiceRoleClient();
    if (!service) {
      return json({ ok: false, error: "service_role_missing" }, 503);
    }

    const access = await assertVideoAiAnalyzeAccess({
      client: service,
      userId,
      videoId,
      scoutInsight: body.scoutInsight === true,
    });
    if (!access.ok) {
      const status =
        access.error === "premium_required"
          ? 402
          : access.error === "video_not_found"
            ? 404
            : 403;
      return json({ ok: false, error: mapAccessError(access.error) }, status);
    }

    if (!process.env.OPENAI_API_KEY?.trim()) {
      const demoAllowed =
        process.env.NEXT_PUBLIC_ALLOW_DEMO_AI_SCORING === "true";
      if (!demoAllowed) {
        return json({ ok: false, error: "ai_not_configured" }, 503);
      }
    }

    const scores = await runServerVideoAiAnalysis({
      videoId,
      locale: typeof body.locale === "string" ? body.locale : undefined,
    });
    return json({ ok: true, scores }, 200);
  } catch (e) {
    if (e instanceof VideoAiConfigError) {
      return json({ ok: false, error: "ai_not_configured" }, 503);
    }
    const message = e instanceof Error ? e.message : "analysis_failed";
    const mapped = mapAnalysisError(message);
    if (
      message.includes("openai_http_") ||
      message.startsWith("openai_") ||
      mapped.error.startsWith("openai_")
    ) {
      const model = openAiModelFromEnv();
      const fields = extractOpenAiLogFields(e, model);
      console.error("[ai-analyze] openai error", {
        apiError: mapped.error,
        name: fields.name,
        message: fields.message,
        status: fields.status,
        code: fields.code,
        type: fields.type,
        model: fields.model,
      });
    } else {
      console.error("[ai-analyze]", mapped.error, message, e);
    }
    return json({ ok: false, error: mapped.error }, mapped.status);
  }
}
