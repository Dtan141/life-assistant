import { describe, expect, it } from 'vitest'
import {
  computeStreak,
  dueForecast,
  mostForgotten,
  retentionRate,
  reviewsPerDay,
} from '@/modules/flashcards/domain/stats'
import type { Card, CardSrs } from '@/modules/flashcards/domain/card.types'
import type { ReviewLogEntry } from '@/modules/flashcards/domain/backup'

// Mid-morning local time, so "today" is unambiguous whatever the test machine.
const NOW = new Date(2026, 9, 16, 10, 0, 0)

function at(daysFromNow: number, hour = 10): Date {
  const date = new Date(NOW)
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(hour, 0, 0, 0)
  return date
}

function card(id: string, srs: CardSrs | null = null): Card {
  return {
    id,
    deckId: 'd1',
    term: id,
    termLower: id,
    definition: '',
    pronunciation: '',
    partOfSpeech: '',
    example: '',
    synonyms: [],
    antonyms: [],
    wordFamily: '',
    myExample: '',
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
    srs,
  }
}

function srs(dueInDays: number, lapses = 0): CardSrs {
  return {
    due: at(dueInDays),
    stability: 5,
    difficulty: 5,
    reps: 3,
    lapses,
    state: 'review',
    lastReview: at(-1),
  }
}

function log(daysAgo: number, { wasNew = false, rating = 3 } = {}): ReviewLogEntry {
  return {
    id: `log-${daysAgo}-${Math.random()}`,
    cardId: 'c',
    deckId: 'd1',
    rating,
    reviewedAt: at(-daysAgo),
    elapsedDays: 1,
    scheduledDays: 1,
    mode: 'en-vi',
    wasNew,
  }
}

describe('dueForecast', () => {
  it('counts each day separately', () => {
    const forecast = dueForecast([card('a', srs(0)), card('b', srs(2)), card('c', srs(2))], 7, NOW)
    expect(forecast.map((d) => d.count)).toEqual([1, 0, 2, 0, 0, 0, 0])
  })

  it('folds overdue cards into today rather than hiding them in the past', () => {
    const forecast = dueForecast([card('a', srs(-5)), card('b', srs(-1))], 7, NOW)
    expect(forecast[0].count).toBe(2)
  })

  it('ignores cards due beyond the window', () => {
    expect(dueForecast([card('a', srs(30))], 7, NOW).every((d) => d.count === 0)).toBe(true)
  })

  it('ignores cards with no schedule', () => {
    expect(dueForecast([card('new')], 7, NOW)[0].count).toBe(0)
  })
})

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const streak = computeStreak([log(0), log(1), log(2)], NOW)
    expect(streak).toMatchObject({ current: 3, studiedToday: true })
  })

  it('keeps the streak alive on a day not yet studied', () => {
    // Otherwise the number would drop to zero every midnight and jump back up
    // at the first review, which reads as losing a streak you still have.
    const streak = computeStreak([log(1), log(2)], NOW)
    expect(streak).toMatchObject({ current: 2, studiedToday: false })
  })

  it('breaks after a missed day', () => {
    expect(computeStreak([log(0), log(2), log(3)], NOW).current).toBe(1)
  })

  it('counts several reviews on one day once', () => {
    expect(computeStreak([log(0), log(0), log(0)], NOW).current).toBe(1)
  })

  it('remembers the longest run even after it is broken', () => {
    const logs = [log(0), log(5), log(6), log(7), log(8)]
    expect(computeStreak(logs, NOW)).toMatchObject({ current: 1, longest: 4 })
  })

  it('reports zero with no history', () => {
    expect(computeStreak([], NOW)).toEqual({ current: 0, longest: 0, studiedToday: false })
  })
})

describe('retentionRate', () => {
  it('excludes first meetings with new cards', () => {
    // Four new cards rated Again would otherwise read as 20% retention.
    const logs = [
      log(0, { wasNew: true, rating: 1 }),
      log(0, { wasNew: true, rating: 1 }),
      log(0, { rating: 3 }),
    ]
    expect(retentionRate(logs)).toEqual({ total: 1, remembered: 1, rate: 1 })
  })

  it('counts Hard, Good and Easy as remembered, Again as forgotten', () => {
    const logs = [
      log(0, { rating: 1 }),
      log(0, { rating: 2 }),
      log(0, { rating: 3 }),
      log(0, { rating: 4 }),
    ]
    expect(retentionRate(logs)).toMatchObject({ total: 4, remembered: 3 })
    expect(retentionRate(logs).rate).toBeCloseTo(0.75)
  })

  it('returns null rather than zero when there is nothing to measure', () => {
    expect(retentionRate([]).rate).toBeNull()
    expect(retentionRate([log(0, { wasNew: true })]).rate).toBeNull()
  })
})

describe('reviewsPerDay', () => {
  it('ends on today and runs oldest first', () => {
    const series = reviewsPerDay([log(0), log(0), log(1)], 3, NOW)
    expect(series.map((d) => d.count)).toEqual([0, 1, 2])
  })
})

describe('mostForgotten', () => {
  it('orders by lapses and leaves out cards never forgotten', () => {
    const cards = [
      card('easy', srs(1, 0)),
      card('hard', srs(1, 5)),
      card('medium', srs(1, 2)),
      card('new'),
    ]
    expect(mostForgotten(cards).map((c) => c.term)).toEqual(['hard', 'medium'])
  })

  it('respects the limit', () => {
    const cards = Array.from({ length: 20 }, (_, i) => card(`c${i}`, srs(1, i + 1)))
    expect(mostForgotten(cards, 3)).toHaveLength(3)
  })
})
