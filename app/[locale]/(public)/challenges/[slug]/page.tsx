import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChallengeDetailView } from "@/components/challenges/ChallengeDetailView";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { parseChallengeRowLoose, withChallengeSelectFallback } from "@/lib/challenges/challengeRowUtils";
import { buildPublicPageMetadata } from "@/lib/seo/buildPublicPageMetadata";
import { createAnonSupabaseServerClient } from "@/lib/supabase/anonServerClient";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

const CHALLENGE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getChallengeForMetadata(param: string) {
  const s = param.trim();
  if (!s) return null;

  const supabase = createAnonSupabaseServerClient();
  if (!supabase) return null;

  const byId = CHALLENGE_UUID_RE.test(s);
  const { data } = await withChallengeSelectFallback((cols) =>
    supabase
      .from("challenges")
      .select(cols)
      .eq(byId ? "id" : "slug", s)
      .in("status", ["active", "ended"])
      .maybeSingle(),
  );

  return parseChallengeRowLoose(data);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const decoded = decodeURIComponent(slug);
  const challenge = await getChallengeForMetadata(decoded);
  const title = challenge?.title?.trim()
    ? `${challenge.title.trim()} · PitchRusch`
    : `${t("challengeDetailTitle")} · PitchRusch`;
  const description =
    challenge?.description?.trim() ||
    (await getTranslations({ locale, namespace: "challenges" }))("subtitle");

  return buildPublicPageMetadata({
    locale,
    pathname: `/challenges/${encodeURIComponent(decoded)}`,
    title,
    description,
  });
}

export default async function ChallengeDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const decoded = decodeURIComponent(slug);

  return (
    <AppMobileTabPageShell data-pitchrusch-explore-page data-challenges-page>
      <Suspense
        fallback={
          <div
            className="flex flex-col items-center justify-center py-10"
            role="status"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
          </div>
        }
      >
        <ChallengeDetailView slug={decoded} />
      </Suspense>
    </AppMobileTabPageShell>
  );
}
