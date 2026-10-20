"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { expirePriceAction, publishPriceAction, rejectPriceAction, scheduleExpiryAction, submitForReviewAction } from "@/lib/prices/actions";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export function PriceRecordActions({ id, status, canPublish, hasSource }: { id: string; status: string; canPublish: boolean; hasSource: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [until, setUntil] = useState("");

  async function run(fn: () => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>, okMsg: string) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast.push(okMsg, "success");
      router.refresh();
    } else {
      setError(`${res.error ?? "error"}${res.fieldErrors ? ": " + Object.entries(res.fieldErrors).map(([k, v]) => `${k} ${v}`).join(", ") : ""}`);
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-bold">Actions</h2>
      {error && <Alert tone="danger">{error}</Alert>}
      {status === "draft" && (
        <Button className="w-full" variant="secondary" loading={busy} onClick={() => run(() => submitForReviewAction(id), "Submitted for review")}>
          Submit for review
        </Button>
      )}
      {canPublish && ["draft", "pending_review"].includes(status) && (
        <>
          {!hasSource && <p className="text-sm text-warning">Add a source before publishing.</p>}
          <Button className="w-full" loading={busy} disabled={!hasSource} onClick={() => run(() => publishPriceAction(id), "Published")}>
            Publish
          </Button>
        </>
      )}
      {["draft", "pending_review"].includes(status) && (
        <ConfirmButton title="Reject this price record?" body="It will not be published. The reason is recorded in the history." confirmLabel="Reject" cancelLabel="Cancel" requireReason reasonLabel="Reason" onConfirm={(reason) => run(() => rejectPriceAction(id, reason), "Rejected")}>
          Reject
        </ConfirmButton>
      )}
      {canPublish && status === "published" && (
        <>
          <ConfirmButton title="Expire this rate now?" body="It disappears from today's rates and remains visible in the history as expired." confirmLabel="Expire now" cancelLabel="Cancel" requireReason reasonLabel="Reason (optional note)" onConfirm={(reason) => run(() => expirePriceAction(id, reason), "Expired")}>
            Expire now
          </ConfirmButton>
          <div className="border-t border-line pt-3">
            <label className="block text-sm font-semibold">Schedule expiry</label>
            <div className="mt-1 flex gap-2">
              <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="font-latin" />
              <Button variant="outline" disabled={!until} loading={busy} onClick={() => run(() => scheduleExpiryAction(id, until), "Expiry scheduled")}>
                Set
              </Button>
            </div>
          </div>
        </>
      )}
      {["superseded", "expired", "rejected"].includes(status) && <p className="text-sm text-muted">This record is {status} and read-only.</p>}
    </div>
  );
}
