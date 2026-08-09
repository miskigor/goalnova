import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotificationsHub } from "@/components/notifications/NotificationsHub";
import { APP_MESSAGES_INBOX_PAGE_CLASS } from "@/lib/layout/appShellClasses";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notifications" });
  return { title: t("title") };
}

export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div data-messages-inbox className={APP_MESSAGES_INBOX_PAGE_CLASS}>
      <Suspense
        fallback={
          <p className="py-8 text-center text-sm text-gn-text-secondary">…</p>
        }
      >
        <NotificationsHub />
      </Suspense>
    </div>
  );
}
