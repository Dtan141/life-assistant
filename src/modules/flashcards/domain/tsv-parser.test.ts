import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  extractAntonymsFrom,
  normalizeTerm,
  parseCards,
} from '@/modules/flashcards/domain/tsv-parser'

const eagles = readFileSync(
  fileURLToPath(new URL('./__fixtures__/eagles.tsv', import.meta.url)),
  'utf8',
)

const row = (...cells: string[]) => cells.join('\t')

describe('the real vocab-coach export', () => {
  const result = parseCards(eagles)

  it('reads every line with no errors', () => {
    expect(result.stats).toEqual({ total: 59, ok: 59, error: 0, duplicate: 0 })
    expect(result.warnings).toEqual([])
  })

  it('keeps a definition containing a semicolon intact', () => {
    // Four rows carry ';' inside the definition, which is why ';' cannot
    // separate rows. See spec §3.2.
    const settle = result.rows.find((r) => r.card?.term === 'settle')
    expect(settle?.card?.definition).toBe(
      '(1) định cư, ở lại; (2) (chim) đậu xuống · settlement (n)',
    )
  })

  it('keeps commas inside pronunciation and part of speech', () => {
    const conflict = result.rows.find((r) => r.card?.term === 'conflict')
    expect(conflict?.card?.pronunciation).toBe('/ˈkɑːnflɪkt/ (n), /kənˈflɪkt/ (v)')
    expect(conflict?.card?.partOfSpeech).toBe('n, v')
  })

  it('does not split a term on its slash', () => {
    const terms = result.rows.map((r) => r.card?.term)
    expect(terms).toContain('protected area / sanctuary')
    expect(terms).toContain('prevent sb/sth from V-ing')
  })

  it('splits synonyms on semicolons', () => {
    const accidental = result.rows.find((r) => r.card?.term === 'accidental')
    expect(accidental?.card?.synonyms).toEqual(['unintentional', 'chance'])
  })

  it('leaves tags empty, since the export has only six columns', () => {
    expect(result.rows.every((r) => r.card?.tags.length === 0)).toBe(true)
  })
})

describe('antonym extraction', () => {
  it('reads a plain comma-separated list', () => {
    expect(extractAntonymsFrom('vô tình (TN: deliberate, intentional)')).toEqual([
      'deliberate',
      'intentional',
    ])
  })

  it('ignores a part-of-speech qualifier after TN', () => {
    expect(extractAntonymsFrom('(n) vụ mùa (TN v: sow, plant)')).toEqual([
      'sow',
      'plant',
    ])
  })

  it('drops a Vietnamese gloss after the equals sign', () => {
    expect(extractAntonymsFrom('chim săn mồi (TN: prey = con mồi)')).toEqual(['prey'])
  })

  it('is not confused by an earlier parenthesis', () => {
    expect(extractAntonymsFrom('đáp xuống (chim, côn trùng) (TN: take off)')).toEqual([
      'take off',
    ])
  })

  it('returns nothing when there is no TN note', () => {
    expect(extractAntonymsFrom('khu bảo tồn chim')).toEqual([])
  })

  it('fills the antonyms field during a parse', () => {
    const { rows } = parseCards(row('accidental', 'vô tình (TN: deliberate, intentional)'))
    expect(rows[0].card?.antonyms).toEqual(['deliberate', 'intentional'])
    // The definition is left exactly as written.
    expect(rows[0].card?.definition).toBe('vô tình (TN: deliberate, intentional)')
  })

  it('prefers an explicit column 7 over the definition', () => {
    const { rows } = parseCards(
      row('x', 'nghĩa (TN: from-definition)', '', '', '', '', 'from-column'),
    )
    expect(rows[0].card?.antonyms).toEqual(['from-column'])
  })

  it('can be turned off', () => {
    const { rows } = parseCards(row('x', 'nghĩa (TN: deliberate)'), {
      extractAntonyms: false,
    })
    expect(rows[0].card?.antonyms).toEqual([])
  })
})

