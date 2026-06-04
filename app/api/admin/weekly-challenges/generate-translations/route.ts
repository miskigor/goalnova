import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyOpenAiError } from "@/lib/ai/classifyOpenAiError";
import { hasOpenAiApiKey } from "@/lib/ai/openaiRuntime.server";
import type { Database } from "@/lib/supabase/database.types";
import { isWeeklyChallengeAdminServer } from "@/lib/weeklyChallenges/weeklyChallengeAdminAuth.server";
import {
  generateWeeklyChallengeTranslationsWithOpenAI,
  type WeeklyChallengeEnglishSource,
} from "@/lib/weeklyChallenges/generateWeeklyChallengeTranslationsOpenAi.server";
import {
  emptyWeeklyChallengeTranslations,
  fallbackBaseColumnsFromTranslations,
  translationsFormToJsonb,
} from "@/lib/weeklyChallenges/weeklyChallengeTranslations";
import type { WeeklyChallengeTranslations } from "@/lib/supabase/weeklyChallenges.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

type Body = {
  challengeId?: string;
  english?: {
    title?: string;
    description?: string;
    rules?: string;
    equipment?: string;
    badgeName?: string;
  };
};

function parseEnglish(body: Body): WeeklyChallengeEnglishSource | null {
  const e = body.english;
  if (!e || typeof e !== "object") return null;
  const title = typeof e.title === "string" ? e.title.trim() : "";
  if (!title) return null;
  return {
    title,
    description: typeof e.description === "string" ? e.description : "",
    rules: typeof e.rules === "string" ? e.rules : "",
    equipment: typeof e.equipment === "string" ? e.equipment : "",
    badgeName: typeof e.badgeName === "string" ? e.badgeName : "",
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasOpenAiApiKey()) {
    return NextResponse.json(
      { ok: false, reason: "openai_not_configured" },
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, reason: "server_config" },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_body" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const english = parseEnglish(body);
  if (!english) {
    return NextResponse.json(
      { ok: false, reason: "english_title_required" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const challengeId =
    typeof body.challengeId === "string" ? body.challengeId.trim() : "";

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const authClient = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: actorData, error: actorErr } = await authClient.auth.getUser();
  const actor = actorData.user;
  if (actorErr || !actor?.id) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  if (!(await isWeeklyChallengeAdminServer(authClient, actor.id, actor.email))) {
    return NextResponse.json(
      { ok: false, reason: "forbidden" },
      { status: 403, headers: JSON_HEADERS },
    );
  }

  let generated;
  try {
    generated = await generateWeeklyChallengeTranslationsWithOpenAI(english);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "openai_failed";
    if (msg === "english_title_required") {
      return NextResponse.json(
        { ok: false, reason: msg },
        { status: 400, headers: JSON_HEADERS },
      );
    }
    const code = classifyOpenAiError(msg);
    return NextResponse.json(
      { ok: false, reason: code },
      { status: 502, headers: JSON_HEADERS },
    );
  }

  const translations: WeeklyChallengeTranslations = emptyWeeklyChallengeTranslations();
  translations.en = {
    title: english.title,
    description: english.description.trim(),
    rules: english.rules.trim(),
    equipment: english.equipment.trim(),
    badgeName: english.badgeName.trim(),
  };
  for (const [locale, content] of Object.entries(generated)) {
    translations[locale as keyof typeof generated] = content;
  }

  const translationsJson = translationsFormToJsonb(translations);
  const base = fallbackBaseColumnsFromTranslations(translations);

  let saved = false;
  if (challengeId) {
    const { error: updateErr } = await authClient
      .from("weekly_challenges")
      .update({
        ...base,
        translations: translationsJson,
      })
      .eq("id", challengeId);

    if (updateErr) {
      console.error(
        "[admin/weekly-challenges/generate-translations] update failed",
        updateErr,
      );
      return NextResponse.json(
        { ok: false, reason: "save_failed" },
        { status: 500, headers: JSON_HEADERS },
      );
    }
    saved = true;
  }

  return NextResponse.json(
    {
      ok: true,
      saved,
      translations: generated,
    },
    { headers: JSON_HEADERS },
  );
}
