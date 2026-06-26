import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ensureVideoThumbnailById } from "@/lib/video/ensureVideoThumbnail.server";
import { getMergeRuntimeStatus } from "@/lib/video/ffmpegMerge";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

type Body = { videoId?: string };

export async function POST(req: Request) {
  const runtimeStatus = getMergeRuntimeStatus();
  if (!runtimeStatus.ready) {
    return NextResponse.json(
      { ok: false, error: "thumbnail_runtime_unavailable" },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ ok: false, error: "misconfigured" }, { status: 500 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
  if (!videoId) {
    return NextResponse.json({ ok: false, error: "missing_video_id" }, { status: 400 });
  }

  const userClient = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  const userId = authData.user?.id?.trim();
  if (authError || !userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: video, error: videoError } = await userClient
    .from("videos")
    .select("id,user_id")
    .eq("id", videoId)
    .maybeSingle();

  if (videoError || !video) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (video.user_id !== userId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const thumbnailUrl = await ensureVideoThumbnailById(videoId);
  if (!thumbnailUrl) {
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, thumbnail_url: thumbnailUrl });
}
