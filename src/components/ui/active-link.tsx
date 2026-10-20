"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

/**
 * Link whose active state follows the live URL. Layouts stay mounted across client
 * navigations in the App Router, so server-computed "current path" props go stale;
 * this reads the pathname on the client instead.
 */
export function useIsActive(href: string, exact = false): boolean {
  const pathname = usePathname() ?? "/";
  if (exact || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function ActiveLink({ href, exact, activeClassName = "", inactiveClassName = "", className = "", children, ...rest }: Omit<ComponentProps<typeof Link>, "href" | "children"> & { href: string; exact?: boolean; activeClassName?: string; inactiveClassName?: string; children: ReactNode | ((active: boolean) => ReactNode) }) {
  const active = useIsActive(href, exact);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`${className} ${active ? activeClassName : inactiveClassName}`.trim()} {...rest}>
      {typeof children === "function" ? children(active) : children}
    </Link>
  );
}

/** Returns the current pathname for building "next" parameters on the client. */
export function useCurrentPath(): string {
  return usePathname() ?? "/";
}
