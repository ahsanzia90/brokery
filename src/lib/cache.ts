import { unstable_cache } from "next/cache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncFn = (...args: any[]) => Promise<any>;

/**
 * `unstable_cache` with a graceful fallback: outside the Next.js runtime (scripts, vitest)
 * the underlying function is called directly instead of throwing "incrementalCache missing".
 */
export function cached<T extends AsyncFn>(fn: T, keys: string[], opts: { tags?: string[]; revalidate?: number | false }): T {
  const c = unstable_cache(fn, keys, opts);
  return (async (...args: Parameters<T>) => {
    try {
      return await c(...args);
    } catch (e) {
      if (e instanceof Error && /incrementalCache/i.test(e.message)) return fn(...args);
      throw e;
    }
  }) as T;
}
