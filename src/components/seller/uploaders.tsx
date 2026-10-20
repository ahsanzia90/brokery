"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, ImagePlus, Paperclip, Trash2, Upload } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Select, inputClass } from "@/components/ui/form";

export type UploadedImage = { path: string; altText?: string | null; url?: string };

async function uploadFile(url: string, file: File): Promise<Response> {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(url, { method: "POST", body: fd });
}

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

/** Photo grid: existing images as tiles with reorder/remove, plus a dashed "add" tile. */
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
  const tileBtn = "inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-ink shadow-[var(--shadow-sm)] hover:bg-white disabled:opacity-40";
  const canAdd = images.length < max;
  return (
    <div>
      <ul className={`grid gap-3 ${kind === "logo" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
        {images.map((img, i) => (
          <li key={img.path} className="group relative aspect-[4/3] overflow-hidden rounded-[var(--r-md)] border border-line bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url ?? `/files/public/${img.path}`} alt="" className="h-full w-full object-cover" />
            {i === 0 && kind === "listing" && <span className="absolute start-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-bold text-white">{t("wizard.coverPhoto")}</span>}
            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1">
              {kind === "listing" ? (
                <span className="flex gap-1">
                  <button type="button" aria-label={t("wizard.moveUp")} onClick={() => move(i, -1)} disabled={i === 0} className={tileBtn}>
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  </button>
                  <button type="button" aria-label={t("wizard.moveDown")} onClick={() => move(i, 1)} disabled={i === images.length - 1} className={tileBtn}>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </button>
                </span>
              ) : (
                <span />
              )}
              <button type="button" aria-label={t("action.remove")} onClick={() => onChange(images.filter((_, k) => k !== i))} className={`${tileBtn} text-danger`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {canAdd && (
          <li>
            <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[var(--r-md)] border-2 border-dashed border-line-strong bg-surface-2/60 text-[13px] font-semibold text-ink-2 transition-colors hover:border-brand-700 hover:bg-brand-50 hover:text-brand-900 disabled:opacity-60">
              {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <ImagePlus className="h-6 w-6" aria-hidden />}
              {busy ? t("form.uploading") : t("wizard.addPhoto")}
            </button>
          </li>
        )}
      </ul>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={kind === "listing"} className="sr-only" id={`img-${kind}`} onChange={(e) => onFiles(e.target.files)} />
      <p className="mt-2 text-[13px] text-muted">{t("form.photosHint", { max, size: Math.round(maxBytes / 1024 / 1024) })}</p>
      {error && <p role="alert" className="mt-1 text-[13px] font-medium text-danger">{error}</p>}
    </div>
  );
}

function DocRow({ title, meta, onRemove, removeLabel }: { title: string; meta?: string; onRemove: () => void; removeLabel: string }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-tint-sky text-info">
        <FileText className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{title}</span>
        {meta && <span className="block text-[12px] text-muted num">{meta}</span>}
      </span>
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] text-muted hover:bg-danger-bg hover:text-danger">
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
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
        <ul className="mb-3 divide-y divide-line rounded-[var(--r-md)] border border-line bg-surface">
          {docs.map((d, i) => (
            <DocRow key={d.path} title={d.label} meta={kb(d.sizeBytes)} removeLabel={t("action.remove")} onRemove={() => onChange(docs.filter((_, k) => k !== i))} />
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1.5 block text-[14px] font-semibold text-ink">{t("wizard.docLabel")}</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} className={inputClass} placeholder="Lab report / SDS / Certificate" />
        </label>
        <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" id="listing-doc" onChange={(e) => onFile(e.target.files)} />
        <Button type="button" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
          <Paperclip className="h-4 w-4" aria-hidden /> {t("wizard.documents")}
        </Button>
      </div>
      <p className="mt-2 text-[13px] text-muted">{t("wizard.documentsHint")}</p>
      {error && <p role="alert" className="mt-1 text-[13px] font-medium text-danger">{error}</p>}
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
        <ul className="mb-3 divide-y divide-line rounded-[var(--r-md)] border border-line bg-surface">
          {docs.map((d, i) => (
            <DocRow key={d.id} title={types.find((x) => x.value === d.documentType)?.label ?? d.documentType} meta={`${d.originalFilename} · ${kb(d.sizeBytes)}`} removeLabel={t("action.remove")} onRemove={() => onChange(docs.filter((_, k) => k !== i))} />
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1.5 block text-[14px] font-semibold text-ink">{t("verify.docType")}</span>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </Select>
        </label>
        <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" id="business-doc" onChange={(e) => onFile(e.target.files)} />
        <Button type="button" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden /> {t("verify.docs")}
        </Button>
      </div>
      <p className="mt-2 text-[13px] text-muted">{t("verify.docsHint", { size: Math.round(maxBytes / 1024 / 1024) })}</p>
      {error && <p role="alert" className="mt-1 text-[13px] font-medium text-danger">{error}</p>}
    </div>
  );
}
