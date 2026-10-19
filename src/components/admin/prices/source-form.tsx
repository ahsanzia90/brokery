"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSourceAction, toggleSourceActiveAction } from "@/lib/prices/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";

const TYPES = ["market_committee", "government", "exchange", "trade_association", "supplier", "buyer_report", "platform_survey", "other"];

export function SourceForm({ initial }: { initial: { id: string; name: string; sourceType: string; url: string | null; reference: string | null; isActive: boolean } | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveSourceAction, null);
  useEffect(() => {
    if (state?.ok) router.push("/admin/prices/sources");
  }, [state, router]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="card h-fit p-4" noValidate>
      <h2 className="mb-3 font-bold">{initial ? "Edit source" : "New source"}</h2>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state && !state.ok && <Alert tone="danger" className="mb-3">{state.error}</Alert>}
      <Field label="Name" required error={fe.name ? "Enter a name (2–200 characters)" : null}>
        <Input name="name" defaultValue={initial?.name ?? ""} required minLength={2} />
      </Field>
      <Field label="Type">
        <Select name="sourceType" defaultValue={initial?.sourceType ?? "market_committee"}>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </Select>
      </Field>
      <Field label="URL (optional)" error={fe.url ? "Enter a valid URL" : null}>
        <Input name="url" type="url" defaultValue={initial?.url ?? ""} className="font-latin" />
      </Field>
      <Field label="Reference / contact (optional)">
        <Input name="reference" defaultValue={initial?.reference ?? ""} />
      </Field>
      <Checkbox name="isActive" defaultChecked={initial ? initial.isActive : true} label="Active (selectable for new rates)" />
      <div className="mt-4 flex gap-2">
        <Button type="submit" loading={pending}>{initial ? "Save" : "Create"}</Button>
        {initial && (
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/prices/sources")}>Cancel</Button>
        )}
      </div>
    </form>
  );
}

export function SourceToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await toggleSourceActiveAction(id, !active);
        setBusy(false);
        router.refresh();
      }}
      className={`min-h-[32px] rounded-full px-3 text-sm font-semibold ${active ? "bg-primary-soft text-primary-strong" : "bg-surface-muted text-text-muted"}`}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}
