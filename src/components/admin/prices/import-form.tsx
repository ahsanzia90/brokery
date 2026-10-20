"use client";
import { useActionState } from "react";
import { importCsvAction } from "@/lib/prices/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";

export function ImportForm({ canPublish }: { canPublish: boolean }) {
  const [state, action, pending] = useActionState(importCsvAction, null);
  return (
    <div>
      <form action={action} className="card p-4">
        <Field label="CSV file" required error={state && !state.ok && state.error === "file_required" ? "Choose a CSV file" : null}>
          <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-base file:me-3 file:min-h-[44px] file:rounded-[var(--radius)] file:border file:border-line-strong file:bg-surface file:px-4 file:font-semibold" />
        </Field>
        {canPublish && <Checkbox name="publish" label="Publish valid rows immediately (otherwise they wait for review)" />}
        <Button type="submit" className="mt-4" loading={pending}>
          Import
        </Button>
        {state && !state.ok && state.error !== "file_required" && <Alert tone="danger" className="mt-4">{state.error}</Alert>}
      </form>
      {state?.ok && state.data && (
        <Alert tone={state.data.status === "completed" ? "success" : state.data.status === "failed" ? "danger" : "warning"} className="mt-4" title={`Import ${state.data.status}`}>
          <p className="num">
            {state.data.total} rows · {state.data.imported} imported · {state.data.failed} failed
          </p>
          {state.data.errors.length > 0 && (
            <ul className="mt-2 list-disc ps-5 text-sm">
              {state.data.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}
    </div>
  );
}
