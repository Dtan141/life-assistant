import { describe, expect, it } from 'vitest'
import {
  buildPracticeSession,
  buildSession,
  cardsInPlan,
  countDue,
  nextDueAt,
} from '@/modules/flashcards/domain/session'
import type { Card, CardSrs, Deck } from '@/modules/flashcards/domain/card.types'

const NOW = new Date('2026-10-15T20:00:00Z')
const DAY = 86_400_000

function card(id: string, srs: CardSrs | null = null): Card {
  return {
    id,
    deckId: 'd1',
    term: id,
    termLower: id,
    definition: `nghĩa ${id}`,
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

function srs(dueOffsetDays: number, state: CardSrs['state'] = 'review'): CardSrs {
  return {
    due: new Date(NOW.getTime() + dueOffsetDays * DAY),
    stability: 5,
    difficulty: 5,
    reps: 2,
    lapses: 0,
    state,
    lastReview: new Date(NOW.getTime() - DAY),
  }
}

const LIMITS = { newPerDay: 20, maxReviewsPerDay: 200 }

describe('buildSession', () => {
  it('puts due cards before new ones', () => {
    const plan = buildSession(
      [card('new1'), card('due1', srs(-1)), card('new2'), card('due2', srs(-2))],
      LIMITS,
      undefined,
      NOW,
    )
    expect(plan.queue.map((c) => c.id)).toEqual(['due2', 'due1', 'new1', 'new2'])
    expect(plan).toMatchObject({ dueCount: 2, newCount: 2, heldBack: 0 })
  })

  it('shows the longest-overdue card first', () => {
    const plan = buildSession(
      [card('a', srs(-1)), card('b', srs(-10)), card('c', srs(-5))],
      LIMITS,
      undefined,
      NOW,
    )
    expect(plan.queue.map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })

  it('leaves out cards that are not due yet', () => {
    const plan = buildSession([card('later', srs(3))], LIMITS, undefined, NOW)
    expect(plan.queue).toEqual([])
  })

  it('treats a card due exactly now as due', () => {
    const plan = buildSession([card('onTime', srs(0))], LIMITS, undefined, NOW)
    expect(plan.queue.map((c) => c.id)).toEqual(['onTime'])
  })

  it('includes learning cards whose step has come round', () => {
    const plan = buildSession(
      [card('step', srs(-0.01, 'learning'))],
      LIMITS,
      undefined,
      NOW,
    )
    expect(plan.queue.map((c) => c.id)).toEqual(['step'])
  })
})

describe('daily limits', () => {
  const manyNew = Array.from({ length: 30 }, (_, i) => card(`new${i}`))
  const manyDue = Array.from({ length: 10 }, (_, i) => card(`due${i}`, srs(-i - 1)))

  it('introduces at most newPerDay new cards', () => {
    const plan = buildSession(manyNew, { ...LIMITS, newPerDay: 5 }, undefined, NOW)
    expect(plan.newCount).toBe(5)
  })

  it('caps reviews and reports what was held back', () => {
    const plan = buildSession(manyDue, { ...LIMITS, maxReviewsPerDay: 4 }, undefined, NOW)
    expect(plan).toMatchObject({ dueCount: 4, heldBack: 6 })
  })

  it('counts work already done today against the allowance', () => {
    const plan = buildSession(
      [...manyDue, ...manyNew],
      { newPerDay: 20, maxReviewsPerDay: 200 },
      { newDone: 18, reviewsDone: 196 },
      NOW,
    )
    expect(plan).toMatchObject({ dueCount: 4, newCount: 2 })
  })

  it('stops entirely once the allowance is spent', () => {
    const plan = buildSession(
      [...manyDue, ...manyNew],
      LIMITS,
      { newDone: 20, reviewsDone: 200 },
      NOW,
    )
    expect(plan.queue).toEqual([])
    expect(plan.heldBack).toBe(10)
  })

  it('still teaches new cards when the review allowance is spent', () => {
    // A review backlog must not block learning; the two ceilings are separate.
    const plan = buildSession(
      [...manyDue, ...manyNew],
      LIMITS,
      { newDone: 0, reviewsDone: 200 },
      NOW,
    )
    expect(plan).toMatchObject({ dueCount: 0, newCount: 20 })
  })
})

describe('countDue', () => {
  it('ignores today’s limits', () => {
    const cards = Array.from({ length: 10 }, (_, i) => card(`d${i}`, srs(-1)))
    expect(countDue(cards, NOW)).toBe(10)
  })

  it('does not count new cards', () => {
    expect(countDue([card('new'), card('due', srs(-1))], NOW)).toBe(1)
  })
})

describe('buildPracticeSession', () => {
  const cards = [card('a'), card('b'), card('c')]

  it('keeps every card', () => {
    const practice = buildPracticeSession(cards, () => 0.5)
    expect(practice.map((c) => c.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input', () => {
    buildPracticeSession(cards, () => 0.5)
    expect(cards.map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })

  it('shuffles', () => {
    // A fixed generator makes the permutation deterministic to assert on.
    // Fisher-Yates with j always 0: [a,b,c] -> swap 2,0 -> [c,b,a] -> swap 1,0.
    expect(buildPracticeSession(cards, () => 0).map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('cardsInPlan', () => {
  function deck(id: string, overrides: Partial<Deck> = {}): Deck {
    return {
      id,
      name: id,
      description: '',
      tags: [],
      sourceUrl: '',
      collection: '',
      inPlan: true,
      cardCount: 0,
      createdAt: NOW,
      updatedAt: NOW,
      archived: false,
      ...overrides,
    }
  }

  function cardIn(id: string, deckId: string): Card {
    return { ...card(id), deckId }
  }

  it('keeps only cards from decks in the plan', () => {
    const cards = [cardIn('a', 'studying'), cardIn('b', 'library')]
    const decks = [deck('studying'), deck('library', { inPlan: false })]
    expect(cardsInPlan(cards, decks).map((c) => c.id)).toEqual(['a'])
  })

  it('drops archived decks even when they are in the plan', () => {
    // Putting a deck away should stop it asking for attention.
    const decks = [deck('old', { archived: true })]
    expect(cardsInPlan([cardIn('a', 'old')], decks)).toEqual([])
  })

  it('drops cards whose deck no longer exists', () => {
    expect(cardsInPlan([cardIn('a', 'deleted')], [])).toEqual([])
  })

  it('keeps everything when every deck is in the plan', () => {
    const decks = [deck('one'), deck('two')]
    const cards = [cardIn('a', 'one'), cardIn('b', 'two')]
    expect(cardsInPlan(cards, decks)).toHaveLength(2)
  })
})

describe('nextDueAt', () => {
  it('finds the soonest card still ahead', () => {
    const cards = [card('a', srs(5)), card('b', srs(2)), card('c', srs(9))]
    expect(nextDueAt(cards, NOW)).toEqual(new Date(NOW.getTime() + 2 * DAY))
  })

  it('ignores cards already due', () => {
    // Those belong in today's queue, not in "when is there something again".
    const cards = [card('overdue', srs(-3)), card('later', srs(4))]
    expect(nextDueAt(cards, NOW)).toEqual(new Date(NOW.getTime() + 4 * DAY))
  })

  it('ignores cards with no schedule', () => {
    expect(nextDueAt([card('new')], NOW)).toBeNull()
  })

  it('returns null when nothing is scheduled ahead', () => {
    expect(nextDueAt([card('a', srs(-1))], NOW)).toBeNull()
  })
})
