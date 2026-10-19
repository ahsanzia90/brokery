"use client";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

export type UploadedImage = { path: string; altText?: string | null; url?: string };

async function uploadFile(url: string, file: File): Promise<Response> {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(url, { method: "POST", body: fd });
}

export function ImageUploader({ images, onChange, max, maxBytes, kind = "listing" }: { images: UploadedImage[]; onChange: (imgs: UploadedImage[]) => void; max: number; maxBytes: number; kind?: "listing" | "logo" }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = max - images.length;
    if (room <= 0) {
      setError(t("wizard.maxPhotos", { max }));
      return;
    }
    setBusy(true);
    const next = [...images];
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (file.size > maxBytes) {
          setError(t("wizard.photoTooLarge"));
          continue;
        }
        const res = await uploadFile(`/api/uploads/image?kind=${kind}`, file);
        if (!res.ok) {
          setError(t("wizard.uploadFailed"));
          continue;
        }
        const data = (await res.json()) as { path: string; url: string };
        next.push({ path: data.path, url: data.url });
      }
      onChange(next);
    } catch {
      setError(t("wizard.uploadFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      {images.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.path} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url ?? `/files/public/${img.path}`} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="flex flex-wrap gap-1 p-2">
                {kind === "listing" && (
                  <>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="min-h-[36px] rounded-[6px] border border-border px-2 text-xs font-semibold disabled:opacity-40">
                      ↑ {t("wizard.moveUp")}
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="min-h-[36px] rounded-[6px] border border-border px-2 text-xs font-semibold disabled:opacity-40">
                      ↓ {t("wizard.moveDown")}
                    </button>
                  </>
                )}
                <button type="button" onClick={() => onChange(images.filter((_, k) => k !== i))} className="ms-auto min-h-[36px] rounded-[6px] border border-danger px-2 text-xs font-semibold text-danger">
                  {t("action.remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={kind === "listing"} className="sr-only" id={`img-${kind}`} onChange={(e) => onFiles(e.target.files)} />
      <Button type="button" variant="outline" loading={busy} disabled={images.length >= max} onClick={() => inputRef.current?.click()}>
        📷 {t("wizard.addPhoto")}
      </Button>
      <p className="mt-1 text-sm text-text-muted">{t("form.photosHint", { max, size: Math.round(maxBytes / 1024 / 1024) })}</p>
      {error && <p role="alert" className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

export type UploadedDoc = { path: string; label: string; mimeType: string; sizeBytes: number; isPublic: boolean; originalFilename?: string };

/** Listing documents: stored privately; returned path is attached by the listing action. */
export function ListingDocumentUploader({ docs, onChange, maxBytes }: { docs: UploadedDoc[]; onChange: (d: UploadedDoc[]) => void; maxBytes: number }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > maxBytes) {
      setError(t("wizard.photoTooLarge"));
      return;
    }
    setBusy(true);
    try {
      const res = await uploadFile("/api/uploads/document?kind=listing", file);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { path: string; mimeType: string; sizeBytes: number; originalFilename: string };
      onChange([...docs, { path: data.path, label: label.trim() || data.originalFilename, mimeType: data.mimeType, sizeBytes: data.sizeBytes, isPublic: false, originalFilename: data.originalFilename }]);
      setLabel("");
    } catch {
      setError(t("wizard.uploadFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  return (
    <div>
      {docs.length > 0 && (
        <ul className="mb-3 divide-y divide-border rounded-[var(--radius)] border border-border bg-surface">
          {docs.map((d, i) => (
            <li key={d.path} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                📄 {d.label} <span className="text-sm text-text-muted num">({Math.round(d.sizeBytes / 1024)} KB)</span>
              </span>
              <button type="button" onClick={() => onChange(docs.filter((_, k) => k !== i))} className="min-h-[36px] text-sm font-semibold text-danger">
                {t("action.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="block text-sm font-semibold">{t("wizard.docLabel")}</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} className="mt-1 block w-full min-h-[44px] rounded-[var(--radius)] border border-border-strong px-3" placeholder="Lab report / SDS / Certificate" />
        </label>
        <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" id="listing-doc" onChange={(e) => onFile(e.target.files)} />
        <Button type="button" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
          📎 {t("wizard.documents")}
        </Button>
      </div>
      <p className="mt-1 text-sm text-text-muted">{t("wizard.documentsHint")}</p>
      {error && <p role="alert" className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

export type BusinessDoc = { id: string; documentType: string; originalFilename: string; sizeBytes: number };

/** Business verification documents: recorded server-side in business_documents, returns ids. */
export function BusinessDocumentUploader({ docs, onChange, maxBytes, types }: { docs: BusinessDoc[]; onChange: (d: BusinessDoc[]) => void; maxBytes: number; types: Array<{ value: string; label: string }> }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(types[0]?.value ?? "other");
  const inputRef = useRef<HTMLInputElement>(null);
  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > maxBytes) {
      setError(t("wizard.photoTooLarge"));
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", type);
      const res = await fetch("/api/uploads/document", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as BusinessDoc;
      onChange([...docs, data]);
    } catch {
      setError(t("wizard.uploadFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  return (
    <div>
      {docs.length > 0 && (
        <ul className="mb-3 divide-y divide-border rounded-[var(--radius)] border border-border bg-surface">
          {docs.map((d, i) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                📄 {types.find((x) => x.value === d.documentType)?.label ?? d.documentType} — {d.originalFilename}
              </span>
              <button type="button" onClick={() => onChange(docs.filter((_, k) => k !== i))} className="min-h-[36px] text-sm font-semibold text-danger">
                {t("action.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="block text-sm font-semibold">{t("verify.docType")}</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full min-h-[44px] rounded-[var(--radius)] border border-border-strong px-3">
            {types.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" id="business-doc" onChange={(e) => onFile(e.target.files)} />
        <Button type="button" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
          📎 {t("verify.docs")}
        </Button>
      </div>
      <p className="mt-1 text-sm text-text-muted">{t("verify.docsHint", { size: Math.round(maxBytes / 1024 / 1024) })}</p>
      {error && <p role="alert" className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
