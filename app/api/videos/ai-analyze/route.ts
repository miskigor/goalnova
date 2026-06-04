import { assertVideoAiAnalyzeAccess } from "@/lib/ai/analysisAccess";
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

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export async function POST(req: Request): Promise<Response> {
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

  const service = createServiceRoleClient();
  if (!service) {
    return json({ ok: false, error: "server_config" }, 503);
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
    return json({ ok: false, error: access.error }, status);
  }

  try {
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
    if (message === "video_not_found" || message === "video_playback_missing") {
      return json({ ok: false, error: message }, 404);
    }
    if (message === "video_too_large" || message === "frame_extraction_failed") {
      return json({ ok: false, error: message }, 422);
    }
    console.error("[ai-analyze]", message, e);
    return json({ ok: false, error: "analysis_failed" }, 500);
  }
}