describe('validation', () => {
  it('skips blank and whitespace-only lines', () => {
    const { stats } = parseCards(`\n${row('a', 'nghĩa a')}\n   \n\n${row('b', 'nghĩa b')}\n`)
    expect(stats).toMatchObject({ total: 2, ok: 2 })
  })

  it('reports a missing term and a missing definition separately', () => {
    const { rows } = parseCards(`${row('', 'chỉ có nghĩa')}\n${row('chỉ có từ', '')}`)
    expect(rows[0].errors).toEqual(['Thiếu từ (cột 1)'])
    expect(rows[1].errors).toEqual(['Thiếu nghĩa (cột 2)'])
    expect(rows.every((r) => r.card === null)).toBe(true)
  })

  it('points at the offending line by its number in the paste', () => {
    const { rows } = parseCards(`${row('a', 'nghĩa a')}\n\n${row('', 'hỏng')}`)
    expect(rows[1]).toMatchObject({ lineNo: 3, status: 'error' })
  })

  it('flags a row with a stray extra tab', () => {
    const { rows } = parseCards(row('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'))
    expect(rows[0].status).toBe('error')
    expect(rows[0].errors[0]).toMatch(/9 cột/)
  })

  it('warns when rows disagree about how many columns they have', () => {
    const { warnings } = parseCards(`${row('a', 'nghĩa a')}\n${row('b', 'nghĩa b', 'ipa')}`)
    expect(warnings[0]).toMatch(/Số cột không đều/)
  })

  it('drops the header row when asked', () => {
    const { stats, rows } = parseCards(`${row('Từ', 'Định nghĩa')}\n${row('a', 'nghĩa a')}`, {
      hasHeader: true,
    })
    expect(stats.total).toBe(1)
    expect(rows[0].card?.term).toBe('a')
  })
})

describe('duplicates', () => {
  it('flags a repeat inside the paste and names the earlier line', () => {
    const { rows, stats } = parseCards(
      `${row('seize', 'chộp')}\n${row('alight', 'đáp xuống')}\n${row('SEIZE', 'tóm lấy')}`,
    )
    expect(stats).toMatchObject({ ok: 2, duplicate: 1 })
    expect(rows[2]).toMatchObject({ status: 'duplicate', duplicateOfLine: 1 })
    // The card is still parsed, so the UI can offer "overwrite" or "keep both".
    expect(rows[2].card?.definition).toBe('tóm lấy')
  })

  it('ignores case and extra whitespace when comparing terms', () => {
    expect(normalizeTerm('  Pose   A Threat ')).toBe('pose a threat')
    const { stats } = parseCards(`${row('pose a threat', 'x')}\n${row('Pose  A  Threat', 'y')}`)
    expect(stats.duplicate).toBe(1)
  })

  it('flags a clash with a card already in the deck', () => {
    const { rows } = parseCards(row('seize', 'chộp'), {
      existingTerms: new Map([['seize', 'card-123']]),
    })
    expect(rows[0]).toMatchObject({ status: 'duplicate', duplicateOfCardId: 'card-123' })
  })
})

describe('input shapes', () => {
  it('accepts CRLF line endings', () => {
    const { stats } = parseCards(`${row('a', 'nghĩa a')}\r\n${row('b', 'nghĩa b')}`)
    expect(stats).toMatchObject({ total: 2, ok: 2 })
  })

  it('strips a byte order mark', () => {
    const { rows } = parseCards(`﻿${row('accidental', 'vô tình')}`)
    expect(rows[0].card?.term).toBe('accidental')
  })

  it('accepts a different column delimiter', () => {
    const { rows } = parseCards('a|nghĩa a', { columnDelimiter: '|' })
    expect(rows[0].card).toMatchObject({ term: 'a', definition: 'nghĩa a' })
  })

  it('leaves optional columns empty rather than undefined', () => {
    const { rows } = parseCards(row('a', 'nghĩa a'))
    expect(rows[0].card).toMatchObject({
      pronunciation: '',
      partOfSpeech: '',
      example: '',
      synonyms: [],
      tags: [],
    })
  })
})
