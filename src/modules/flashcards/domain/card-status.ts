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
  const needle = foldForSearch(queryText)
  if (!needle) return true
  return (
    foldForSearch(card.term).includes(needle) ||
    foldForSearch(card.definition).includes(needle) ||
    foldForSearch(card.example).includes(needle)
  )
}

/**
 * Strips diacritics and case for comparison, so "tu vung" matches "Từ vựng".
 * Typing Vietnamese accents on a phone keyboard is slow enough that an
 * exact-match search would go unused.
 */
export function foldForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}
