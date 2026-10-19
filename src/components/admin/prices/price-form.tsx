"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { savePriceAction, saveSourceAction } from "@/lib/prices/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";

export type PriceFormInitial = {
  id?: string;
  status?: string;
  commodityId?: string;
  commodityName?: string;
  varietyId?: string | null;
  gradeId?: string | null;
  locationId?: string;
  amount?: string;
  unitId?: string;
  priceType?: string;
  lowAmount?: string | null;
  highAmount?: string | null;
  observationDate?: string;
  validUntil?: string | null;
  sourceId?: string | null;
  sourceReference?: string | null;
  notes?: string | null;
};
type Opt = { id: string; label: string };
type CommodityForm = { commodity: { id: string; nameEn: string; supportsPriceBenchmark: boolean }; varieties: Array<{ id: string; nameEn: string }>; grades: Array<{ id: string; nameEn: string; varietyId: string | null }>; units: Array<{ id: string; symbol: string; nameEn: string }>; defaultUnitId: string | null };

const FIELD_MESSAGES: Record<string, string> = {
  required: "Required",
  must_be_positive: "Must be greater than zero",
  invalid_number: "Enter a valid number",
  invalid_date: "Enter a valid date",
  future_date: "Observation date cannot be in the future",
  low_gt_high: "Low must not exceed high",
  low_gt_amount: "Low must not exceed the rate",
  high_lt_amount: "High must not be below the rate",
  source_required: "A source is required before publishing",
  unknown_unit: "Unknown unit",
  must_be_future: "Must be in the future",
  already_past: "Valid-until date is already in the past",
};

