import { Alert } from "@/components/ui/alert";

/** Renders ?ok= / ?error= query messages after a redirect from a server action. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div className="mb-4">
      {ok && <Alert tone="success">{ok}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
