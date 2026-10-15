/**
 * Firestore allows 500 writes per batch. An import also touches the deck's
 * cardCount, so leave headroom rather than sitting exactly on the limit.
 */
export const BATCH_LIMIT = 450

export function chunk<T>(items: readonly T[], size = BATCH_LIMIT): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
