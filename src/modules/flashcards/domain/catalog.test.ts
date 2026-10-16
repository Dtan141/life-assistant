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

  it('names itself, and numbers its topics in order', () => {
    expect(parsed.name).toBe('TOEIC 600')
    // Asserting the shape rather than the list, so adding topics does not mean
    // editing this test every time.
    const numbers = parsed.decks.map((deck) => {
      expect(deck.name, deck.name).toMatch(/^\d{2} — .+/)
      return Number(deck.name.slice(0, 2))
    })
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
    expect(new Set(numbers).size, 'trùng số thứ tự chủ đề').toBe(numbers.length)
  })

  it('fills every column a card is meant to have', () => {
    for (const card of cards) {
      expect(card.term, 'term').not.toBe('')
      expect(card.definition, `definition of ${card.term}`).not.toBe('')
      expect(card.pronunciation, `IPA of ${card.term}`).toMatch(/^\/.+\/$/)
      expect(card.partOfSpeech, `part of speech of ${card.term}`).not.toBe('')
      expect(card.example, `example of ${card.term}`).not.toBe('')
    }
  })

  it('teaches something beyond a bare gloss', () => {
    // Not "every card has synonyms": a printer has none, and inventing one
    // would be worse than leaving it out. What every card must carry is some
    // extra handle — synonyms, a word family, a collocation or a warning.
    const bare = cards.filter(
      (card) => card.synonyms.length === 0 && !/[·—]/.test(card.definition),
    )
    expect(bare.map((c) => c.term)).toEqual([])
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
