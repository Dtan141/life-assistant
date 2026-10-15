import { describe, expect, it } from 'vitest'
import { cardMatches, cardStatus, countByStatus } from '@/modules/flashcards/domain/card-status'
import type { Card, CardSrs } from '@/modules/flashcards/domain/card.types'

const NOW = new Date('2026-10-15T12:00:00Z')

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    deckId: 'd1',
    term: 'accidental',
    termLower: 'accidental',
    definition: 'vô tình, do tai nạn',
    pronunciation: '',
    partOfSpeech: 'adj',
    example: 'Most eagle deaths are accidental.',
    synonyms: [],
    antonyms: [],
    wordFamily: '',
    myExample: '',
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
    srs: null,
    ...overrides,
  }
}

function srs(overrides: Partial<CardSrs> = {}): CardSrs {
  return {
    due: NOW,
    stability: 1,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    state: 'review',
    lastReview: NOW,
    ...overrides,
  }
}

describe('cardStatus', () => {
  it('calls a card with no schedule new', () => {
    expect(cardStatus(card(), NOW)).toBe('new')
  })

  it('treats learning and relearning alike', () => {
    expect(cardStatus(card({ srs: srs({ state: 'learning' }) }), NOW)).toBe('learning')
    expect(cardStatus(card({ srs: srs({ state: 'relearning' }) }), NOW)).toBe('learning')
  })

  it('is due when the due date has arrived', () => {
    expect(cardStatus(card({ srs: srs({ due: NOW }) }), NOW)).toBe('due')
    const yesterday = new Date(NOW.getTime() - 86_400_000)
    expect(cardStatus(card({ srs: srs({ due: yesterday }) }), NOW)).toBe('due')
  })

  it('is known while the due date is still ahead', () => {
    const tomorrow = new Date(NOW.getTime() + 86_400_000)
    expect(cardStatus(card({ srs: srs({ due: tomorrow }) }), NOW)).toBe('known')
  })

  it('counts a mixed deck', () => {
    const counts = countByStatus(
      [
        card(),
        card({ srs: srs({ state: 'learning' }) }),
        card({ srs: srs({ due: new Date(NOW.getTime() + 86_400_000) }) }),
      ],
      NOW,
    )
    expect(counts).toEqual({ new: 1, learning: 1, due: 0, known: 1 })
  })
})

describe('cardMatches', () => {
  it('matches an empty query', () => {
    expect(cardMatches(card(), '   ')).toBe(true)
  })

  it('matches the term, the definition and the example', () => {
    expect(cardMatches(card(), 'accid')).toBe(true)
    expect(cardMatches(card(), 'tai nạn')).toBe(true)
    expect(cardMatches(card(), 'eagle')).toBe(true)
    expect(cardMatches(card(), 'không có')).toBe(false)
  })

  it('ignores diacritics, so an unaccented query still finds the word', () => {
    expect(cardMatches(card(), 'vo tinh')).toBe(true)
    expect(cardMatches(card({ definition: 'đường dây điện' }), 'duong day')).toBe(true)
  })

  it('ignores case', () => {
    expect(cardMatches(card(), 'ACCIDENTAL')).toBe(true)
  })
})
