import { describe, expect, it } from 'vitest'
import {
  BACKUP_VERSION,
  deckToTsv,
  findOrphanCards,
  parseBackup,
  serializeBackup,
} from '@/modules/flashcards/domain/backup'
import type { BackupData } from '@/modules/flashcards/domain/backup'
import { parseCards } from '@/modules/flashcards/domain/tsv-parser'
import { DEFAULT_SETTINGS } from '@/shared/types'
import type { Card, Deck } from '@/modules/flashcards/domain/card.types'

const NOW = new Date('2026-10-16T09:00:00.000Z')

const deck: Deck = {
  id: 'deck-1',
  name: 'Study4 — Eagles',
  description: 'Bài nghe đại bàng',
  tags: ['study4'],
  sourceUrl: 'https://notion.so/x',
  collection: 'TOEIC 600',
  inPlan: true,
  cardCount: 1,
  createdAt: NOW,
  updatedAt: NOW,
  archived: false,
}

const card: Card = {
  id: 'card-1',
  deckId: 'deck-1',
  term: 'accidental',
  termLower: 'accidental',
  definition: 'vô tình, do tai nạn',
  pronunciation: '/ˌæksɪˈdentl/',
  partOfSpeech: 'adj',
  example: 'Most eagle deaths are accidental.',
  synonyms: ['unintentional', 'chance'],
  antonyms: ['deliberate'],
  wordFamily: '',
  myExample: '',
  tags: ['can-on-ky'],
  createdAt: NOW,
  updatedAt: NOW,
  srs: {
    due: new Date('2026-10-20T09:00:00.000Z'),
    stability: 4.2,
    difficulty: 5.1,
    reps: 3,
    lapses: 1,
    state: 'review',
    lastReview: NOW,
  },
}

const data: BackupData = {
  settings: DEFAULT_SETTINGS,
  decks: [deck],
  cards: [card],
  reviewLogs: [
    {
      id: 'log-1',
      cardId: 'card-1',
      deckId: 'deck-1',
      rating: 3,
      reviewedAt: NOW,
      elapsedDays: 2,
      scheduledDays: 4,
      mode: 'en-vi',
      wasNew: false,
    },
  ],
}

describe('a backup survives a round trip', () => {
  const result = parseBackup(serializeBackup(data, NOW))
  if (!result.ok) throw new Error(result.error)
  const { file } = result

  it('keeps the deck intact', () => {
    expect(file.decks[0]).toEqual(deck)
  })

  it('keeps the card intact, including its schedule', () => {
    expect(file.cards[0]).toEqual(card)
  })

  it('keeps the review log, which is what makes the history restorable', () => {
    expect(file.reviewLogs[0]).toEqual(data.reviewLogs[0])
  })

  it('keeps settings and records when it was taken', () => {
    expect(file.settings).toEqual(DEFAULT_SETTINGS)
    expect(file.exportedAt).toEqual(NOW)
    expect(file.version).toBe(BACKUP_VERSION)
  })

  it('writes dates as ISO strings, so the file stays readable', () => {
    expect(serializeBackup(data, NOW)).toContain('"due": "2026-10-20T09:00:00.000Z"')
  })
})

describe('refusing what it does not understand', () => {
  it('rejects text that is not JSON', () => {
    expect(parseBackup('không phải json')).toMatchObject({ ok: false })
  })

  it('rejects JSON from somewhere else', () => {
    const result = parseBackup('{"hello":"world"}')
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.error).toMatch(/không phải file sao lưu/i)
  })

  it('rejects a newer format rather than guessing at it', () => {
    // Restoring half-understood data over a working deck is worse than
    // refusing, so a future version number is a hard stop.
    const newer = serializeBackup(data, NOW).replace('"version": 1', '"version": 99')
    const result = parseBackup(newer)
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.error).toMatch(/99/)
  })

  it('rejects a file with no decks or cards array', () => {
    expect(
      parseBackup('{"format":"life-assistant-backup","version":1}'),
    ).toMatchObject({ ok: false })
  })

  it('survives a card with fields missing', () => {
    const result = parseBackup(
      JSON.stringify({
        format: 'life-assistant-backup',
        version: 1,
        decks: [],
        cards: [{ id: 'c', deckId: 'd', term: 'Alight', definition: 'đáp xuống' }],
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.file.cards[0]).toMatchObject({
        term: 'Alight',
        termLower: 'alight',
        synonyms: [],
        srs: null,
      })
    }
  })
})

describe('findOrphanCards', () => {
  it('names cards whose deck is missing', () => {
    const result = parseBackup(
      serializeBackup({ ...data, decks: [] }, NOW),
    )
    if (!result.ok) throw new Error(result.error)
    expect(findOrphanCards(result.file).map((c) => c.term)).toEqual(['accidental'])
  })

  it('finds none in a complete backup', () => {
    const result = parseBackup(serializeBackup(data, NOW))
    if (!result.ok) throw new Error(result.error)
    expect(findOrphanCards(result.file)).toEqual([])
  })
})

describe('deckToTsv', () => {
  it('round-trips back through the import parser', () => {
    const { rows, stats } = parseCards(deckToTsv([card]))
    expect(stats).toMatchObject({ total: 1, ok: 1 })
    expect(rows[0].card).toMatchObject({
      term: 'accidental',
      definition: 'vô tình, do tai nạn',
      pronunciation: '/ˌæksɪˈdentl/',
      partOfSpeech: 'adj',
      synonyms: ['unintentional', 'chance'],
      antonyms: ['deliberate'],
      tags: ['can-on-ky'],
    })
  })

  it('flattens a tab inside a field, which would shift every later column', () => {
    const messy: Card = { ...card, definition: 'nghĩa\tcó tab\nvà xuống dòng' }
    expect(deckToTsv([messy]).split('\n')).toHaveLength(1)
    expect(parseCards(deckToTsv([messy])).stats).toMatchObject({ ok: 1, error: 0 })
  })
})
