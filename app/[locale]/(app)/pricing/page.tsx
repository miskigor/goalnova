import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Canonical plans live at `/premium`. */
export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/premium", locale });
}
