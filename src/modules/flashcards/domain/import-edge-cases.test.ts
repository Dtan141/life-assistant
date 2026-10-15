import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseCards } from '@/modules/flashcards/domain/tsv-parser'

/**
 * A hand-built file for exercising the import by hand, pinned here so the
 * behaviour it demonstrates cannot drift away from what it claims to show.
 */
const raw = readFileSync(
  fileURLToPath(new URL('./__fixtures__/import-edge-cases.tsv', import.meta.url)),
  'utf8',
)

const result = parseCards(raw, {
  existingTerms: new Map([['seize', 'existing-card-id']]),
})

const byTerm = (term: string) =>
  result.rows.find((row) => row.card?.term.toLowerCase() === term.toLowerCase())

describe('the hand-test file', () => {
  it('splits into valid, duplicate and broken rows', () => {
    expect(result.stats).toEqual({ total: 13, ok: 8, duplicate: 2, error: 3 })
  })

  it('warns that the rows disagree about column count', () => {
    expect(result.warnings[0]).toMatch(/Số cột không đều/)
  })
})

describe('rows with everything filled in', () => {
  it('reads all eight columns', () => {
    expect(byTerm('habitat')?.card).toMatchObject({
      term: 'habitat',
      pronunciation: '/ˈhæbɪtæt/',
      partOfSpeech: 'n',
      synonyms: ['environment', 'home', 'territory'],
      antonyms: ['wasteland'],
      tags: ['can-on-ky'],
    })
  })
})

describe('rows missing optional columns', () => {
  it('accepts a term and definition alone', () => {
    expect(byTerm('canopy')?.card).toMatchObject({
      definition: 'tán rừng',
      pronunciation: '',
      example: '',
      synonyms: [],
      tags: [],
    })
  })

  it('accepts a gap in the middle', () => {
    // "feather" leaves pronunciation empty but fills the columns after it.
    expect(byTerm('feather')?.card).toMatchObject({
      pronunciation: '',
      partOfSpeech: 'n',
      example: 'Its feathers were damaged by the storm.',
    })
  })

  it('accepts trailing empty columns', () => {
    expect(byTerm('wingspan')?.card).toMatchObject({ synonyms: [], antonyms: [] })
  })

  it('still extracts antonyms from the definition when column 7 is absent', () => {
    expect(byTerm('poach')?.card?.antonyms).toEqual(['protect'])
  })

  it('keeps a slash inside the term', () => {
    expect(byTerm('talon / claw')?.card?.term).toBe('talon / claw')
  })

  it('keeps a multi-value part of speech', () => {
    expect(byTerm('nest')?.card?.partOfSpeech).toBe('n, v')
  })
})

describe('rows that should be flagged', () => {
  it('spots the repeat inside the paste, ignoring case', () => {
    const repeat = result.rows.find((row) => row.duplicateOfLine !== undefined)
    expect(repeat).toMatchObject({ status: 'duplicate', duplicateOfLine: 1 })
  })

  it('spots the clash with a card already in the deck', () => {
    expect(byTerm('seize')).toMatchObject({
      status: 'duplicate',
      duplicateOfCardId: 'existing-card-id',
    })
  })

  it('rejects the row with no term', () => {
    const errors = result.rows.filter((row) => row.status === 'error')
    expect(errors[0].errors).toEqual(['Thiếu từ (cột 1)'])
  })

  it('rejects the row with no definition', () => {
    const errors = result.rows.filter((row) => row.status === 'error')
    expect(errors[1].errors).toEqual(['Thiếu nghĩa (cột 2)'])
  })

  it('rejects the row carrying a ninth column', () => {
    // A column past the eighth means a stray Tab, which would have shifted
    // every field after it. Better to stop than to import silently wrong data.
    const errors = result.rows.filter((row) => row.status === 'error')
    expect(errors[2].errors[0]).toMatch(/9 cột/)
  })
})
