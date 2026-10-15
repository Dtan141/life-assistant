import { describe, expect, it } from 'vitest'
import {
  applyRating,
  formatInterval,
  fromFsrsCard,
  previewRatings,
  toFsrsCard,
} from '@/modules/flashcards/domain/srs'
import type { CardSrs } from '@/modules/flashcards/domain/card.types'

const NOW = new Date('2026-10-15T20:00:00Z')
const RETENTION = 0.9

const DAY = 86_400_000

describe('scheduling a brand new card', () => {
  const preview = previewRatings(null, RETENTION, NOW)

  it('offers all four ratings', () => {
    expect(Object.keys(preview).sort()).toEqual(['again', 'easy', 'good', 'hard'])
  })

  it('orders the intervals Again < Hard < Good < Easy', () => {
    const { again, hard, good, easy } = preview
    expect(again.intervalDays).toBeLessThan(hard.intervalDays)
    expect(hard.intervalDays).toBeLessThan(good.intervalDays)
    expect(good.intervalDays).toBeLessThan(easy.intervalDays)
  })

  it('brings a forgotten card back within the same session', () => {
    expect(preview.again.intervalDays).toBeLessThan(1)
  })

  it('leaves a new card in a learning state after Again', () => {
    expect(preview.again.srs.state).toBe('learning')
  })

  it('counts the review and sets lastReview', () => {
    const next = applyRating(null, 'good', RETENTION, NOW)
    expect(next.reps).toBe(1)
    expect(next.lapses).toBe(0)
    expect(next.lastReview).toEqual(NOW)
    expect(next.due.getTime()).toBeGreaterThan(NOW.getTime())
  })

  it('agrees with what the preview promised', () => {
    const applied = applyRating(null, 'easy', RETENTION, NOW)
    expect(applied.due).toEqual(preview.easy.srs.due)
    expect(applied.state).toEqual(preview.easy.srs.state)
  })
})

describe('scheduling a card under review', () => {
  const reviewed: CardSrs = {
    due: new Date(NOW.getTime() - DAY),
    stability: 10,
    difficulty: 5,
    reps: 4,
    lapses: 0,
    state: 'review',
    lastReview: new Date(NOW.getTime() - 11 * DAY),
  }

  it('sends a remembered card further out than a new one', () => {
    const next = applyRating(reviewed, 'good', RETENTION, NOW)
    expect(next.due.getTime() - NOW.getTime()).toBeGreaterThan(5 * DAY)
    expect(next.state).toBe('review')
  })

  it('counts a lapse and relearns when forgotten', () => {
    const next = applyRating(reviewed, 'again', RETENTION, NOW)
    expect(next.lapses).toBe(1)
    expect(next.state).toBe('relearning')
    expect(next.due.getTime() - NOW.getTime()).toBeLessThan(DAY)
  })

  it('schedules further out at a lower desired retention', () => {
    const strict = applyRating(reviewed, 'good', 0.95, NOW)
    const relaxed = applyRating(reviewed, 'good', 0.8, NOW)
    expect(relaxed.due.getTime()).toBeGreaterThan(strict.due.getTime())
  })
})

describe('round-tripping through ts-fsrs', () => {
  it('preserves every stored field', () => {
    const srs: CardSrs = {
      due: new Date('2026-11-01T00:00:00Z'),
      stability: 12.5,
      difficulty: 6.25,
      reps: 7,
      lapses: 2,
      state: 'relearning',
      lastReview: new Date('2026-10-20T00:00:00Z'),
    }
    expect(fromFsrsCard(toFsrsCard(srs, NOW))).toEqual(srs)
  })

  it('turns a card with no schedule into a fresh one', () => {
    expect(fromFsrsCard(toFsrsCard(null, NOW))).toMatchObject({
      state: 'new',
      reps: 0,
      lapses: 0,
      lastReview: null,
    })
  })
})

describe('formatInterval', () => {
  it.each([
    [0.5 / 1440, '<1 phút'],
    [10 / 1440, '10 phút'],
    [3 / 24, '3 giờ'],
    [1, '1 ngày'],
    [4, '4 ngày'],
    [45, '2 tháng'],
    [400, '1.1 năm'],
  ])('renders %s days as %s', (days, expected) => {
    expect(formatInterval(days)).toBe(expected)
  })
})
