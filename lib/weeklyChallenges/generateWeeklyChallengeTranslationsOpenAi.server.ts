import "server-only";

import { classifyOpenAiError } from "@/lib/ai/classifyOpenAiError";
import { getOpenAiApiKey, getOpenAiModel } from "@/lib/ai/openaiRuntime.server";
import type { WeeklyChallengeLocaleContent } from "@/lib/supabase/weeklyChallenges.types";
import {
  WEEKLY_CHALLENGE_LOCALE_LANGUAGE_NAMES,
  WEEKLY_CHALLENGE_TRANSLATION_TARGET_LOCALES,
  type WeeklyChallengeGeneratedTranslations,
} from "@/lib/weeklyChallenges/weeklyChallengeTranslateTargets";

export type WeeklyChallengeEnglishSource = {
  title: string;
  description: string;
  rules: string;
  equipment: string;
  badgeName: string;
};

function trimField(s: string): string {
  return s.trim();
}

function parseLocaleBranch(raw: unknown): WeeklyChallengeLocaleContent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? trimField(o.title) : "";
  if (!title) return null;
  return {
    title,
    description:
      typeof o.description === "string" ? o.description.trim() : "",
    rules: typeof o.rules === "string" ? o.rules.trim() : "",
    equipment: typeof o.equipment === "string" ? o.equipment.trim() : "",
    badgeName:
      typeof o.badge_name === "string"
        ? o.badge_name.trim()
        : typeof o.badgeName === "string"
          ? o.badgeName.trim()
          : "",
  };
}

function buildSystemPrompt(): string {
  const localeList = WEEKLY_CHALLENGE_TRANSLATION_TARGET_LOCALES.map(
    (code) => `${code} (${WEEKLY_CHALLENGE_LOCALE_LANGUAGE_NAMES[code]})`,
  ).join(", ");

  return [
    "You translate weekly football skill challenge copy for the PitchRusch app.",
    `Return JSON only. Top-level keys must be exactly these locale codes: ${WEEKLY_CHALLENGE_TRANSLATION_TARGET_LOCALES.join(", ")}.`,
    `Languages: ${localeList}.`,
    "Each locale object must include: title (required non-empty string), description, rules, equipment, badge_name (strings; use empty string if the English source field is empty).",
    "Preserve meaning, tone, and formatting. Title and badge_name stay short and catchy.",
    "Use natural football wording for each locale. For ar use Modern Standard Arabic suitable for UI.",
    "Do not include English or any extra keys.",
  ].join("\n");
}

function buildUserPrompt(english: WeeklyChallengeEnglishSource): string {
  return JSON.stringify(
    {
      source_locale: "en",
      fields: {
        title: english.title,
        description: english.description,
        rules: english.rules,
        equipment: english.equipment,
        badge_name: english.badgeName,
      },
    },
    null,
    2,
  );
}

export async function generateWeeklyChallengeTranslationsWithOpenAI(
  english: WeeklyChallengeEnglishSource,
): Promise<WeeklyChallengeGeneratedTranslations> {
  const title = english.title.trim();
  if (!title) {
    throw new Error("english_title_required");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt({ ...english, title }) },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const code = classifyOpenAiError(
      `openai_http_${res.status}:${errText.slice(0, 400) || res.statusText}`,
    );
    throw new Error(code);
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("openai_empty_response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("openai_invalid_json");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("openai_schema_mismatch");
  }

  const root = parsed as Record<string, unknown>;
  const out = {} as WeeklyChallengeGeneratedTranslations;

  for (const locale of WEEKLY_CHALLENGE_TRANSLATION_TARGET_LOCALES) {
    const branch = parseLocaleBranch(root[locale]);
    if (!branch) {
      throw new Error("openai_schema_mismatch");
    }
    out[locale] = branch;
  }

  return out;
}
