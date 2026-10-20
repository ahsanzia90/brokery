"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { completeProfileAction } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, RadioCard, Select } from "@/components/ui/form";

export function OnboardingForm({ next, cities, defaults }: { next: string; cities: Array<{ id: string; name: string }>; defaults: { name: string; language: "en" | "ur"; cityId: string | null; intent: "buyer" | "seller" | "both" } }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState(completeProfileAction, null);
  useEffect(() => {
    if (state?.ok) router.replace(state.data!.next);
  }, [state, router]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label={t("common.name")} required htmlFor="name" error={fe.name ? t("form.required") : null}>
        <Input id="name" name="name" defaultValue={defaults.name} required minLength={2} maxLength={80} autoComplete="name" />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={t("common.language")} htmlFor="language">
          <Select id="language" name="language" defaultValue={defaults.language || locale}>
            <option value="en">English</option>
            <option value="ur">اردو</option>
          </Select>
        </Field>
        <Field label={t("common.city")} htmlFor="cityId">
          <Select id="cityId" name="cityId" defaultValue={defaults.cityId ?? ""}>
            <option value="">{t("form.selectOne")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="mb-5">
        <legend className="mb-2 text-[14px] font-semibold text-ink">{t("auth.iAm")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <RadioCard name="intent" value="buyer" defaultChecked={defaults.intent === "buyer"} label={t("auth.role.buyer")} />
          <RadioCard name="intent" value="seller" defaultChecked={defaults.intent === "seller"} label={t("auth.role.seller")} />
          <RadioCard name="intent" value="both" defaultChecked={defaults.intent === "both"} label={t("auth.role.both")} />
        </div>
      </fieldset>
      <Field label={`${t("common.email")} (${t("common.optional")})`} htmlFor="email" error={fe.email ? t("form.invalid") : null}>
        <Input id="email" name="email" type="email" autoComplete="email" className="font-latin" />
      </Field>
      <Checkbox
        name="acceptTerms"
        required
        label={
          <>
            {t("auth.consent", { terms: "", privacy: "" }).split("  ")[0]}{" "}
            <Link href="/terms-of-use" className="font-semibold text-brand-800 underline underline-offset-4" target="_blank">
              {t("footer.terms")}
            </Link>{" "}
            ·{" "}
            <Link href="/privacy-policy" className="font-semibold text-brand-800 underline underline-offset-4" target="_blank">
              {t("footer.privacy")}
            </Link>
          </>
        }
      />
      {fe.acceptTerms && <p className="text-[13px] font-medium text-danger">{t("form.required")}</p>}
      <Button type="submit" size="lg" className="mt-6 w-full" loading={pending}>
        {t("action.continue")}
      </Button>
    </form>
  );
}
