// src/v1/utils/retry.ts
import { RETRY_CONFIG } from "../constants";

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function backoff(
  attempt: number,
  baseMs: number = RETRY_CONFIG.DEFAULT_BASE_MS,
  maxMs: number = RETRY_CONFIG.DEFAULT_MAX_MS
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = Math.random() * 0.2 * exp;
  return exp + jitter;
}
