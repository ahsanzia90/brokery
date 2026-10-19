import type { Metadata } from "next";
import { requireUserPage } from "@/lib/authz/guards";
import { getT } from "@/lib/i18n/server";
import { getMajorCities, getCities } from "@/lib/data/locations";
import { NOINDEX } from "@/lib/seo/metadata";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Complete your profile", ...NOINDEX };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await requireUserPage("/onboarding");
  const { t, locale } = await getT();
  const major = await getMajorCities();
  const all = await getCities();
  const cities = [...major, ...all.filter((c) => !c.isMajorMarket)].map((c) => ({ id: c.id, name: locale === "ur" && c.nameUr ? c.nameUr : c.nameEn }));
  return (
    <div className="container-page max-w-md py-8">
      <h1 className="text-2xl font-bold">{t("auth.completeProfile")}</h1>
      <div className="card mt-6 p-5">
        <OnboardingForm next={next ?? "/"} cities={cities} defaults={{ name: user.name, language: user.language, cityId: user.cityId, intent: user.isSeller ? "both" : "buyer" }} />
      </div>
    </div>
  );
}
