/** Human-friendly references like RFQ-2026-7K3M2P. Uniqueness enforced by DB unique index; caller retries on conflict. */
import { randomSuffix } from "./text";

export function makeReference(prefix: string): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomSuffix(6).toUpperCase()}`;
}
