import Link from "next/link";

/** Fallback 404 outside the site group (admin and API paths). The site has its own in (site)/not-found.tsx. */
export default function RootNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-[28px] font-extrabold text-ink">Page not found</h1>
      <p className="mt-2 text-muted">The page you are looking for does not exist or has moved.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-brand-800 underline underline-offset-4">
        Go to homepage
      </Link>
    </div>
  );
}
