import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";

const RoleSelectionCard = dynamic(
  () =>
    import("@/components/onboarding/RoleSelectionCard").then((m) => ({
      default: m.RoleSelectionCard,
    })),
  {
    loading: () => (
      <div
        className="mx-auto flex min-h-[12rem] w-full max-w-lg items-center justify-center px-4 py-16"
        role="status"
        aria-busy
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent"
          aria-hidden
        />
      </div>
    ),
  },
);

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboardingRole" });
  return { title: t("metaTitle") };
}

export default async function RolePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RoleSelectionCard />;
}

