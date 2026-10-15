import type { Card } from '@/modules/flashcards/domain/card.types'

export type CardStatus = 'new' | 'learning' | 'due' | 'known'

export const STATUS_LABELS: Record<CardStatus, string> = {
  new: 'Mới',
  learning: 'Đang học',
  due: 'Cần ôn',
  known: 'Đã thuộc',
}

/**
 * Derived from the schedule rather than stored, so it can never drift out of
 * step with the FSRS state the reviewer writes.
 */
export function cardStatus(card: Card, now: Date = new Date()): CardStatus {
  if (!card.srs) return 'new'
  if (card.srs.state === 'new') return 'new'
  if (card.srs.state === 'learning' || card.srs.state === 'relearning') return 'learning'
  return card.srs.due <= now ? 'due' : 'known'
}

export function countByStatus(
  cards: readonly Card[],
  now: Date = new Date(),
): Record<CardStatus, number> {
  const counts: Record<CardStatus, number> = { new: 0, learning: 0, due: 0, known: 0 }
  for (const card of cards) counts[cardStatus(card, now)] += 1
  return counts
}

/**
 * Matches a term, its definition, or its example. Accent-insensitive, so
 * typing "vo tinh" finds "vô tình" — the keyboard on a phone makes typing
 * diacritics a chore.
 */
export function cardMatches(card: Card, queryText: string): boolean {
  const needle = fold(queryText)
  if (!needle) return true
  return (
    fold(card.term).includes(needle) ||
    fold(card.definition).includes(needle) ||
    fold(card.example).includes(needle)
  )
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}
