import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseCollection } from '@/modules/flashcards/domain/collection-parser'
import { extractAntonymsFrom } from '@/modules/flashcards/domain/tsv-parser'
import { maskTerm } from '@/modules/flashcards/domain/cloze'

/**
 * The shipped catalogue is content, not code, and nothing else would catch a
 * stray tab or a word that gives away its own answer. It is seeded into every
 * account, so a mistake here reaches everyone.
 */
const parsed = parseCollection(readFileSync('public/catalog/toeic-600.tsv', 'utf8'))
const cards = parsed.decks.flatMap((deck) => deck.result.rows.map((row) => row.card!))

describe('the TOEIC catalogue file', () => {
  it('parses with no errors at all', () => {
    expect(parsed.errors).toEqual([])
    expect(parsed.stats.error).toBe(0)
    expect(parsed.stats.duplicate).toBe(0)
  })

  it('names itself and its topics', () => {
    expect(parsed.name).toBe('TOEIC 600')
    expect(parsed.decks.map((d) => d.name)).toEqual([
      '01 — Contracts',
      '02 — Marketing',
      '03 — Warranties',
    ])
  })

  it('fills every column a card is meant to have', () => {
    for (const card of cards) {
      expect(card.term, 'term').not.toBe('')
      expect(card.definition, `definition of ${card.term}`).not.toBe('')
      expect(card.pronunciation, `IPA of ${card.term}`).toMatch(/^\/.+\/$/)
      expect(card.partOfSpeech, `part of speech of ${card.term}`).not.toBe('')
      expect(card.example, `example of ${card.term}`).not.toBe('')
      expect(card.synonyms.length, `synonyms of ${card.term}`).toBeGreaterThan(0)
    }
  })

  it('uses the term in its own example, so cloze mode works', () => {
    const unusable = cards.filter((card) => !maskTerm(card.example, card.term).masked)
    expect(unusable.map((c) => c.term)).toEqual([])
  })

  it('writes antonyms where it claims to', () => {
    const claimed = cards.filter((card) => /\(TN[^)]*:/.test(card.definition))
    expect(claimed.length).toBeGreaterThan(0)
    for (const card of claimed) {
      expect(extractAntonymsFrom(card.definition), card.term).not.toEqual([])
    }
  })

  it('never shows the answer in the Việt → Anh prompt', () => {
    const leaks = cards.filter((card) => {
      const head = card.term.toLowerCase().split(/[\s/-]+/)[0]
      if (head.length < 5) return false
      return maskTerm(card.definition, card.term, { loose: true }).text.toLowerCase().includes(head)
    })
    expect(leaks.map((c) => c.term)).toEqual([])
  })
})