export function PriceForm({ initial, locations, sources, priceTypes, canPublish }: { initial: PriceFormInitial; locations: Array<{ group: string; items: Opt[] }>; sources: Opt[]; priceTypes: string[]; canPublish: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(savePriceAction, null);
  const [srcState, srcAction, srcPending] = useActionState(saveSourceAction, null);
  const [commodity, setCommodity] = useState<{ id: string; name: string } | null>(initial.commodityId ? { id: initial.commodityId, name: initial.commodityName ?? "" } : null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; nameEn: string; categoryName: string }>>([]);
  const [form, setForm] = useState<CommodityForm | null>(null);
  const [varietyId, setVarietyId] = useState(initial.varietyId ?? "");
  const [unitId, setUnitId] = useState(initial.unitId ?? "");
  const [sourceList, setSourceList] = useState(sources);
  const [sourceId, setSourceId] = useState(initial.sourceId ?? "");
  const [showNewSource, setShowNewSource] = useState(false);
  const isPublished = initial.status === "published";
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!query.trim()) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const res = await fetch(`/admin/prices/api/commodity-search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
      if (res.ok) setResults((await res.json()).items);
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!commodity) return;
    fetch(`/admin/prices/api/commodity-form?commodity=${commodity.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CommodityForm | null) => {
        setForm(d);
        if (d && !unitId && d.defaultUnitId) setUnitId(d.defaultUnitId);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commodity?.id]);

  useEffect(() => {
    if (state?.ok) router.push(`/admin/prices/${state.data!.id}?done=${state.message ?? "saved"}`);
  }, [state, router]);

  useEffect(() => {
    if (srcState?.ok && srcState.data) {
      const nameInput = document.getElementById("newSourceName") as HTMLInputElement | null;
      setSourceList((l) => [...l, { id: srcState.data!.id, label: nameInput?.value ?? "New source" }]);
      setSourceId(srcState.data.id);
      setShowNewSource(false);
    }
  }, [srcState]);

  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const msg = (k: string) => (fe[k] ? FIELD_MESSAGES[fe[k]] ?? fe[k] : null);
  const grades = (form?.grades ?? []).filter((g) => !g.varietyId || g.varietyId === varietyId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form ref={formRef} action={action} noValidate className="card p-5">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        {state && !state.ok && (
          <Alert tone="danger" className="mb-4">
            {state.error === "validation" || state.error === "Validation failed" ? "Please fix the highlighted fields." : state.error}
          </Alert>
        )}
        {isPublished && (
          <Alert tone="warning" className="mb-4" title="Correcting a published price">
            Changes to a published rate are recorded as a correction with your reason and kept in the public history. Commodity, variety, grade, location, unit and price type are locked; expire this record and create a new one to change them.
          </Alert>
        )}

        <Field label="Commodity" required error={msg("commodityId")}>
          {commodity ? (
            <div className="flex items-center gap-2">
              <input type="hidden" name="commodityId" value={commodity.id} />
              <span className="rounded-full bg-primary-soft px-3 py-1.5 font-semibold">{commodity.name}</span>
              {!isPublished && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setCommodity(null); setForm(null); setVarietyId(""); }}>
                  Change
                </Button>
              )}
            </div>
          ) : (
            <div className="relative">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a commodity name, e.g. rice, chawal, cement" autoComplete="off" />
              {results.length > 0 && query && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[var(--radius)] border border-border bg-surface shadow-md">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-start hover:bg-surface-muted" onClick={() => { setCommodity({ id: r.id, name: r.nameEn }); setQuery(""); setResults([]); }}>
                        <span>{r.nameEn}</span>
                        <span className="text-xs text-text-muted">{r.categoryName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {form && !form.commodity.supportsPriceBenchmark && <p className="mt-1 text-sm text-warning">This commodity is not marked as supporting price benchmarks; publishing is still allowed, but check taxonomy settings.</p>}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Variety / type" error={msg("varietyId")}>
            <Select name="varietyId" value={varietyId} onChange={(e) => setVarietyId(e.target.value)} disabled={isPublished || !form}>
              <option value="">— none —</option>
              {(form?.varieties ?? []).map((v) => (
                <option key={v.id} value={v.id}>{v.nameEn}</option>
              ))}
            </Select>
          </Field>
          <Field label="Grade / specification" error={msg("gradeId")}>
            <Select name="gradeId" defaultValue={initial.gradeId ?? ""} disabled={isPublished || !form}>
              <option value="">— none —</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{g.nameEn}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="City / market" required error={msg("locationId")}>
          <Select name="locationId" defaultValue={initial.locationId ?? ""} disabled={isPublished} required>
            <option value="">Select…</option>
            {locations.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Rate (PKR)" required error={msg("amount")}>
            <Input name="amount" inputMode="decimal" defaultValue={initial.amount ?? ""} required className="font-latin" />
          </Field>
          <Field label="Per unit" required error={msg("unitId")}>
            <Select name="unitId" value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={isPublished} required>
              <option value="">Select…</option>
              {(form?.units ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.nameEn} ({u.symbol})</option>
              ))}
              {!form && initial.unitId && <option value={initial.unitId}>(current unit)</option>}
            </Select>
          </Field>
          <Field label="Rate type" required error={msg("priceType")}>
            <Select name="priceType" defaultValue={initial.priceType ?? "indicative"} disabled={isPublished}>
              {priceTypes.map((p) => (
                <option key={p} value={p}>{p.replace("_", " ")}</option>
              ))}
            </Select>
          </Field>
        </div>
        {isPublished && (
          <>
            <input type="hidden" name="locationId" value={initial.locationId ?? ""} />
            <input type="hidden" name="unitId" value={initial.unitId ?? ""} />
            <input type="hidden" name="priceType" value={initial.priceType ?? "indicative"} />
            <input type="hidden" name="varietyId" value={initial.varietyId ?? ""} />
            <input type="hidden" name="gradeId" value={initial.gradeId ?? ""} />
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Low (optional)" error={msg("lowAmount")}>
            <Input name="lowAmount" inputMode="decimal" defaultValue={initial.lowAmount ?? ""} className="font-latin" />
          </Field>
          <Field label="High (optional)" error={msg("highAmount")}>
            <Input name="highAmount" inputMode="decimal" defaultValue={initial.highAmount ?? ""} className="font-latin" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Observation date" required error={msg("observationDate")} hint="The day the rate was observed in the market.">
            <Input type="date" name="observationDate" defaultValue={initial.observationDate ?? new Date().toISOString().slice(0, 10)} max={new Date().toISOString().slice(0, 10)} required className="font-latin" />
          </Field>
          <Field label="Valid until (optional)" error={msg("validUntil")} hint="Automatically expires after this time.">
            <Input type="datetime-local" name="validUntil" defaultValue={initial.validUntil ?? ""} className="font-latin" />
          </Field>
        </div>

        <Field label="Source" required error={msg("sourceId")} hint="Where the rate was observed. Required to publish.">
          <div className="flex flex-wrap gap-2">
            <Select name="sourceId" value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="flex-1">
              <option value="">Select a source…</option>
              {sourceList.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
            <Button type="button" variant="outline" onClick={() => setShowNewSource((v) => !v)}>
              {showNewSource ? "Cancel" : "Add source"}
            </Button>
          </div>
        </Field>
        <Field label="Source reference / URL (optional)" error={msg("sourceReference")}>
          <Input name="sourceReference" defaultValue={initial.sourceReference ?? ""} className="font-latin" placeholder="https://… or bulletin number" />
        </Field>
        <Field label="Notes (optional)" error={msg("notes")}>
          <Textarea name="notes" defaultValue={initial.notes ?? ""} rows={3} />
        </Field>
        {isPublished && (
          <Field label="Reason for correction" required error={state && !state.ok && /reason/i.test(state.error) ? state.error : null}>
            <Textarea name="reason" rows={2} required placeholder="e.g. Typo in amount; source bulletin corrected" />
          </Field>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          {!isPublished && (
            <>
              <Button type="submit" name="intent" value="draft" variant="outline" loading={pending}>
                Save draft
              </Button>
              <Button type="submit" name="intent" value="review" variant="secondary" loading={pending}>
                Submit for review
              </Button>
            </>
          )}
          {canPublish && (
            <Button type="submit" name="intent" value={isPublished ? "draft" : "publish"} variant="primary" loading={pending}>
              {isPublished ? "Save correction" : "Save & publish"}
            </Button>
          )}
          {isPublished && !canPublish && (
            <Button type="submit" name="intent" value="draft" variant="primary" loading={pending}>
              Save correction
            </Button>
          )}
        </div>
      </form>

      <aside className="space-y-4">
        {showNewSource && (
          <form action={srcAction} className="card p-4">
            <h2 className="mb-2 font-bold">New source</h2>
            <Field label="Name" required error={srcState && !srcState.ok ? srcState.fieldErrors?.name ?? null : null}>
              <Input id="newSourceName" name="name" required minLength={2} />
            </Field>
            <Field label="Type">
              <Select name="sourceType" defaultValue="market_committee">
                {["market_committee", "government", "exchange", "trade_association", "supplier", "buyer_report", "platform_survey", "other"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </Select>
            </Field>
            <Field label="URL (optional)" error={srcState && !srcState.ok ? srcState.fieldErrors?.url ?? null : null}>
              <Input name="url" type="url" className="font-latin" />
            </Field>
            <input type="hidden" name="isActive" value="on" />
            <Button type="submit" size="sm" loading={srcPending}>
              Create source
            </Button>
          </form>
        )}
        <div className="card p-4 text-sm text-text-muted">
          <p className="font-semibold text-text">Publishing rules</p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            <li>A rate needs a unit, an observation date (not in the future), a positive amount and a source.</li>
            <li>Only one published rate per commodity / variety / grade / location / unit / type. Publishing a newer one supersedes the previous and records the % change.</li>
            <li>Rates older than the stale threshold are labelled &ldquo;older rate&rdquo; publicly; the maintenance job expires them after the hard limit.</li>
            <li>Every change is kept in the version history. Corrections to published rates require a reason.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
