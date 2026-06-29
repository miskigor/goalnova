import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginCard } from "@/components/auth/LoginCard";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // Keep metadata translated; UI text is handled by client components.
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("loginTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tLogin = await getTranslations({ locale, namespace: "authLogin" });
  const tCommon = await getTranslations({ locale, namespace: "authCommon" });
  const tLanding = await getTranslations({ locale, namespace: "landing" });

  const labels = {
    title: tLogin("title"),
    subtitle: tLogin("subtitle"),
    email: tLogin("email"),
    emailPlaceholder: tLogin("emailPlaceholder"),
    password: tLogin("password"),
    passwordPlaceholder: tLogin("passwordPlaceholder"),
    signingIn: tLogin("signingIn"),
    submit: tLogin("submit"),
    invalidCredentials: tLogin("invalidCredentials"),
    emailNotConfirmed: tLogin("emailNotConfirmed"),
    noAccount: tLogin("noAccount"),
    signUpLink: tLogin("signUpLink"),
    forgotPasswordLink: tLanding("forgotPasswordLink"),
    invalidEmail: tCommon("invalidEmail"),
    invalidPassword: tCommon("invalidPassword"),
    genericError: tCommon("genericError"),
    configMissing: tLogin("configMissing"),
    accountBanned: tLogin("accountBanned"),
    rateLimited: tLogin("rateLimited"),
    networkError: tLogin("networkError"),
    loginTimedOut: tLogin("loginTimedOut"),
    inAppBrowserHint: tLogin("inAppBrowserHint"),
    alreadySignedInTitle: tLogin("alreadySignedInTitle"),
    alreadySignedInHint: tLogin("alreadySignedInHint"),
    continueToHome: tLogin("continueToHome"),
    signOutToSwitchAccount: tLogin("signOutToSwitchAccount"),
  };

  return <LoginCard labels={labels} />;
}
