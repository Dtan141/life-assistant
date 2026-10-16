import { startOfDay } from '@/modules/flashcards/domain/day'
import type { Card } from '@/modules/flashcards/domain/card.types'
import type { ReviewLogEntry } from '@/modules/flashcards/domain/backup'

export interface ForecastDay {
  date: Date
  count: number
}

/**
 * How many cards fall due on each of the next `days` days.
 *
 * Anything already overdue is folded into today: it is waiting now, and
 * showing it on the day it was originally scheduled would hide the backlog.
 */
export function dueForecast(
  cards: readonly Card[],
  days = 7,
  now: Date = new Date(),
): ForecastDay[] {
  const today = startOfDay(now)
  const out: ForecastDay[] = Array.from({ length: days }, (_, offset) => ({
    date: addDays(today, offset),
    count: 0,
  }))

  for (const card of cards) {
    if (!card.srs) continue
    const offset = Math.floor(
      (startOfDay(card.srs.due).getTime() - today.getTime()) / 86_400_000,
    )
    if (offset >= days) continue
    out[Math.max(0, offset)].count += 1
  }

  return out
}

export interface Streak {
  current: number
  longest: number
  studiedToday: boolean
}

/**
 * Consecutive days with at least one review.
 *
 * A day with no review yet does not break the streak until it is over, so the
 * count stays put all day instead of dropping to zero every midnight and
 * recovering at the first review.
 */
export function computeStreak(
  logs: readonly ReviewLogEntry[],
  now: Date = new Date(),
): Streak {
  const days = new Set(
    logs.map((log) => startOfDay(log.reviewedAt).getTime()),
  )
  if (days.size === 0) return { current: 0, longest: 0, studiedToday: false }

  const today = startOfDay(now).getTime()
  const studiedToday = days.has(today)

  let current = 0
  // Count back from today if it has a review, otherwise from yesterday.
  let cursor = studiedToday ? today : today - 86_400_000
  while (days.has(cursor)) {
    current += 1
    cursor -= 86_400_000
  }

  const sorted = [...days].sort((a, b) => a - b)
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] - sorted[i - 1] === 86_400_000 ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  return { current, longest, studiedToday }
}

export interface RetentionStats {
  /** Reviews of cards that had been learned before — new cards are excluded. */
  total: number
  remembered: number
  /** null rather than 0 when there is nothing to measure yet. */
  rate: number | null
}

/**
 * The share of reviews recalled successfully.
 *
 * Only counts reviews of cards that were already learned: a first meeting with
 * a new word says nothing about retention, and including them would drag the
 * figure down whenever a batch of new cards is introduced.
 */
export function retentionRate(logs: readonly ReviewLogEntry[]): RetentionStats {
  const relevant = logs.filter((log) => !log.wasNew)
  const remembered = relevant.filter((log) => log.rating > 1).length
  return {
    total: relevant.length,
    remembered,
    rate: relevant.length === 0 ? null : remembered / relevant.length,
  }
}

/** Reviews per day over the last `days` days, oldest first. */
export function reviewsPerDay(
  logs: readonly ReviewLogEntry[],
  days = 14,
  now: Date = new Date(),
): ForecastDay[] {
  const today = startOfDay(now)
  const counts = new Map<number, number>()
  for (const log of logs) {
    const key = startOfDay(log.reviewedAt).getTime()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1)
    return { date, count: counts.get(date.getTime()) ?? 0 }
  })
}

/**
 * Cards forgotten most often — the ones worth tagging `can-on-ky`, per spec
 * §3.7. Ordered by lapses, then by how recently they are due, so two cards
 * with the same count are not in arbitrary order.
 */
export function mostForgotten(cards: readonly Card[], limit = 10): Card[] {
  return cards
    .filter((card) => (card.srs?.lapses ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.srs?.lapses ?? 0) - (a.srs?.lapses ?? 0) ||
        (a.srs?.due.getTime() ?? 0) - (b.srs?.due.getTime() ?? 0),
    )
    .slice(0, limit)
}

function addDays(from: Date, days: number): Date {
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  return date
}
