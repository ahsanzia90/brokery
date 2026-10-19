"use client";
import Link from "next/link";

type Copy = { title: string; sub: string; en: string };

function send(name: "home_buy_click" | "home_sell_click") {
  try {
    navigator.sendBeacon?.("/api/events", new Blob([JSON.stringify({ name })], { type: "application/json" }));
  } catch {}
}

export function HeroActions({ buy, sell }: { buy: Copy; sell: Copy }) {
  const cls = "card flex min-h-[150px] flex-col justify-center gap-1.5 p-6 text-start transition hover:shadow-md focus-visible:outline-accent";
  return (
    <div className="mx-auto mt-6 grid max-w-3xl gap-4 md:grid-cols-2">
      <Link href="/buy" onClick={() => send("home_buy_click")} className={`${cls} border-primary bg-primary-soft hover:border-primary-strong`}>
        <span className="text-3xl" aria-hidden>
          🛒
        </span>
        <span className="text-xl font-extrabold text-primary-strong md:text-2xl">{buy.title}</span>
        <span className="text-sm font-semibold text-primary">{buy.en}</span>
        <span className="text-text-muted">{buy.sub}</span>
      </Link>
      <Link href="/sell" onClick={() => send("home_sell_click")} className={`${cls} border-accent bg-accent-soft hover:border-[#966218]`}>
        <span className="text-3xl" aria-hidden>
          🏷️
        </span>
        <span className="text-xl font-extrabold text-[#6b4712] md:text-2xl">{sell.title}</span>
        <span className="text-sm font-semibold text-accent">{sell.en}</span>
        <span className="text-text-muted">{sell.sub}</span>
      </Link>
    </div>
  );
}
