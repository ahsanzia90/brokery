"use client";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { useCurrentPath } from "@/components/ui/active-link";

export function SignInLink({ label, size = "md", variant = "outline" }: { label: string; size?: "md" | "lg"; variant?: "outline" | "primary" }) {
  const path = useCurrentPath();
  return (
    <Link href={`/login?next=${encodeURIComponent(path)}`} className={buttonClass(variant, size)}>
      {label}
    </Link>
  );
}
