import type { CardDraft } from '@/modules/flashcards/domain/card.types'

export const MAX_COLUMNS = 8

/**
 * Column order, matching what the vocab-coach skill exports. Columns 1-6 are
 * the OpenQuiz format; 7-8 are this project's additions and are usually absent.
 */
export const COLUMN_LABELS = [
  'Từ',
  'Định nghĩa',
  'Phát âm',
  'Loại từ',
  'Ví dụ',
  'Đồng nghĩa',
  'Trái nghĩa',
  'Tags',
] as const

export type RowStatus = 'ok' | 'error' | 'duplicate'

export interface ParsedRow {
  /** 1-based line number in the pasted text, for pointing at the offending row. */
  lineNo: number
  raw: string
  status: RowStatus
  card: CardDraft | null
  errors: string[]
  /** Line number of the earlier row this duplicates, when the clash is inside the paste. */
  duplicateOfLine?: number
  /** Id of the existing card this duplicates, when the clash is with the deck. */
  duplicateOfCardId?: string
}

export interface ParseOptions {
  /** Defaults to Tab. Anything else is unsafe on real exports — see spec §3.2. */
  columnDelimiter?: string
  /** Lowercased term -> existing card id, used to flag duplicates against a deck. */
  existingTerms?: ReadonlyMap<string, string>
  /** Drop the first non-empty line, for pastes that carry a header row. */
  hasHeader?: boolean
  /** Pull `(TN: ...)` out of the definition into antonyms. Defaults to true. */
  extractAntonyms?: boolean
}

export interface ParseResult {
  rows: ParsedRow[]
  stats: { total: number; ok: number; error: number; duplicate: number }
  /** Problems about the paste as a whole rather than one row. */
  warnings: string[]
}

/** Collapses whitespace and lowercases, so "Pose  A Threat" and "pose a threat" clash. */
export function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ').toLowerCase()
}

function splitList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Reads the antonyms out of a `(TN: ...)` note.
 *
 * Real exports write these several ways: `(TN: deliberate, intentional)`,
 * `(TN v: sow, plant)` (part-of-speech qualifier), and `(TN: prey = con mồi)`
 * (English word with a Vietnamese gloss — only the word is the antonym).
 */
export function extractAntonymsFrom(definition: string): string[] {
  const match = /\(TN[^:)]*:\s*([^)]*)\)/.exec(definition)
  if (!match) return []
  return splitList(match[1]).map((item) => item.split('=')[0].trim()).filter(Boolean)
}

export function parseCards(raw: string, options: ParseOptions = {}): ParseResult {
  const {
    columnDelimiter = '\t',
    existingTerms,
    hasHeader = false,
    extractAntonyms = true,
  } = options

  // Strip a BOM and accept CRLF: pasted text and uploaded files both arrive.
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n')

  const rows: ParsedRow[] = []
  const warnings: string[] = []
  const seenTerms = new Map<string, number>()
  let singleColumnRows = 0
  let headerDropped = false

  text.split('\n').forEach((line, index) => {
    const lineNo = index + 1
    if (!line.trim()) return

    if (hasHeader && !headerDropped) {
      headerDropped = true
      return
    }

    const cells = line.split(columnDelimiter).map((cell) => cell.trim())
    if (cells.length === 1) singleColumnRows += 1

    const errors: string[] = []
    const [
      term = '',
      definition = '',
      pronunciation = '',
      partOfSpeech = '',
      example = '',
      synonyms = '',
      antonyms = '',
      tags = '',
    ] = cells

    if (!term) errors.push('Thiếu từ (cột 1)')
    if (!definition) errors.push('Thiếu nghĩa (cột 2)')
    if (cells.length > MAX_COLUMNS) {
      errors.push(`Dòng có ${cells.length} cột, tối đa ${MAX_COLUMNS} — có thể thừa dấu Tab`)
    }

    if (errors.length) {
      rows.push({ lineNo, raw: line, status: 'error', card: null, errors })
      return
    }

    const termLower = normalizeTerm(term)
    const card: CardDraft = {
      term,
      termLower,
      definition,
      pronunciation,
      partOfSpeech,
      example,
      synonyms: splitList(synonyms),
      // An explicit column 7 always wins over whatever the definition says.
      antonyms: antonyms
        ? splitList(antonyms)
        : extractAntonyms
          ? extractAntonymsFrom(definition)
          : [],
      tags: splitList(tags),
    }

    const earlierLine = seenTerms.get(termLower)
    if (earlierLine !== undefined) {
      rows.push({
        lineNo,
        raw: line,
        status: 'duplicate',
        card,
        errors: [],
        duplicateOfLine: earlierLine,
      })
      return
    }
    seenTerms.set(termLower, lineNo)

    const existingId = existingTerms?.get(termLower)
    if (existingId) {
      rows.push({
        lineNo,
        raw: line,
        status: 'duplicate',
        card,
        errors: [],
        duplicateOfCardId: existingId,
      })
      return
    }

    rows.push({ lineNo, raw: line, status: 'ok', card, errors: [] })
  })

  /**
   * Ragged rows are normal — trailing optional columns are routinely left off —
   * so warning about them fires on almost every real file and teaches the user
   * to ignore warnings. What actually signals the wrong delimiter is rows that
   * did not split at all.
   */
  if (rows.length >= 2 && singleColumnRows >= rows.length / 2) {
    warnings.push(
      `${singleColumnRows}/${rows.length} dòng không tách được cột nào. ` +
        'Nhiều khả năng dấu phân cách đang chọn sai — dữ liệu từ Claude dùng Tab.',
    )
  }

  return {
    rows,
    stats: {
      total: rows.length,
      ok: rows.filter((r) => r.status === 'ok').length,
      error: rows.filter((r) => r.status === 'error').length,
      duplicate: rows.filter((r) => r.status === 'duplicate').length,
    },
    warnings,
  }
}
