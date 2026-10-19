import { asc } from "drizzle-orm";
import { db } from "@/db";
import { attributeDefinitions, units } from "@/db/schema";

export async function AttributePicker({ selected, overrideToggle, defaultOverride }: { selected: Map<string, { isRequired: boolean; displayOrder: number }>; overrideToggle?: boolean; defaultOverride?: boolean }) {
  const attrs = await db.select().from(attributeDefinitions).orderBy(asc(attributeDefinitions.nameEn));
  return (
    <fieldset className="card p-4">
      <legend className="px-1 font-bold">Applicable attributes</legend>
      {overrideToggle && (
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="overrideAttributes" defaultChecked={defaultOverride} /> Override the category&apos;s attributes for this commodity (unchecked = inherit)
        </label>
      )}
      <div className="grid gap-1 sm:grid-cols-2">
        {attrs.map((a) => {
          const sel = selected.get(a.id);
          return (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="attr" value={a.id} defaultChecked={Boolean(sel)} id={`attr-${a.id}`} />
              <label htmlFor={`attr-${a.id}`} className="flex-1">
                {a.nameEn} <span className="text-text-muted">({a.key}, {a.type})</span>
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name={`attr_required_${a.id}`} defaultChecked={sel?.isRequired} /> req
              </label>
              <input type="number" name={`attr_order_${a.id}`} defaultValue={sel?.displayOrder ?? 0} className="w-14 rounded border border-border px-1 text-xs" aria-label="order" />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export async function UnitPicker({ selected, defaultUnitId, overrideToggle, defaultOverride }: { selected: Set<string>; defaultUnitId: string | null; overrideToggle?: boolean; defaultOverride?: boolean }) {
  const rows = await db.select().from(units).orderBy(asc(units.sortOrder), asc(units.nameEn));
  return (
    <fieldset className="card p-4">
      <legend className="px-1 font-bold">Units offered in forms</legend>
      {overrideToggle && (
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="overrideUnits" defaultChecked={defaultOverride} /> Override the category&apos;s units for this commodity (unchecked = inherit)
        </label>
      )}
      <p className="mb-2 text-xs text-text-muted">Tick the units sellers and buyers can choose; pick one as the default. Leave all unticked to allow every active unit.</p>
      <div className="grid gap-1 sm:grid-cols-3">
        {rows.map((u) => (
          <div key={u.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="unit" value={u.id} defaultChecked={selected.has(u.id)} id={`unit-${u.id}`} />
            <label htmlFor={`unit-${u.id}`} className="flex-1">
              {u.nameEn} <span className="text-text-muted">({u.symbol})</span>
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="radio" name="unit_default" value={u.id} defaultChecked={defaultUnitId === u.id} /> default
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export async function UnitSelect({ name, value, label = "Default unit" }: { name: string; value: string | null; label?: string }) {
  const rows = await db.select().from(units).orderBy(asc(units.sortOrder), asc(units.nameEn));
  return (
    <label className="block">
      <span className="block text-sm font-semibold">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="mt-1 w-full rounded-[var(--radius)] border border-border-strong px-3 py-2">
        <option value="">— none —</option>
        {rows.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nameEn} ({u.symbol})
          </option>
        ))}
      </select>
    </label>
  );
}
