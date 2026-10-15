import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseCards } from '@/modules/flashcards/domain/tsv-parser'
import { buildImportPlan } from '@/modules/flashcards/domain/import-plan'

const row = (...cells: string[]) => cells.join('\t')

const PASTE = [
  row('seize', 'chộp'),
  row('alight', 'đáp xuống'),
  row('SEIZE', 'tóm lấy'), // duplicates line 1, inside the paste
].join('\n')

const deckClash = parseCards(row('seize', 'nghĩa mới'), {
  existingTerms: new Map([['seize', 'card-123']]),
})

describe('duplicates inside the paste', () => {
  const parsed = parseCards(PASTE)

  it('skips the later row', () => {
    const plan = buildImportPlan(parsed, { strategy: 'skip' })
    expect(plan.create.map((c) => c.definition)).toEqual(['chộp', 'đáp xuống'])
    expect(plan.skipped).toBe(1)
  })

  it('lets the later row replace the earlier one when overwriting', () => {
    const plan = buildImportPlan(parsed, { strategy: 'overwrite' })
    // Still two cards, and "seize" keeps its original position.
    expect(plan.create.map((c) => c.definition)).toEqual(['tóm lấy', 'đáp xuống'])
    expect(plan.overwrite).toEqual([])
  })

  it('creates both when keeping both', () => {
    const plan = buildImportPlan(parsed, { strategy: 'keep-both' })
    expect(plan.create).toHaveLength(3)
  })
})

describe('duplicates against the deck', () => {
  it('skips', () => {
    const plan = buildImportPlan(deckClash, { strategy: 'skip' })
    expect(plan).toMatchObject({ create: [], overwrite: [], skipped: 1 })
  })

  it('overwrites the existing card by id', () => {
    const plan = buildImportPlan(deckClash, { strategy: 'overwrite' })
    expect(plan.create).toEqual([])
    expect(plan.overwrite).toHaveLength(1)
    expect(plan.overwrite[0].id).toBe('card-123')
    expect(plan.overwrite[0].draft.definition).toBe('nghĩa mới')
  })

  it('adds a second card when keeping both', () => {
    const plan = buildImportPlan(deckClash, { strategy: 'keep-both' })
    expect(plan.create).toHaveLength(1)
    expect(plan.overwrite).toEqual([])
  })
})

describe('user choices', () => {
  it('counts unparseable rows separately from skipped ones', () => {
    const parsed = parseCards(`${row('a', 'nghĩa a')}\n${row('', 'thiếu từ')}`)
    const plan = buildImportPlan(parsed, { strategy: 'skip' })
    expect(plan).toMatchObject({ invalid: 1, skipped: 0 })
    expect(plan.create).toHaveLength(1)
  })

  it('leaves out rows the user unticked', () => {
    const parsed = parseCards(`${row('a', 'nghĩa a')}\n${row('b', 'nghĩa b')}`)
    const plan = buildImportPlan(parsed, {
      strategy: 'skip',
      excludedLines: new Set([2]),
    })
    expect(plan.create.map((c) => c.term)).toEqual(['a'])
    expect(plan.skipped).toBe(1)
  })

  it('lets one row override the blanket strategy', () => {
    const plan = buildImportPlan(deckClash, {
      strategy: 'skip',
      overrides: new Map([[1, 'overwrite']]),
    })
    expect(plan.overwrite).toHaveLength(1)
  })

  it('creates the duplicate when the row it clashed with was unticked', () => {
    const parsed = parseCards(PASTE)
    const plan = buildImportPlan(parsed, {
      strategy: 'overwrite',
      excludedLines: new Set([1]),
    })
    // Line 1 is gone, so line 3 has nothing to replace and must be created.
    expect(plan.create.map((c) => c.definition)).toEqual(['đáp xuống', 'tóm lấy'])
  })
})

describe('the real export', () => {
  const eagles = readFileSync(
    fileURLToPath(new URL('./__fixtures__/eagles.tsv', import.meta.url)),
    'utf8',
  )

  it('plans 59 creations into an empty deck', () => {
    const plan = buildImportPlan(parseCards(eagles), { strategy: 'skip' })
    expect(plan).toMatchObject({ skipped: 0, invalid: 0, overwrite: [] })
    expect(plan.create).toHaveLength(59)
  })

  it('overwrites every card when the same file is imported twice', () => {
    const existing = new Map(
      parseCards(eagles).rows.map((r, i) => [r.card!.termLower, `card-${i}`]),
    )
    const plan = buildImportPlan(parseCards(eagles, { existingTerms: existing }), {
      strategy: 'overwrite',
    })
    expect(plan.create).toEqual([])
    expect(plan.overwrite).toHaveLength(59)
  })
})
