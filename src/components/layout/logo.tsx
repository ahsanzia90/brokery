/** Wordmark: brand name with a lime "market dot". Falls back to an uploaded logo when set. */
export function Logo({ name, logoPath, className = "", inverted = false }: { name: string; logoPath?: string | null; className?: string; inverted?: boolean }) {
  if (logoPath) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/files/public/${logoPath}`} alt={name} className={`h-8 w-auto ${className}`} />;
  }
  return (
    <span className={`inline-flex items-baseline gap-1 font-latin text-[22px] font-extrabold tracking-[-0.03em] ${inverted ? "text-white" : "text-brand-900"} ${className}`} aria-label={name}>
      <span className="inline-flex items-center gap-1.5">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden className="self-center">
          <rect width="26" height="26" rx="8" fill={inverted ? "#c7ef6e" : "#0f5b3d"} />
          <path d="M7 18V8l6 6 6-6v10" stroke={inverted ? "#0b3d29" : "#ffffff"} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        {name}
      </span>
      <span className={`h-2 w-2 translate-y-[-1px] rounded-full ${inverted ? "bg-lime-500" : "bg-lime-500"}`} aria-hidden />
    </span>
  );
}
