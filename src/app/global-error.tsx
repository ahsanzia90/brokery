"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#faf8f3", color: "#1d1f1a", padding: "4rem 1rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Something went wrong / کچھ غلط ہو گیا</h1>
        <p style={{ color: "#5c6157", marginTop: "0.5rem" }}>We have recorded the problem. Please try again in a moment.</p>
        {error.digest && <p style={{ fontSize: "0.75rem", color: "#5c6157" }}>ref: {error.digest}</p>}
        <button type="button" onClick={() => reset()} style={{ marginTop: "1.5rem", minHeight: 48, padding: "0 1.5rem", background: "#1f6b3a", color: "#fff", border: 0, borderRadius: 10, fontWeight: 600, fontSize: "1rem" }}>
          Try again / دوبارہ کوشش کریں
        </button>
      </body>
    </html>
  );
}
