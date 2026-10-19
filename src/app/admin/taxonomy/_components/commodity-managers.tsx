import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { commodityAliases, commodityGrades, commodityVarieties } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { addAliasAction, addGradeAction, addVarietyAction, removeAliasAction, updateGradeAction, updateVarietyAction } from "../actions";

const inp = "min-h-[40px] rounded-[var(--radius)] border border-border-strong bg-surface px-2 py-1 text-sm";

export async function VarietyManager({ commodityId }: { commodityId: string }) {
  const rows = await db.select().from(commodityVarieties).where(eq(commodityVarieties.commodityId, commodityId)).orderBy(asc(commodityVarieties.sortOrder), asc(commodityVarieties.nameEn));
  return (
    <section id="varieties" className="card p-4">
      <h2 className="mb-2 font-bold">Types / varieties ({rows.length})</h2>
      <div className="space-y-2">
        {rows.map((v) => (
          <form key={v.id} action={updateVarietyAction} className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
            <input type="hidden" name="commodityId" value={commodityId} />
            <input type="hidden" name="id" value={v.id} />
            <input name="nameEn" defaultValue={v.nameEn} className={`${inp} w-44`} aria-label="Name (English)" />
            <input name="nameUr" defaultValue={v.nameUr ?? ""} dir="rtl" className={`${inp} w-36`} aria-label="Name (Urdu)" />
            <input name="aliasesRoman" defaultValue={v.aliasesRoman.join(", ")} placeholder="roman aliases" className={`${inp} w-44`} aria-label="Roman aliases" />
            <code className="text-xs text-text-muted">{v.slug}</code>
            <Badge tone={v.status === "active" ? "success" : "neutral"}>{v.status}</Badge>
            <span className="ms-auto flex gap-1">
              <button name="op" value="save" className={buttonClass("outline", "sm")}>
                Save
              </button>
              <button name="op" value="up" className={buttonClass("ghost", "sm")} aria-label="Move up">
                ↑
              </button>
              <button name="op" value="down" className={buttonClass("ghost", "sm")} aria-label="Move down">
                ↓
              </button>
              <button name="op" value={v.status === "active" ? "deactivate" : "activate"} className={buttonClass("ghost", "sm")}>
                {v.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </span>
          </form>
        ))}
      </div>
      <form action={addVarietyAction} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="commodityId" value={commodityId} />
        <input name="nameEn" required placeholder="New variety (English)" className={`${inp} w-44`} />
        <input name="nameUr" placeholder="اردو" dir="rtl" className={`${inp} w-36`} />
        <input name="aliasesRoman" placeholder="roman aliases, comma separated" className={`${inp} w-52`} />
        <button className={buttonClass("secondary", "sm")}>+ Add variety</button>
      </form>
    </section>
  );
}

export async function GradeManager({ commodityId }: { commodityId: string }) {
  const rows = await db.select().from(commodityGrades).where(eq(commodityGrades.commodityId, commodityId)).orderBy(asc(commodityGrades.sortOrder), asc(commodityGrades.nameEn));
  const varieties = await db.select({ id: commodityVarieties.id, nameEn: commodityVarieties.nameEn }).from(commodityVarieties).where(eq(commodityVarieties.commodityId, commodityId)).orderBy(asc(commodityVarieties.sortOrder));
  const vName = (id: string | null) => (id ? varieties.find((v) => v.id === id)?.nameEn ?? "?" : "all varieties");
  return (
    <section id="grades" className="card p-4">
      <h2 className="mb-2 font-bold">Grades / specifications ({rows.length})</h2>
      <div className="space-y-2">
        {rows.map((g) => (
          <form key={g.id} action={updateGradeAction} className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
            <input type="hidden" name="commodityId" value={commodityId} />
            <input type="hidden" name="id" value={g.id} />
            <input name="nameEn" defaultValue={g.nameEn} className={`${inp} w-44`} aria-label="Name (English)" />
            <input name="nameUr" defaultValue={g.nameUr ?? ""} dir="rtl" className={`${inp} w-36`} aria-label="Name (Urdu)" />
            <span className="text-xs text-text-muted">{vName(g.varietyId)}</span>
            <Badge tone={g.status === "active" ? "success" : "neutral"}>{g.status}</Badge>
            <span className="ms-auto flex gap-1">
              <button name="op" value="save" className={buttonClass("outline", "sm")}>
                Save
              </button>
              <button name="op" value={g.status === "active" ? "deactivate" : "activate"} className={buttonClass("ghost", "sm")}>
                {g.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </span>
          </form>
        ))}
      </div>
      <form action={addGradeAction} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="commodityId" value={commodityId} />
        <input name="nameEn" required placeholder="New grade (English)" className={`${inp} w-44`} />
        <input name="nameUr" placeholder="اردو" dir="rtl" className={`${inp} w-36`} />
        <select name="varietyId" className={inp} aria-label="Applies to">
          <option value="">applies to all varieties</option>
          {varieties.map((v) => (
            <option key={v.id} value={v.id}>
              only {v.nameEn}
            </option>
          ))}
        </select>
        <button className={buttonClass("secondary", "sm")}>+ Add grade</button>
      </form>
    </section>
  );
}

export async function AliasManager({ commodityId }: { commodityId: string }) {
  const rows = await db.select().from(commodityAliases).where(eq(commodityAliases.commodityId, commodityId)).orderBy(asc(commodityAliases.language), asc(commodityAliases.alias));
  const varieties = await db.select({ id: commodityVarieties.id, nameEn: commodityVarieties.nameEn }).from(commodityVarieties).where(eq(commodityVarieties.commodityId, commodityId));
  return (
    <section id="aliases" className="card p-4">
      <h2 className="mb-1 font-bold">Search aliases ({rows.length})</h2>
      <p className="mb-2 text-xs text-text-muted">Local names, spellings and regional trade terms (e.g. “Zero 9”). Entries tagged “auto” are generated from names. Unapproved aliases are not used in search.</p>
      <ul className="flex flex-wrap gap-2">
        {rows.map((a) => (
          <li key={a.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm ${a.isApproved ? "border-border" : "border-warning bg-warning-soft"}`}>
            <span dir={a.language === "ur" ? "rtl" : "ltr"}>{a.alias}</span>
            <span className="text-xs text-text-muted">
              {a.language}
              {a.region ? ` · ${a.region}` : ""}
              {a.varietyId ? ` · ${varieties.find((v) => v.id === a.varietyId)?.nameEn ?? "variety"}` : ""}
            </span>
            <form action={removeAliasAction} className="inline-flex">
              <input type="hidden" name="commodityId" value={commodityId} />
              <input type="hidden" name="id" value={a.id} />
              {!a.isApproved && (
                <button name="op" value="approve" className="px-1 text-xs text-primary" title="Approve">
                  ✓
                </button>
              )}
              <button name="op" value="remove" className="px-1 text-xs text-danger" title="Remove" aria-label={`Remove alias ${a.alias}`}>
                ×
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form action={addAliasAction} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="commodityId" value={commodityId} />
        <input name="alias" required placeholder="New alias" className={`${inp} w-44`} />
        <select name="language" className={inp} defaultValue="ur_roman" aria-label="Language">
          <option value="ur_roman">Roman Urdu</option>
          <option value="ur">Urdu</option>
          <option value="en">English</option>
          <option value="other">Other / regional</option>
        </select>
        <input name="region" placeholder="region (optional)" className={`${inp} w-36`} />
        <select name="varietyId" className={inp} aria-label="Variety">
          <option value="">whole commodity</option>
          {varieties.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nameEn}
            </option>
          ))}
        </select>
        <button className={buttonClass("secondary", "sm")}>+ Add alias</button>
      </form>
    </section>
  );
}
